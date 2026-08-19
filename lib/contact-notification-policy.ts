export const CONTACT_NOTIFICATION_MAX_ATTEMPTS = 6;
export const CONTACT_NOTIFICATION_BATCH_SIZE = 10;
export const CONTACT_NOTIFICATION_LEASE_MS = 5 * 60 * 1000;

const CONTACT_NOTIFICATION_RETRY_DELAYS_MS = [
  5 * 60 * 1000,
  30 * 60 * 1000,
  2 * 60 * 60 * 1000,
  12 * 60 * 60 * 1000,
  24 * 60 * 60 * 1000,
] as const;

export function contactNotificationIdempotencyKey(messageId: number): string {
  if (!Number.isSafeInteger(messageId) || messageId <= 0) {
    throw new Error('Contact notification message ID must be a positive integer.');
  }
  return `portfolio-contact-${messageId}`;
}

/**
 * Return the earliest next durable attempt after the completed attempt count.
 * `null` means the configured maximum has been exhausted.
 */
export function nextContactNotificationAttemptAt(
  completedAttempts: number,
  now = new Date(),
): Date | null {
  if (!Number.isSafeInteger(completedAttempts) || completedAttempts < 1) {
    throw new Error('Completed notification attempts must be a positive integer.');
  }
  if (completedAttempts >= CONTACT_NOTIFICATION_MAX_ATTEMPTS) return null;

  const delay = CONTACT_NOTIFICATION_RETRY_DELAYS_MS[completedAttempts - 1];
  if (delay === undefined) return null;
  return new Date(now.getTime() + delay);
}

export function contactNotificationErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : 'Unknown error';
  return message.slice(0, 1_000);
}
