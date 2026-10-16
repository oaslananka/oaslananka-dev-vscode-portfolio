'use server';

import { redirect } from 'next/navigation';

import type { ActionState } from '@/lib/admin/action-state';
import { parsePostForm, parseSafeId } from '@/lib/admin/validation';
import {
  actionFailure,
  isUniqueViolation,
  requireDb,
} from '@/lib/admin/actions/shared';
import { requireAuth } from '@/lib/auth';
import {
  deletePostContent,
  savePostContent,
} from '@/lib/content-management/mutations';

export async function savePost(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAuth();
  requireDb();

  try {
    const input = parsePostForm(formData);
    const idRaw = formData.get('id');
    const id = idRaw ? parseSafeId(idRaw, 'Post ID') : undefined;
    await savePostContent(input, id);
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
  requireDb();
  await deletePostContent(parseSafeId(formData.get('id'), 'Post ID'));
  redirect('/admin/posts');
}
