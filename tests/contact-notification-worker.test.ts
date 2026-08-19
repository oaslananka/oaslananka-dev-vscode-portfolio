import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CONTACT_NOTIFICATION_MAX_ATTEMPTS,
  contactNotificationIdempotencyKey,
  nextContactNotificationAttemptAt,
} from '../lib/contact-notification-policy';
import {
  processContactNotificationBatch,
  type ClaimedContactNotification,
  type ContactNotificationSender,
  type ContactNotificationStore,
} from '../lib/contact-notification-worker';

const NOW = new Date('2026-07-20T12:00:00.000Z');

function claim(overrides: Partial<ClaimedContactNotification> = {}): ClaimedContactNotification {
  return {
    id: 42,
    name: 'Test Sender',
    email: 'sender@example.com',
    inquiryType: 'project',
    organization: 'Example Labs',
    message: 'A durable notification test message.',
    claimToken: 'claim-token',
    ...overrides,
  };
}

class FakeStore implements ContactNotificationStore {
  claimed: ClaimedContactNotification[] = [claim()];
  beginAttempts = new Map<number, number | null>([[42, 1]]);
  sent: Array<{ id: number; token: string; providerId: string }> = [];
  retries: Array<{ id: number; token: string; error: string; nextAttemptAt: Date }> = [];
  failures: Array<{ id: number; token: string; error: string }> = [];

  async claimEligible(): Promise<ClaimedContactNotification[]> {
    return this.claimed;
  }

  async beginAttempt(notification: ClaimedContactNotification): Promise<number | null> {
    return this.beginAttempts.get(notification.id) ?? null;
  }

  async markSent(
    notification: ClaimedContactNotification,
    providerId: string,
  ): Promise<boolean> {
    this.sent.push({
      id: notification.id,
      token: notification.claimToken,
      providerId,
    });
    return true;
  }

  async scheduleRetry(
    notification: ClaimedContactNotification,
    error: string,
    nextAttemptAt: Date,
  ): Promise<boolean> {
    this.retries.push({
      id: notification.id,
      token: notification.claimToken,
      error,
      nextAttemptAt,
    });
    return true;
  }

  async markTerminalFailure(
    notification: ClaimedContactNotification,
    error: string,
  ): Promise<boolean> {
    this.failures.push({
      id: notification.id,
      token: notification.claimToken,
      error,
    });
    return true;
  }
}

function sender(
  implementation: ContactNotificationSender['send'],
): ContactNotificationSender {
  return { send: implementation };
}

test('notification policy keeps stable idempotency and bounded backoff', () => {
  assert.equal(contactNotificationIdempotencyKey(42), 'portfolio-contact-42');

  const expectedDelays = [
    5 * 60 * 1000,
    30 * 60 * 1000,
    2 * 60 * 60 * 1000,
    12 * 60 * 60 * 1000,
    24 * 60 * 60 * 1000,
  ];

  expectedDelays.forEach((delay, index) => {
    assert.equal(
      nextContactNotificationAttemptAt(index + 1, NOW)?.getTime(),
      NOW.getTime() + delay,
    );
  });
  assert.equal(
    nextContactNotificationAttemptAt(CONTACT_NOTIFICATION_MAX_ATTEMPTS, NOW),
    null,
  );
});

test('successful delivery records the provider ID and stable idempotency key', async () => {
  const store = new FakeStore();
  const requests: Array<{ id: number; idempotencyKey: string }> = [];

  const result = await processContactNotificationBatch({
    now: NOW,
    sender: sender(async (notification, idempotencyKey) => {
      requests.push({ id: notification.id, idempotencyKey });
      return { providerId: 'provider-message-1' };
    }),
    store,
  });

  assert.deepEqual(result, {
    configured: true,
    claimed: 1,
    sent: 1,
    retried: 0,
    failed: 0,
    skipped: 0,
  });
  assert.deepEqual(requests, [
    { id: 42, idempotencyKey: 'portfolio-contact-42' },
  ]);
  assert.deepEqual(store.sent, [
    { id: 42, token: 'claim-token', providerId: 'provider-message-1' },
  ]);
});

test('transient failure schedules the next durable attempt', async () => {
  const store = new FakeStore();

  const result = await processContactNotificationBatch({
    now: NOW,
    sender: sender(async () => {
      throw new Error('Provider temporarily unavailable');
    }),
    store,
  });

  assert.equal(result.retried, 1);
  assert.equal(result.failed, 0);
  assert.deepEqual(store.retries, [
    {
      id: 42,
      token: 'claim-token',
      error: 'Provider temporarily unavailable',
      nextAttemptAt: new Date(NOW.getTime() + 5 * 60 * 1000),
    },
  ]);
});

test('the final durable attempt becomes terminal without contact content in telemetry', async () => {
  const store = new FakeStore();
  store.beginAttempts.set(42, CONTACT_NOTIFICATION_MAX_ATTEMPTS);
  const reports: unknown[] = [];

  const result = await processContactNotificationBatch({
    now: NOW,
    onTerminalFailure: (report) => {
      reports.push(report);
    },
    sender: sender(async () => {
      throw new Error('Provider rejected request');
    }),
    store,
  });

  assert.equal(result.failed, 1);
  assert.deepEqual(store.failures, [
    {
      id: 42,
      token: 'claim-token',
      error: 'Provider rejected request',
    },
  ]);
  assert.equal(reports.length, 1);
  assert.deepEqual(
    { ...(reports[0] as Record<string, unknown>), error: undefined },
    {
      error: undefined,
      messageId: 42,
      attempts: CONTACT_NOTIFICATION_MAX_ATTEMPTS,
    },
  );
  assert.match(
    String((reports[0] as { error: Error }).error.message),
    /Provider rejected request/,
  );
  const serializedReport = JSON.stringify(
    reports,
    (_key, value) => (value instanceof Error ? value.message : value),
  );
  assert.doesNotMatch(serializedReport, /Test Sender|sender@example\.com|Example Labs|durable notification test/);
});

test('a stale duplicate claim cannot call the provider twice', async () => {
  const store = new FakeStore();
  let admitted = false;
  store.beginAttempt = async () => {
    if (admitted) return null;
    admitted = true;
    return 1;
  };
  let sends = 0;
  const sharedSender = sender(async () => {
    sends += 1;
    return { providerId: 'provider-message-1' };
  });

  const [first, second] = await Promise.all([
    processContactNotificationBatch({ now: NOW, sender: sharedSender, store }),
    processContactNotificationBatch({ now: NOW, sender: sharedSender, store }),
  ]);

  assert.equal(sends, 1);
  assert.equal(first.sent + second.sent, 1);
  assert.equal(first.skipped + second.skipped, 1);
});

test('missing provider configuration is a successful no-op', async () => {
  const store = new FakeStore();

  assert.deepEqual(
    await processContactNotificationBatch({ now: NOW, sender: null, store }),
    {
      configured: false,
      claimed: 0,
      sent: 0,
      retried: 0,
      failed: 0,
      skipped: 0,
    },
  );
});
