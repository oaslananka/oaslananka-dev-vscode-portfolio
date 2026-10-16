import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { Client } from 'pg';

const enabled = process.env.E2E_AGENT_WRITE_TEST === 'true' &&
  process.env.DATABASE_DRIVER === 'node-postgres';
test.skip(!enabled, 'Only against a migrated disposable PostgreSQL with explicit test secrets.');

test('actor-attributed writes are transactional, idempotent and reject stale revisions', async ({ request }) => {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl || !['127.0.0.1', 'localhost'].includes(new URL(databaseUrl).hostname)) {
    throw new Error('Agent write E2E must never use a remote database.');
  }
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  const slug = 'agent-writer-' + randomUUID().slice(0, 13);
  let projectId: number | undefined;
  const path = '/api/agent/v1/projects/' + slug;
  const key1 = randomUUID();
  const key2 = randomUUID();
  const writeHeaders = {
    Authorization: 'Bearer ' + 'e2e-write-key-' + 'w'.repeat(42),
    'If-Match': '"1"',
    'Idempotency-Key': key1,
  };
  try {
    const created = await client.query<{ id: number }>(
      'INSERT INTO projects (slug, title, description) VALUES ($1, $2, $3) RETURNING id',
      [slug, 'Disposable agent test', 'Before'],
    );
    projectId = created.rows[0].id;
    const updateBody = { description: 'After agent patch' };

    const first = await request.patch(path, { headers: writeHeaders, data: updateBody });
    expect(first.status(), await first.text()).toBe(204);

    const replay = await request.patch(path, { headers: writeHeaders, data: updateBody });
    expect(replay.status(), await replay.text()).toBe(204);

    const conflictKey = await request.patch(path, {
      headers: writeHeaders,
      data: { description: 'Different content with reused key' },
    });
    expect(conflictKey.status()).toBe(409);

    const stale = await request.patch(path, {
      headers: { ...writeHeaders, 'Idempotency-Key': randomUUID() },
      data: { description: 'Stale write' },
    });
    expect(stale.status()).toBe(409);

    const rows = await client.query<{ revision: number; description: string }>(
      'SELECT revision, description FROM projects WHERE id = $1', [projectId],
    );
    expect(rows.rows[0]).toEqual({ revision: 2, description: 'After agent patch' });
    const history = await client.query<{
      actor_id: string; request_id: string; revision: number;
    }>(
      'SELECT actor_id, request_id, revision FROM content_changes WHERE entity_type = $1 AND entity_id = $2 ORDER BY revision',
      ['projects', projectId],
    );
    expect(history.rows).toHaveLength(2);
    expect(history.rows[1]).toEqual({
      actor_id: 'agent:isolated-e2e', request_id: key1, revision: 2,
    });
    const ledger = await client.query<{ request_id: string }>(
      'SELECT request_id FROM agent_write_requests WHERE resource = $1', [path],
    );
    expect(ledger.rows.map((row) => row.request_id)).toEqual([key1]);

    // New key & latest version; both same-key concurrent requests must produce
    // exactly one new revision under PostgreSQL's advisory transaction lock.
    const updated = { description: 'Concurrent, exactly once' };
    const concurrentHeaders = { ...writeHeaders, 'If-Match': '"2"', 'Idempotency-Key': key2 };
    const both = await Promise.all([
      request.patch(path, { headers: concurrentHeaders, data: updated }),
      request.patch(path, { headers: concurrentHeaders, data: updated }),
    ]);
    expect(both.map((response) => response.status())).toEqual([204, 204]);
    const final = await client.query<{ revision: number; description: string }>(
      'SELECT revision, description FROM projects WHERE id = $1', [projectId],
    );
    expect(final.rows[0]).toEqual({ revision: 3, description: 'Concurrent, exactly once' });
    const revisions = await client.query<{ revision: number; request_id: string | null }>(
      'SELECT revision, request_id FROM content_changes WHERE entity_type = $1 AND entity_id = $2 ORDER BY revision',
      ['projects', projectId],
    );
    expect(revisions.rows.map((row) => row.revision)).toEqual([1, 2, 3]);
    expect(revisions.rows[2].request_id).toBe(key2);
    // The idempotency ledger cannot be changed by ordinary SQL DML.
    await expect(
      client.query('DELETE FROM agent_write_requests WHERE request_id = $1', [key1]),
    ).rejects.toMatchObject({ code: '23514' });
  } finally {
    if (projectId !== undefined) await client.query('DELETE FROM projects WHERE id = $1', [projectId]);
    await client.end();
  }
});

test('a published article cannot be modified through generic PATCH', async ({ request }) => {
  const url = process.env.DATABASE_URL;
  if (!url || !['127.0.0.1', 'localhost'].includes(new URL(url).hostname)) {
    throw new Error('Published article E2E requires an isolated local DB.');
  }
  const client = new Client({ connectionString: url });
  await client.connect();
  const slug = 'agent-published-' + randomUUID().slice(0, 13);
  let id: number | undefined;
  try {
    const created = await client.query<{ id: number }>(
      'INSERT INTO posts(slug, title, excerpt, body, published) VALUES($1, $2, $3, $4, true) RETURNING id',
      [slug, 'Published fixture', 'Excerpt', 'Original'],
    );
    id = created.rows[0].id;
    const forbidden = await request.patch('/api/agent/v1/posts/' + slug, {
      headers: {
        Authorization: 'Bearer ' + 'e2e-write-key-' + 'w'.repeat(42),
        'If-Match': '"1"',
        'Idempotency-Key': randomUUID(),
      },
      data: { body: 'Must not silently republish' },
    });
    expect(forbidden.status()).toBe(403);
    const record = await client.query<{ revision: number; body: string }>(
      'SELECT revision, body FROM posts WHERE id = $1', [id],
    );
    expect(record.rows[0]).toEqual({ revision: 1, body: 'Original' });
  } finally {
    if (id !== undefined) await client.query('DELETE FROM posts WHERE id = $1', [id]);
    await client.end();
  }
});
