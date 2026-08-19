'use server';

import { revalidatePath } from 'next/cache';

import type { ActionState } from '@/lib/admin/action-state';
import { requireAuth } from '@/lib/auth';
import { profile as profileTable } from '@/lib/db/schema';
import { parseProfileForm } from '@/lib/admin/validation';
import {
  PROFILE_INDEX_PATHS,
  actionFailure,
  requireDb,
  revalidateDiscoveryPaths,
  scheduleIndexNow,
} from '@/lib/admin/actions/shared';

export async function updateProfile(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAuth();
  const database = requireDb();

  try {
    const values = { ...parseProfileForm(formData), updatedAt: new Date() };

    await database
      .insert(profileTable)
      .values({ id: 1, ...values })
      .onConflictDoUpdate({ target: profileTable.id, set: values });

    revalidatePath('/', 'layout');
    revalidatePath('/opengraph-image');
    revalidateDiscoveryPaths();
    scheduleIndexNow(PROFILE_INDEX_PATHS);
    return { ok: true, message: 'Profile saved.' };
  } catch (error) {
    return actionFailure(error, 'Unable to save the profile.');
  }
}
