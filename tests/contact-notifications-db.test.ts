import assert from 'node:assert/strict';
import test from 'node:test';

import { Pool, type PoolClient } from 'pg';

import { CONTACT_NOTIFICATION_MAX_ATTEMPTS } from '../lib/contact-notification-policy';

const databaseUrl = process.env.CONTACT_NOTIFICATION_TEST_DATABASE_URL;

interface ClaimedRow {
  id: number;
  notification_claim_token: string;
}

async function claimOne(
  client: PoolClient,
  token: string,
  now: Date,
  messageId: number | null = null,
): Promise<ClaimedRow[]> {
  const result = await client.query<ClaimedRow>(
    `SELECT id, notification_claim_token
     FROM public.claim_contact_notifications($1, $2, $3, 1, $4, $5)`,
    [
      token,
      now,
      new Date(now.getTime() + 5 * 60 * 1000),
      CONTACT_NOTIFICATION_MAX_ATTEMPTS,
      messageId,
    ],
  );
  return result.rows;
}

test('contact notification claims are exclusive across concurrent workers', async (t) => {
  if (!databaseUrl) {
    t.skip(
      'Set CONTACT_NOTIFICATION_TEST_DATABASE_URL to a migrated, disposable PostgreSQL database.',
    );
    return;
  }

  const pool = new Pool({ connectionString: databaseUrl, max: 4 });
  const runId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const now = new Date();
  const inserted = await pool.query<{ id: number }>(
    `INSERT INTO contact_messages (
       name, email, inquiry_type, organization, message,
       notification_status, notification_next_attempt_at,
       retention_expires_at
     )
     VALUES
       ($1, $2, 'project', '', $3, 'pending', $4, $5),
       ($6, $7, 'project', '', $8, 'pending', $4, $5)
     RETURNING id`,
    [
      `Claim A ${runId}`,
      `claim-a-${runId}@example.com`,
      `Claim concurrency A ${runId}`,
      now,
      new Date(now.getTime() + 24 * 60 * 60 * 1000),
      `Claim B ${runId}`,
      `claim-b-${runId}@example.com`,
      `Claim concurrency B ${runId}`,
    ],
  );
  const ids = inserted.rows.map((row) => row.id);
  const firstClient = await pool.connect();
  const secondClient = await pool.connect();

  try {
    const [first, second] = await Promise.all([
      claimOne(firstClient, `worker-a-${runId}`, now),
      claimOne(secondClient, `worker-b-${runId}`, now),
    ]);

    assert.equal(first.length, 1);
    assert.equal(second.length, 1);
    assert.notEqual(first[0]?.id, second[0]?.id);
    assert.deepEqual(
      new Set([first[0]?.id, second[0]?.id]),
      new Set(ids),
    );

    const duplicate = await claimOne(
      firstClient,
      `worker-c-${runId}`,
      now,
      first[0]!.id,
    );
    assert.deepEqual(duplicate, []);

    await pool.query(
      `UPDATE contact_messages
       SET notification_claim_expires_at = $1
       WHERE id = $2`,
      [new Date(now.getTime() - 1), first[0]!.id],
    );
    const reclaimed = await claimOne(
      firstClient,
      `worker-d-${runId}`,
      now,
      first[0]!.id,
    );
    assert.equal(reclaimed[0]?.id, first[0]!.id);
    assert.equal(reclaimed[0]?.notification_claim_token, `worker-d-${runId}`);
  } finally {
    firstClient.release();
    secondClient.release();
    await pool.query('DELETE FROM contact_messages WHERE id = ANY($1::int[])', [ids]);
    await pool.end();
  }
});
