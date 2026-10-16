import 'server-only';

import { revalidatePath } from 'next/cache';
import type { db } from '@/lib/db';
import { and, eq } from 'drizzle-orm';

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

import { assertExpectedRevision, ContentRevisionConflictError } from './revision';

type ContentDatabase = NonNullable<typeof db>;

export interface ContentMutationOptions {
  database?: ContentDatabase;
  onCommit?: (effect: () => void) => void;
  /** Only the agent's independently approved new-project creation path. */
  createProjectDraft?: boolean;
}

function signalChange(effect: () => void, options?: ContentMutationOptions): void {
  if (options?.onCommit) options.onCommit(effect);
  else effect();
}

/** This is the sole content mutation path for both admin UI and future API adapters.
 * Callers MUST authenticate and validate input before calling these functions.
 * No HTTP routes or extra credentials are introduced by this module.
 */
export async function saveProfileContent(input: ProfileInput, expectedRevision?: number, options?: ContentMutationOptions): Promise<void> {
  const database = options?.database ?? requireDb();
  const values = { ...input, updatedAt: new Date() };
  if (expectedRevision !== undefined) {
    assertExpectedRevision(expectedRevision);
    const rows = await database.update(profileTable).set(values)
      .where(and(eq(profileTable.id, 1), eq(profileTable.revision, expectedRevision)))
      .returning({ id: profileTable.id });
    if (rows.length === 0) throw new ContentRevisionConflictError();
  } else {
    await database.insert(profileTable).values({ id: 1, ...values })
      .onConflictDoUpdate({ target: profileTable.id, set: values });
  }

  signalChange(() => {
  revalidatePath('/', 'layout');
  revalidatePath('/opengraph-image');
  revalidateDiscoveryPaths();
  scheduleIndexNow(PROFILE_INDEX_PATHS);
  }, options);
}

export async function saveSettingsContent(input: SettingsInput, expectedRevision?: number, options?: ContentMutationOptions): Promise<void> {
  const database = options?.database ?? requireDb();
  const values = { ...input, updatedAt: new Date() };
  if (expectedRevision !== undefined) {
    assertExpectedRevision(expectedRevision);
    const rows = await database.update(settingsTable).set(values)
      .where(and(eq(settingsTable.id, 1), eq(settingsTable.revision, expectedRevision)))
      .returning({ id: settingsTable.id });
    if (rows.length === 0) throw new ContentRevisionConflictError();
  } else {
    await database.insert(settingsTable).values({ id: 1, ...values })
      .onConflictDoUpdate({ target: settingsTable.id, set: values });
  }

  signalChange(() => {
  revalidatePath('/', 'layout');
  revalidatePath('/opengraph-image');
  revalidateDiscoveryPaths();
  scheduleIndexNow(SETTINGS_INDEX_PATHS);
  }, options);
}

export async function saveProjectContent(input: ProjectInput, id?: number, expectedRevision?: number, options?: ContentMutationOptions): Promise<void> {
  const database = options?.database ?? requireDb();
  if (options?.createProjectDraft && id !== undefined) {
    throw new Error('Draft creation may not update an existing project.');
  }
  const values = { ...input, ...(options?.createProjectDraft ? { published: false } : {}), updatedAt: new Date() };
  let previousSlug: string | undefined;

  if (id !== undefined) {
    const [existingProject] = await database
      .select({ slug: projectsTable.slug })
      .from(projectsTable)
      .where(eq(projectsTable.id, id))
      .limit(1);
    previousSlug = existingProject?.slug;
    if (expectedRevision !== undefined) assertExpectedRevision(expectedRevision);
    const predicate = expectedRevision === undefined
      ? eq(projectsTable.id, id)
      : and(eq(projectsTable.id, id), eq(projectsTable.revision, expectedRevision));
    const rows = await database.update(projectsTable).set(values)
      .where(predicate).returning({ id: projectsTable.id });
    if (expectedRevision !== undefined && rows.length === 0) {
      throw new ContentRevisionConflictError();
    }
  } else {
    if (expectedRevision !== undefined) throw new ContentRevisionConflictError();
    await database.insert(projectsTable).values(values);
  }

  signalChange(() => refreshProjectChanges(values.slug, previousSlug), options);
}


function refreshProjectChanges(slug: string, previousSlug?: string): void {
  const changedPaths = new Set(['/', '/projects', `/projects/${slug}`]);
  if (previousSlug && previousSlug !== slug) {
    changedPaths.add(`/projects/${previousSlug}`);
  }
  for (const path of changedPaths) revalidatePath(path);
  revalidatePath(`/projects/${slug}/opengraph-image`);
  if (previousSlug && previousSlug !== slug) {
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

export async function savePostContent(input: PostInput, id?: number, expectedRevision?: number, options?: ContentMutationOptions): Promise<void> {
  const database = options?.database ?? requireDb();
  const values = { ...input, updatedAt: new Date() };
  let previousPost: { slug: string; published: boolean } | undefined;

  if (id !== undefined) {
    const [existingPost] = await database
      .select({ slug: postsTable.slug, published: postsTable.published })
      .from(postsTable)
      .where(eq(postsTable.id, id))
      .limit(1);
    previousPost = existingPost;
    if (expectedRevision !== undefined) assertExpectedRevision(expectedRevision);
    const predicate = expectedRevision === undefined
      ? eq(postsTable.id, id)
      : and(eq(postsTable.id, id), eq(postsTable.revision, expectedRevision));
    const rows = await database.update(postsTable).set(values)
      .where(predicate).returning({ id: postsTable.id });
    if (expectedRevision !== undefined && rows.length === 0) {
      throw new ContentRevisionConflictError();
    }
  } else {
    if (expectedRevision !== undefined) throw new ContentRevisionConflictError();
    await database.insert(postsTable).values(values);
  }

  signalChange(() => refreshPostChanges(values, previousPost), options);
}


function refreshPostChanges(
  values: Pick<PostInput, 'slug' | 'published'>,
  previousPost?: { slug: string; published: boolean },
): void {
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
