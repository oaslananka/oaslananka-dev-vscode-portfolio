import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { Client, Pool } from 'pg';

const databaseUrl = process.env.RATE_LIMIT_TEST_DATABASE_URL;
const skipReason = databaseUrl
  ? false
  : 'Set RATE_LIMIT_TEST_DATABASE_URL to a migrated, disposable PostgreSQL database.';

const consumeSql = `
  SELECT public.consume_rate_limit_attempt($1, $2, $3, $4) AS consumed
`;

function limits() {
  const now = Date.now();
  return {
    windowStart: new Date(now - 15 * 60 * 1_000),
    retentionCutoff: new Date(now - 24 * 60 * 60 * 1_000),
  };
}

test(
  'database rate-limit consumption is atomic under contention',
  { skip: skipReason },
  async () => {
    const url = databaseUrl as string;
    const heldKey = `test:held:${randomUUID()}`;
    const parallelKey = `test:parallel:${randomUUID()}`;
    const first = new Client({ connectionString: url });
    const second = new Client({ connectionString: url });
    const pool = new Pool({ connectionString: url, max: 24 });

    await Promise.all([first.connect(), second.connect()]);

    try {
      const { windowStart, retentionCutoff } = limits();
      await first.query('BEGIN');
      const admitted = await first.query<{ consumed: boolean }>(consumeSql, [
        heldKey,
        windowStart,
        1,
        retentionCutoff,
      ]);

      const blockedPromise = second.query<{ consumed: boolean }>(consumeSql, [
        heldKey,
        windowStart,
        1,
        retentionCutoff,
      ]);

      await new Promise((resolve) => setTimeout(resolve, 100));
      await first.query('COMMIT');
      const blocked = await blockedPromise;

      assert.equal(admitted.rows[0]?.consumed, true);
      assert.equal(blocked.rows[0]?.consumed, false);

      const maximum = 5;
      const results = await Promise.all(
        Array.from({ length: 24 }, () =>
          pool.query<{ consumed: boolean }>(consumeSql, [
            parallelKey,
            windowStart,
            maximum,
            retentionCutoff,
          ]),
        ),
      );
      const consumed = results.filter(
        (result) => result.rows[0]?.consumed,
      ).length;
      const stored = await pool.query<{ value: number }>(
        `SELECT count(*)::integer AS value
         FROM public.login_attempts
         WHERE "ip" = $1`,
        [parallelKey],
      );

      assert.equal(consumed, maximum);
      assert.equal(stored.rows[0]?.value, maximum);
    } finally {
      await first.query('ROLLBACK').catch(() => undefined);
      await pool
        .query('DELETE FROM public.login_attempts WHERE "ip" = ANY($1::text[])', [
          [heldKey, parallelKey],
        ])
        .catch(() => undefined);
      await Promise.all([first.end(), second.end(), pool.end()]);
    }
  },
);
