import 'server-only';

import { randomUUID } from 'node:crypto';

import * as Sentry from '@sentry/nextjs';
import { and, eq, gt, sql } from 'drizzle-orm';

import { getProfile } from './content';
import { db } from './db';
import {
  contactMessages,
  type ContactInquiryType,
} from './db/schema';
import { CONTACT_NOTIFICATION_MAX_ATTEMPTS } from './contact-notification-policy';
import {
  processContactNotificationBatch,
  type ClaimedContactNotification,
  type ContactNotificationBatchResult,
  type ContactNotificationSender,
  type ContactNotificationStore,
  type ProcessContactNotificationBatchOptions,
} from './contact-notification-worker';

interface ContactNotificationRunOptions {
  batchSize?: number;
  messageId?: number;
  now?: Date;
  sender?: ContactNotificationSender | null;
}

function inquiryLabel(inquiryType: ContactInquiryType): string {
  return {
    project: 'Project inquiry',
    role: 'Role opportunity',
    collaboration: 'Collaboration',
    other: 'Other',
  }[inquiryType];
}

function createDatabaseStore(): ContactNotificationStore | null {
  if (!db) return null;
  const database = db;

  return {
    async claimEligible(options) {
      const claimToken = randomUUID();
      const rows = await database
        .select({
          id: sql<number>`claimed."id"`,
          name: sql<string>`claimed."name"`,
          email: sql<string>`claimed."email"`,
          inquiryType: sql<ContactInquiryType>`claimed."inquiry_type"`,
          organization: sql<string>`claimed."organization"`,
          message: sql<string>`claimed."message"`,
        })
        .from(sql`public.claim_contact_notifications(
          ${claimToken},
          ${options.now},
          ${options.leaseExpiresAt},
          ${options.batchSize},
          ${CONTACT_NOTIFICATION_MAX_ATTEMPTS},
          ${options.messageId ?? null}
        ) AS claimed`);

      return rows.map((row) => ({ ...row, claimToken }));
    },

    async beginAttempt(notification, now) {
      const [updated] = await database
        .update(contactMessages)
        .set({
          notificationAttempts: sql`${contactMessages.notificationAttempts} + 1`,
          notificationLastAttemptAt: now,
          notificationStatus: 'pending',
        })
        .where(
          and(
            eq(contactMessages.id, notification.id),
            eq(contactMessages.notificationClaimToken, notification.claimToken),
            gt(contactMessages.notificationClaimExpiresAt, now),
          ),
        )
        .returning();
      return updated?.notificationAttempts ?? null;
    },

    async markSent(notification, providerId) {
      const rows = await database
        .update(contactMessages)
        .set({
          notificationStatus: 'sent',
          notificationProviderId: providerId,
          notificationLastError: '',
          notificationClaimToken: '',
          notificationClaimExpiresAt: null,
        })
        .where(
          and(
            eq(contactMessages.id, notification.id),
            eq(contactMessages.notificationClaimToken, notification.claimToken),
          ),
        )
        .returning();
      return rows.length === 1;
    },

    async scheduleRetry(notification, error, nextAttemptAt) {
      const rows = await database
        .update(contactMessages)
        .set({
          notificationStatus: 'pending',
          notificationLastError: error,
          notificationNextAttemptAt: nextAttemptAt,
          notificationClaimToken: '',
          notificationClaimExpiresAt: null,
        })
        .where(
          and(
            eq(contactMessages.id, notification.id),
            eq(contactMessages.notificationClaimToken, notification.claimToken),
          ),
        )
        .returning();
      return rows.length === 1;
    },

    async markTerminalFailure(notification, error) {
      const rows = await database
        .update(contactMessages)
        .set({
          notificationStatus: 'failed',
          notificationLastError: error,
          notificationClaimToken: '',
          notificationClaimExpiresAt: null,
        })
        .where(
          and(
            eq(contactMessages.id, notification.id),
            eq(contactMessages.notificationClaimToken, notification.claimToken),
          ),
        )
        .returning();
      return rows.length === 1;
    },
  };
}

async function createResendSender(): Promise<ContactNotificationSender | null> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;

  const [{ Resend }, profile] = await Promise.all([
    import('resend'),
    getProfile(),
  ]);
  const resend = new Resend(apiKey);
  const to = profile.email || 'info@oaslananka.dev';
  const from =
    process.env.CONTACT_FROM_EMAIL || 'Portfolio <contact@oaslananka.dev>';

  return {
    async send(notification, idempotencyKey) {
      const organizationLine = notification.organization
        ? `Organization: ${notification.organization}\n`
        : '';
      const result = await resend.emails.send(
        {
          from,
          to,
          replyTo: notification.email,
          subject: `[${inquiryLabel(notification.inquiryType)}] ${notification.name}`,
          text:
            `From: ${notification.name} <${notification.email}>\n` +
            `Inquiry: ${inquiryLabel(notification.inquiryType)}\n` +
            organizationLine +
            `\n${notification.message}`,
        },
        { idempotencyKey },
      );

      if (result.error) throw new Error(result.error.message);
      if (!result.data?.id) {
        throw new Error('Resend returned no provider message ID.');
      }
      return { providerId: result.data.id };
    },
  };
}

export async function runContactNotificationBatch(
  options: ContactNotificationRunOptions = {},
): Promise<ContactNotificationBatchResult | null> {
  const store = createDatabaseStore();
  if (!store) return null;

  const sender =
    options.sender === undefined ? await createResendSender() : options.sender;
  const workerOptions: ProcessContactNotificationBatchOptions = {
    batchSize: options.batchSize,
    messageId: options.messageId,
    now: options.now,
    onTerminalFailure: ({ attempts, error, messageId }) => {
      Sentry.captureException(error, {
        tags: { component: 'contact-notification-terminal' },
        extra: { attempts, messageId },
      });
    },
    sender,
    store,
  };
  return processContactNotificationBatch(workerOptions);
}

export async function resetContactNotificationForManualRetry(
  messageId: number,
): Promise<boolean> {
  if (!db) return false;

  const [updated] = await db
    .update(contactMessages)
    .set({
      notificationStatus: process.env.RESEND_API_KEY ? 'pending' : 'disabled',
      notificationProviderId: '',
      notificationAttempts: 0,
      notificationLastError: '',
      notificationLastAttemptAt: null,
      notificationNextAttemptAt: new Date(),
      notificationClaimToken: '',
      notificationClaimExpiresAt: null,
    })
    .where(eq(contactMessages.id, messageId))
    .returning();
  return Boolean(updated);
}

export type { ClaimedContactNotification };
