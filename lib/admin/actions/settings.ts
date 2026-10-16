'use server';

import type { ActionState } from '@/lib/admin/action-state';
import { parseSettingsForm } from '@/lib/admin/validation';
import { actionFailure, requireDb } from '@/lib/admin/actions/shared';
import { requireAuth } from '@/lib/auth';
import { saveSettingsContent } from '@/lib/content-management/mutations';

export async function updateSettings(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAuth();
  requireDb();

  try {
    await saveSettingsContent(parseSettingsForm(formData));
    return { ok: true, message: 'Settings saved.' };
  } catch (error) {
    return actionFailure(error, 'Unable to save the site settings.');
  }
}
