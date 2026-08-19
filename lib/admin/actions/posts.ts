'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';

import type { ActionState } from '@/lib/admin/action-state';
import { requireAuth } from '@/lib/auth';
import { posts as postsTable } from '@/lib/db/schema';
import { parsePostForm, parseSafeId } from '@/lib/admin/validation';
import {
  actionFailure,
  isUniqueViolation,
  requireDb,
  revalidateDiscoveryPaths,
  scheduleIndexNow,
} from '@/lib/admin/actions/shared';

export async function savePost(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAuth();
  const database = requireDb();

  try {
    const idRaw = formData.get('id');
    const values = { ...parsePostForm(formData), updatedAt: new Date() };
    let previousPost: { slug: string; published: boolean } | undefined;

    if (idRaw) {
      const id = parseSafeId(idRaw, 'Post ID');
      const [existingPost] = await database
        .select({ slug: postsTable.slug, published: postsTable.published })
        .from(postsTable)
        .where(eq(postsTable.id, id))
        .limit(1);
      previousPost = existingPost;

      await database
        .update(postsTable)
        .set(values)
        .where(eq(postsTable.id, id));
    } else {
      await database.insert(postsTable).values(values);
    }

    revalidatePath('/articles');
    revalidatePath(`/articles/${values.slug}`);
    revalidatePath(`/articles/${values.slug}/opengraph-image`);
    if (previousPost && previousPost.slug !== values.slug) {
      revalidatePath(`/articles/${previousPost.slug}`);
      revalidatePath(`/articles/${previousPost.slug}/opengraph-image`);
    }
    revalidateDiscoveryPaths();

    const changedPaths = new Set<string>();
    if (values.published || previousPost?.published) changedPaths.add('/articles');
    if (values.published) changedPaths.add(`/articles/${values.slug}`);
    if (
      previousPost?.published &&
      (!values.published || previousPost.slug !== values.slug)
    ) {
      changedPaths.add(`/articles/${previousPost.slug}`);
    }
    scheduleIndexNow(changedPaths);
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { ok: false, message: 'A post with that slug already exists.' };
    }
    return actionFailure(error, 'Unable to save the post.');
  }

  redirect('/admin/posts');
}

export async function deletePost(formData: FormData): Promise<void> {
  await requireAuth();
  const database = requireDb();
  const id = parseSafeId(formData.get('id'), 'Post ID');
  const [post] = await database
    .select({ slug: postsTable.slug, published: postsTable.published })
    .from(postsTable)
    .where(eq(postsTable.id, id))
    .limit(1);

  await database.delete(postsTable).where(eq(postsTable.id, id));

  revalidatePath('/articles');
  if (post?.slug) {
    revalidatePath(`/articles/${post.slug}`);
    revalidatePath(`/articles/${post.slug}/opengraph-image`);
  }
  revalidateDiscoveryPaths();

  if (post?.published) {
    scheduleIndexNow(['/articles', `/articles/${post.slug}`]);
  }
  redirect('/admin/posts');
}
