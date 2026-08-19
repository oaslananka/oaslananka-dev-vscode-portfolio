'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';

import type { ActionState } from '@/lib/admin/action-state';
import { requireAuth } from '@/lib/auth';
import { projects as projectsTable } from '@/lib/db/schema';
import { parseProjectForm, parseSafeId } from '@/lib/admin/validation';
import {
  actionFailure,
  isUniqueViolation,
  requireDb,
  revalidateDiscoveryPaths,
  scheduleIndexNow,
} from '@/lib/admin/actions/shared';

export async function saveProject(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAuth();
  const database = requireDb();

  try {
    const idRaw = formData.get('id');
    const values = { ...parseProjectForm(formData), updatedAt: new Date() };
    let previousSlug: string | undefined;

    if (idRaw) {
      const id = parseSafeId(idRaw, 'Project ID');
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

    const changedPaths = new Set([
      '/',
      '/projects',
      `/projects/${values.slug}`,
    ]);
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
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { ok: false, message: 'A project with that slug already exists.' };
    }
    return actionFailure(error, 'Unable to save the project.');
  }

  redirect('/admin/projects');
}

export async function deleteProject(formData: FormData): Promise<void> {
  await requireAuth();
  const database = requireDb();
  const id = parseSafeId(formData.get('id'), 'Project ID');
  const [project] = await database
    .select({ slug: projectsTable.slug })
    .from(projectsTable)
    .where(eq(projectsTable.id, id))
    .limit(1);

  await database.delete(projectsTable).where(eq(projectsTable.id, id));

  const changedPaths = new Set(['/', '/projects']);
  if (project?.slug) changedPaths.add(`/projects/${project.slug}`);

  for (const path of changedPaths) revalidatePath(path);
  if (project?.slug) {
    revalidatePath(`/projects/${project.slug}/opengraph-image`);
  }
  revalidateDiscoveryPaths();
  scheduleIndexNow(changedPaths);
  redirect('/admin/projects');
}
