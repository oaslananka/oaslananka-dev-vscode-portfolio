import type { ContactInquiryType } from './db/schema';
import {
  CONTACT_NOTIFICATION_BATCH_SIZE,
  CONTACT_NOTIFICATION_LEASE_MS,
  contactNotificationErrorMessage,
  contactNotificationIdempotencyKey,
  nextContactNotificationAttemptAt,
} from './contact-notification-policy';

export interface ClaimedContactNotification {
  id: number;
  name: string;
  email: string;
  inquiryType: ContactInquiryType;
  organization: string;
  message: string;
  claimToken: string;
}

export interface ContactNotificationClaimOptions {
  batchSize: number;
  leaseExpiresAt: Date;
  messageId?: number;
  now: Date;
}

export interface ContactNotificationStore {
  claimEligible(
    options: ContactNotificationClaimOptions,
  ): Promise<ClaimedContactNotification[]>;
  beginAttempt(
    notification: ClaimedContactNotification,
    now: Date,
  ): Promise<number | null>;
  markSent(
    notification: ClaimedContactNotification,
    providerId: string,
  ): Promise<boolean>;
  scheduleRetry(
    notification: ClaimedContactNotification,
    error: string,
    nextAttemptAt: Date,
  ): Promise<boolean>;
  markTerminalFailure(
    notification: ClaimedContactNotification,
    error: string,
  ): Promise<boolean>;
}

export interface ContactNotificationSender {
  send(
    notification: ClaimedContactNotification,
    idempotencyKey: string,
  ): Promise<{ providerId: string }>;
}

export interface ContactNotificationTerminalReport {
  attempts: number;
  error: unknown;
  messageId: number;
}

export interface ContactNotificationBatchResult {
  configured: boolean;
  claimed: number;
  sent: number;
  retried: number;
  failed: number;
  skipped: number;
}

export interface ProcessContactNotificationBatchOptions {
  batchSize?: number;
  leaseMs?: number;
  messageId?: number;
  now?: Date;
  onTerminalFailure?: (
    report: ContactNotificationTerminalReport,
  ) => void | Promise<void>;
  sender: ContactNotificationSender | null;
  store: ContactNotificationStore;
}

type NotificationOutcome = 'sent' | 'retried' | 'failed' | 'skipped';

async function processClaim(
  notification: ClaimedContactNotification,
  options: ProcessContactNotificationBatchOptions,
  now: Date,
): Promise<NotificationOutcome> {
  const attempts = await options.store.beginAttempt(notification, now);
  if (attempts === null) return 'skipped';

  try {
    const delivery = await options.sender!.send(
      notification,
      contactNotificationIdempotencyKey(notification.id),
    );
    return (await options.store.markSent(notification, delivery.providerId))
      ? 'sent'
      : 'skipped';
  } catch (error) {
    const errorMessage = contactNotificationErrorMessage(error);
    const nextAttemptAt = nextContactNotificationAttemptAt(attempts, now);

    if (nextAttemptAt) {
      return (await options.store.scheduleRetry(
        notification,
        errorMessage,
        nextAttemptAt,
      ))
        ? 'retried'
        : 'skipped';
    }

    const terminal = await options.store.markTerminalFailure(
      notification,
      errorMessage,
    );
    if (!terminal) return 'skipped';

    await options.onTerminalFailure?.({
      attempts,
      error,
      messageId: notification.id,
    });
    return 'failed';
  }
}

export async function processContactNotificationBatch(
  options: ProcessContactNotificationBatchOptions,
): Promise<ContactNotificationBatchResult> {
  const empty: ContactNotificationBatchResult = {
    configured: Boolean(options.sender),
    claimed: 0,
    sent: 0,
    retried: 0,
    failed: 0,
    skipped: 0,
  };
  if (!options.sender) return empty;

  const now = options.now ?? new Date();
  const claims = await options.store.claimEligible({
    batchSize: options.batchSize ?? CONTACT_NOTIFICATION_BATCH_SIZE,
    leaseExpiresAt: new Date(
      now.getTime() + (options.leaseMs ?? CONTACT_NOTIFICATION_LEASE_MS),
    ),
    messageId: options.messageId,
    now,
  });
  const outcomes = await Promise.all(
    claims.map((notification) => processClaim(notification, options, now)),
  );

  const result: ContactNotificationBatchResult = {
    ...empty,
    claimed: claims.length,
  };
  for (const outcome of outcomes) result[outcome] += 1;
  return result;
}
