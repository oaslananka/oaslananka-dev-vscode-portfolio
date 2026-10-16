import assert from 'node:assert/strict';
import test from 'node:test';
import { Client } from 'pg';

const databaseUrl = process.env.CONTENT_HISTORY_TEST_DATABASE_URL;

function requireLocalDatabase(url: string): void {
  const hostname = new URL(url).hostname;
  if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
    throw new Error('Content history tests require a disposable local PostgreSQL database.');
  }
}

test('content history is transactional, immutable, and supports guarded rollback', {
  skip: !databaseUrl && 'Requires migrated disposable CONTENT_HISTORY_TEST_DATABASE_URL',
}, async () => {
  requireLocalDatabase(databaseUrl!);
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query('BEGIN');
    // No fixture leaks: the test always rolls back the outer transaction.
    const created = await client.query<{ id: number; revision: number }>(`
      INSERT INTO projects(slug, title, description)
      VALUES ('audit-local-fixture', 'Before', 'Original description')
      RETURNING id, revision
    `);
    const id = created.rows[0].id;
    assert.equal(created.rows[0].revision, 1);

    const changed = await client.query<{ revision: number }>(`
      UPDATE projects SET title = 'After', revision = 999
      WHERE id = $1 AND revision = 1 RETURNING revision
    `, [id]);
    assert.equal(changed.rows[0].revision, 2, 'DB owns revision numbering');

    const stale = await client.query(`
      UPDATE projects SET title = 'Stale writer' WHERE id = $1 AND revision = 1
      RETURNING revision
    `, [id]);
    assert.equal(stale.rowCount, 0, 'stale writes must not change data');

    const history = await client.query<{
      revision: number;
      operation: string;
      before: { title: string; revision: number } | null;
      after: { title: string; revision: number } | null;
    }>(`
      SELECT revision, operation, "before", "after" FROM content_changes
      WHERE entity_type = 'projects' AND entity_id = $1 ORDER BY id
    `, [id]);
    assert.deepEqual(history.rows.map((row) => row.revision), [1, 2]);
    assert.deepEqual(history.rows.map((row) => row.operation), ['insert', 'update']);
    assert.equal(history.rows[1].before?.title, 'Before');
    assert.equal(history.rows[1].after?.title, 'After');
    assert.equal(history.rows[1].after?.revision, 2);

    // A rollback is a new guarded update: old snapshots remain immutable.
    const restored = await client.query<{ revision: number; title: string }>(`
      UPDATE projects SET title = $2 WHERE id = $1 AND revision = 2
      RETURNING revision, title
    `, [id, history.rows[1].before?.title]);
    assert.deepEqual(restored.rows[0], { revision: 3, title: 'Before' });

    await client.query('SAVEPOINT protect_history');
    await assert.rejects(
      () => client.query('DELETE FROM content_changes WHERE entity_type = $1 AND entity_id = $2', ['projects', id]),
      (error: unknown) => Boolean(error && typeof error === 'object' && 'code' in error && error.code === '23514'),
    );
    await client.query('ROLLBACK TO SAVEPOINT protect_history');
    await client.query('SAVEPOINT protect_truncate');
    await assert.rejects(
      () => client.query('TRUNCATE content_changes'),
      (error: unknown) => Boolean(error && typeof error === 'object' && 'code' in error && error.code === '23514'),
    );
    await client.query('ROLLBACK TO SAVEPOINT protect_truncate');
    await client.query('DELETE FROM projects WHERE id = $1', [id]);
    const count = await client.query<{ operation: string; revision: number }>(`
      SELECT operation, revision FROM content_changes
      WHERE entity_type = 'projects' AND entity_id = $1 ORDER BY id DESC LIMIT 1
    `, [id]);
    assert.deepEqual(count.rows[0], { operation: 'delete', revision: 4 });

    // An invalid row constraint rolls back its write and history together.
    await client.query('SAVEPOINT bad_write');
    await assert.rejects(
      () => client.query(`INSERT INTO projects(slug,title,description,sort_order)
        VALUES ('audit-invalid-fixture','Invalid','No',10001)`),
      (error: unknown) => Boolean(error && typeof error === 'object' && 'code' in error && error.code === '23514'),
    );
    await client.query('ROLLBACK TO SAVEPOINT bad_write');
    const invalid = await client.query<{ count: string }>(`
      SELECT count(*)::text AS count FROM content_changes
      WHERE entity_type = 'projects' AND ("after"->>'slug') = 'audit-invalid-fixture'
    `);
    assert.equal(invalid.rows[0].count, '0');
  } finally {
    await client.query('ROLLBACK');
    await client.end();
  }
});

test('two concurrent editors cannot silently overwrite a matching revision', {
  skip: !databaseUrl && 'Requires migrated disposable CONTENT_HISTORY_TEST_DATABASE_URL',
}, async () => {
  requireLocalDatabase(databaseUrl!);
  const first = new Client({ connectionString: databaseUrl });
  const second = new Client({ connectionString: databaseUrl });
  await first.connect();
  await second.connect();
  let insertedId: number | undefined;
  try {
    const inserted = await first.query<{ id: number }>(`
      INSERT INTO projects(slug, title, description)
      VALUES ('audit-race-fixture', 'Initial', 'Concurrent test') RETURNING id
    `);
    insertedId = inserted.rows[0].id;
    await first.query('BEGIN');
    const winner = await first.query<{ revision: number }>(`
      UPDATE projects SET title = 'Winner' WHERE id = $1 AND revision = 1
      RETURNING revision
    `, [insertedId]);
    assert.equal(winner.rows[0].revision, 2);

    // Under READ COMMITTED the second UPDATE must wait for the row lock;
    // after the first commits it will re-evaluate the revision predicate.
    const waitingWriter = second.query(`
      UPDATE projects SET title = 'Stale contender' WHERE id = $1 AND revision = 1
      RETURNING revision
    `, [insertedId]);
    await first.query('COMMIT');
    const stale = await waitingWriter;
    assert.equal(stale.rowCount, 0);

    const current = await second.query<{ title: string; revision: number }>(
      'SELECT title, revision FROM projects WHERE id = $1', [insertedId],
    );
    assert.deepEqual(current.rows[0], { title: 'Winner', revision: 2 });
  } finally {
    await first.query('ROLLBACK').catch(() => undefined);
    if (insertedId !== undefined) {
      await first.query('DELETE FROM projects WHERE id = $1', [insertedId]).catch(() => undefined);
    }
    await first.end();
    await second.end();
  }
});
