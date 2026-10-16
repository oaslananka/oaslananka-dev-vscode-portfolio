import 'server-only';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';

import type {
  PostInput,
  ProfileInput,
  ProjectInput,
  SettingsInput,
} from '@/lib/admin/validation';
import {
  PROFILE_INDEX_PATHS,
  SETTINGS_INDEX_PATHS,
  requireDb,
  revalidateDiscoveryPaths,
  scheduleIndexNow,
} from '@/lib/admin/actions/shared';
import {
  posts as postsTable,
  profile as profileTable,
  projects as projectsTable,
  siteSettings as settingsTable,
} from '@/lib/db/schema';

/** This is the sole content mutation path for both admin UI and future API adapters.
 * Callers MUST authenticate and validate input before calling these functions.
 * No HTTP routes or extra credentials are introduced by this module.
 */
export async function saveProfileContent(input: ProfileInput): Promise<void> {
  const database = requireDb();
  const values = { ...input, updatedAt: new Date() };
  await database
    .insert(profileTable)
    .values({ id: 1, ...values })
    .onConflictDoUpdate({ target: profileTable.id, set: values });

  revalidatePath('/', 'layout');
  revalidatePath('/opengraph-image');
  revalidateDiscoveryPaths();
  scheduleIndexNow(PROFILE_INDEX_PATHS);
}

export async function saveSettingsContent(input: SettingsInput): Promise<void> {
  const database = requireDb();
  const values = { ...input, updatedAt: new Date() };
  await database
    .insert(settingsTable)
    .values({ id: 1, ...values })
    .onConflictDoUpdate({ target: settingsTable.id, set: values });

  revalidatePath('/', 'layout');
  revalidatePath('/opengraph-image');
  revalidateDiscoveryPaths();
  scheduleIndexNow(SETTINGS_INDEX_PATHS);
}

export async function saveProjectContent(input: ProjectInput, id?: number): Promise<void> {
  const database = requireDb();
  const values = { ...input, updatedAt: new Date() };
  let previousSlug: string | undefined;

  if (id !== undefined) {
    const [existingProject] = await database
      .select({ slug: projectsTable.slug })
      .from(projectsTable)
      .where(eq(projectsTable.id, id))
      .limit(1);
    previousSlug = existingProject?.slug;
    await database
      .update(projectsTable)
      .set(values)
      .where(eq(projectsTable.id, id));
  } else {
    await database.insert(projectsTable).values(values);
  }

  const changedPaths = new Set(['/', '/projects', `/projects/${values.slug}`]);
  if (previousSlug && previousSlug !== values.slug) {
    changedPaths.add(`/projects/${previousSlug}`);
  }
  for (const path of changedPaths) revalidatePath(path);
  revalidatePath(`/projects/${values.slug}/opengraph-image`);
  if (previousSlug && previousSlug !== values.slug) {
    revalidatePath(`/projects/${previousSlug}/opengraph-image`);
  }
  revalidateDiscoveryPaths();
  scheduleIndexNow(changedPaths);
}

export async function deleteProjectContent(id: number): Promise<void> {
  const database = requireDb();
  const [project] = await database
    .select({ slug: projectsTable.slug })
    .from(projectsTable)
    .where(eq(projectsTable.id, id))
    .limit(1);
  await database.delete(projectsTable).where(eq(projectsTable.id, id));

  const changedPaths = new Set(['/', '/projects']);
  if (project?.slug) changedPaths.add(`/projects/${project.slug}`);
  for (const path of changedPaths) revalidatePath(path);
  if (project?.slug) revalidatePath(`/projects/${project.slug}/opengraph-image`);
  revalidateDiscoveryPaths();
  scheduleIndexNow(changedPaths);
}

export async function savePostContent(input: PostInput, id?: number): Promise<void> {
  const database = requireDb();
  const values = { ...input, updatedAt: new Date() };
  let previousPost: { slug: string; published: boolean } | undefined;

  if (id !== undefined) {
    const [existingPost] = await database
      .select({ slug: postsTable.slug, published: postsTable.published })
      .from(postsTable)
      .where(eq(postsTable.id, id))
      .limit(1);
    previousPost = existingPost;
    await database.update(postsTable).set(values).where(eq(postsTable.id, id));
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
}

export async function deletePostContent(id: number): Promise<void> {
  const database = requireDb();
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
}
