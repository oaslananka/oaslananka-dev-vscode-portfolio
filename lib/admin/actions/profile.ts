'use server';

import type { ActionState } from '@/lib/admin/action-state';
import { parseProfileForm } from '@/lib/admin/validation';
import { actionFailure, requireDb } from '@/lib/admin/actions/shared';
import { requireAuth } from '@/lib/auth';
import { saveProfileContent } from '@/lib/content-management/mutations';

export async function updateProfile(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAuth();
  requireDb();

  try {
    await saveProfileContent(parseProfileForm(formData));
    return { ok: true, message: 'Profile saved.' };
  } catch (error) {
    return actionFailure(error, 'Unable to save the profile.');
  }
}
