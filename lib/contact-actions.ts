'use server';

import * as Sentry from '@sentry/nextjs';
import { lt } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { after } from 'next/server';
import { z } from 'zod';

import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { CONTACT_INQUIRY_TYPES, contactMessages } from '@/lib/db/schema';
import {
  resetContactNotificationForManualRetry,
  runContactNotificationBatch,
} from '@/lib/contact-notifications';
import {
  CONTACT_RATE_LIMIT,
  consumeRateLimitAttempt,
  getClientIp,
} from '@/lib/rate-limit';

export interface ContactState {
  ok: boolean;
  message?: string;
  field?: ContactField;
  validationRevision?: string;
}

const CONTACT_FIELDS = [
  'name',
  'email',
  'inquiryType',
  'organization',
  'message',
] as const;

export type ContactField = (typeof CONTACT_FIELDS)[number];

function isContactField(value: unknown): value is ContactField {
  return CONTACT_FIELDS.some((field) => field === value);
}

const schema = z.object({
  name: z
    .string()
    .min(1, 'Please enter your name.')
    .max(120)
    .refine((value) => !/[\r\n]/.test(value), 'Please enter a valid name.'),
  email: z.string().email('Please enter a valid email.').max(254),
  inquiryType: z.enum(CONTACT_INQUIRY_TYPES),
  organization: z.string().max(160).optional().default(''),
  message: z.string().min(10, 'Please write a little more.').max(5000),
});

function retentionDate(): Date {
  const expiresAt = new Date();
  expiresAt.setUTCFullYear(expiresAt.getUTCFullYear() + 1);
  return expiresAt;
}

async function purgeExpiredMessages(): Promise<void> {
  if (!db) return;

  try {
    await db
      .delete(contactMessages)
      .where(lt(contactMessages.retentionExpiresAt, new Date()));
  } catch (error) {
    Sentry.captureException(error, {
      tags: { component: 'contact-retention' },
    });
  }
}

async function runContactNotificationSafely(messageId: number): Promise<void> {
  try {
    await runContactNotificationBatch({ messageId });
  } catch (error) {
    Sentry.captureException(error, {
      tags: { component: 'contact-notification-worker' },
      extra: { messageId },
    });
  }
}

export async function submitContact(
  _prev: ContactState,
  formData: FormData
): Promise<ContactState> {
  // Honeypot: real users never fill this hidden field.
  if (String(formData.get('website') ?? '').trim() !== '') {
    return { ok: true, message: 'Thanks — your message has been sent.' };
  }

  const parsed = schema.safeParse({
    name: String(formData.get('name') ?? '').trim(),
    email: String(formData.get('email') ?? '').trim(),
    inquiryType: String(formData.get('inquiryType') ?? 'project'),
    organization: String(formData.get('organization') ?? '').trim(),
    message: String(formData.get('message') ?? '').trim(),
  });

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue?.path[0];

    return {
      ok: false,
      message: issue?.message ?? 'Invalid input.',
      field: isContactField(field) ? field : undefined,
      validationRevision: globalThis.crypto.randomUUID(),
    };
  }

  const { name, email, inquiryType, organization, message } = parsed.data;

  if (!db) {
    return {
      ok: false,
      message: 'Messaging is not configured yet. Please email me directly.',
    };
  }

  const ip = await getClientIp();
  if (!(await consumeRateLimitAttempt(ip, CONTACT_RATE_LIMIT))) {
    return {
      ok: false,
      message: 'Too many messages. Please wait a few minutes and try again.',
    };
  }

  let messageId: number;
  try {
    const [stored] = await db
      .insert(contactMessages)
      .values({
        name,
        email,
        inquiryType,
        organization,
        message,
        notificationStatus: process.env.RESEND_API_KEY ? 'pending' : 'disabled',
        notificationNextAttemptAt: new Date(),
        retentionExpiresAt: retentionDate(),
      })
      .returning();
    if (!stored) throw new Error('The message was not persisted.');
    messageId = stored.id;
  } catch (error) {
    Sentry.captureException(error, { tags: { component: 'contact-storage' } });
    console.error('[contact] failed to store message:', error);
    return { ok: false, message: 'Something went wrong. Please try again.' };
  }

  after(async () => {
    await purgeExpiredMessages();
    if (process.env.RESEND_API_KEY) {
      await runContactNotificationSafely(messageId);
    }
  });

  return { ok: true, message: 'Thanks — your message has been sent.' };
}

export async function retryContactNotification(
  formData: FormData,
): Promise<void> {
  await requireAuth();
  if (!db) throw new Error('Database is not configured.');

  const messageId = Number(formData.get('id'));
  if (!Number.isSafeInteger(messageId) || messageId <= 0) return;

  if (!(await resetContactNotificationForManualRetry(messageId))) return;
  revalidatePath('/admin/messages');

  if (process.env.RESEND_API_KEY) {
    after(() => runContactNotificationSafely(messageId));
  }
}
