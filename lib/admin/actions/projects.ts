'use server';

import { redirect } from 'next/navigation';

import type { ActionState } from '@/lib/admin/action-state';
import { parseProjectForm, parseSafeId } from '@/lib/admin/validation';
import {
  actionFailure,
  isUniqueViolation,
  requireDb,
} from '@/lib/admin/actions/shared';
import { requireAuth } from '@/lib/auth';
import {
  deleteProjectContent,
  saveProjectContent,
} from '@/lib/content-management/mutations';

export async function saveProject(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAuth();
  requireDb();

  try {
    const input = parseProjectForm(formData);
    const idRaw = formData.get('id');
    const id = idRaw ? parseSafeId(idRaw, 'Project ID') : undefined;
    await saveProjectContent(input, id);
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
  requireDb();
  await deleteProjectContent(parseSafeId(formData.get('id'), 'Project ID'));
  redirect('/admin/projects');
}
