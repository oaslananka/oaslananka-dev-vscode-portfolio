'use server';

import { revalidatePath } from 'next/cache';

import type { ActionState } from '@/lib/admin/action-state';
import { requireAuth } from '@/lib/auth';
import { siteSettings as settingsTable } from '@/lib/db/schema';
import { parseSettingsForm } from '@/lib/admin/validation';
import {
  SETTINGS_INDEX_PATHS,
  actionFailure,
  requireDb,
  revalidateDiscoveryPaths,
  scheduleIndexNow,
} from '@/lib/admin/actions/shared';

export async function updateSettings(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAuth();
  const database = requireDb();

  try {
    const values = { ...parseSettingsForm(formData), updatedAt: new Date() };

    await database
      .insert(settingsTable)
      .values({ id: 1, ...values })
      .onConflictDoUpdate({ target: settingsTable.id, set: values });

    revalidatePath('/', 'layout');
    revalidatePath('/opengraph-image');
    revalidateDiscoveryPaths();
    scheduleIndexNow(SETTINGS_INDEX_PATHS);
    return { ok: true, message: 'Settings saved.' };
  } catch (error) {
    return actionFailure(error, 'Unable to save the site settings.');
  }
}
