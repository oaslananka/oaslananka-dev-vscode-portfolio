'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';

import { requireAuth } from '@/lib/auth';
import { contactMessages as contactMessagesTable } from '@/lib/db/schema';
import { AdminValidationError, parseSafeId } from '@/lib/admin/validation';
import { requireDb } from '@/lib/admin/actions/shared';

function parseRead(value: FormDataEntryValue | null): boolean {
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new AdminValidationError('Read status must be true or false.');
}

export async function markMessageRead(formData: FormData): Promise<void> {
  await requireAuth();
  const database = requireDb();
  const id = parseSafeId(formData.get('id'), 'Message ID');
  const read = parseRead(formData.get('read'));

  await database
    .update(contactMessagesTable)
    .set({ read })
    .where(eq(contactMessagesTable.id, id));
  revalidatePath('/admin/messages');
  revalidatePath('/admin', 'layout');
  redirect('/admin/messages');
}

export async function deleteMessage(formData: FormData): Promise<void> {
  await requireAuth();
  const database = requireDb();
  const id = parseSafeId(formData.get('id'), 'Message ID');

  await database
    .delete(contactMessagesTable)
    .where(eq(contactMessagesTable.id, id));
  revalidatePath('/admin/messages');
  revalidatePath('/admin', 'layout');
  redirect('/admin/messages');
}
