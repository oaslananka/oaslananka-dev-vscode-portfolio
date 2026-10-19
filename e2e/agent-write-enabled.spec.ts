import { randomUUID } from 'node:crypto';
import { expect, test, type Page, type APIRequestContext } from '@playwright/test';
import { E2E_ADMIN_PASSWORD } from './constants';
import { Client } from 'pg';

const enabled = process.env.E2E_AGENT_WRITE_TEST === 'true' &&
  process.env.DATABASE_DRIVER === 'node-postgres';
test.skip(!enabled, 'Only against a migrated disposable PostgreSQL with explicit test secrets.');

const agentKey = 'Bearer ' + 'e2e-write-key-' + 'w'.repeat(42);


/** These tests must never access a non-local database. */
async function connectDisposableDatabase(): Promise<Client> {
  const url = process.env.DATABASE_URL;
  if (!url || !['127.0.0.1', 'localhost'].includes(new URL(url).hostname)) {
    throw new Error('Agent write E2E requires a local disposable database.');
  }
  const client = new Client({ connectionString: url });
  await client.connect();
  return client;
}

async function loginAndApprove(
  page: Page,
  request: APIRequestContext,
): Promise<(path: string, revision: number, key: string, patch: object) => Promise<string>> {
  await page.goto('/admin/login');
  await page.getByLabel('Password').fill(E2E_ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/admin$/);

  return async (path, revision, key, patch) => {
    const sent = await request.post('/api/agent/v1/proposals', {
      headers: {
        Authorization: agentKey,
        ...(revision === 0 ? { 'If-None-Match': '*' } : { 'If-Match': JSON.stringify(String(revision)) }),
        'Idempotency-Key': key,
      },
      data: { resource: path, patch },
    });
    expect(sent.status(), await sent.text()).toBe(202);
    const pending = await request.get('/api/agent/v1/proposals/' + key, {
      headers: { Authorization: agentKey },
    });
    expect((await pending.json()).status).toBe('pending');

    await page.goto('/admin/agent-approvals');
    const preview = page.locator('section').filter({ hasText: path })
      .filter({ hasText: String(Object.values(patch)[0]) }).first();
    await expect(preview).toBeVisible();
    await preview.getByLabel('I reviewed the exact changes above.').check();
    await preview.getByRole('button', { name: 'Approve this change' }).click();
    await expect(preview).toHaveCount(0);

    const status = await request.get('/api/agent/v1/proposals/' + key, {
      headers: { Authorization: agentKey },
    });
    const result = await status.json();
    expect(status.status(), JSON.stringify(result)).toBe(200);
    expect(result.status).toBe('approved');
    expect(typeof result.approval).toBe('string');
    return result.approval as string;
  };
}

test('pending owner review remains available long after creation', async ({ request, page }) => {
  const client = await connectDisposableDatabase();
  const slug = 'agent-persistent-' + randomUUID().slice(0, 13);
  const key = randomUUID();
  const path = '/api/agent/v1/projects/' + slug;
  let projectId: number | undefined;
  try {
    const created = await client.query<{ id: number }>(
      'INSERT INTO projects (slug, title, description) VALUES ($1, $2, $3) RETURNING id',
      [slug, 'Durable review fixture', 'Before'],
    );
    projectId = created.rows[0].id;
    const sent = await request.post('/api/agent/v1/proposals', {
      headers: { Authorization: agentKey, 'If-Match': '"1"', 'Idempotency-Key': key },
      data: { resource: path, patch: { description: 'After owner approval' } },
    });
    expect(sent.status(), await sent.text()).toBe(202);
    const stored = await client.query<{ expires_at: Date }>(
      'SELECT expires_at FROM agent_content_proposals WHERE request_id = $1', [key],
    );
    expect(stored.rows[0].expires_at.toISOString()).toBe('9999-12-31T23:59:59.000Z');
    await client.query(
      "UPDATE agent_content_proposals SET created_at = now() - interval '31 days' WHERE request_id = $1",
      [key],
    );
    const pending = await request.get('/api/agent/v1/proposals/' + key, {
      headers: { Authorization: agentKey },
    });
    expect((await pending.json()).status).toBe('pending');

    await page.goto('/admin/login');
    await page.getByLabel('Password').fill(E2E_ADMIN_PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\\/admin$/);
    await page.goto('/admin/agent-approvals');
    const preview = page.locator('section').filter({ hasText: path });
    await expect(preview).toBeVisible();
    await expect(preview.getByText('Does not expire')).toBeVisible();
    await preview.getByLabel('I reviewed the exact changes above.').check();
    await preview.getByRole('button', { name: 'Approve this change' }).click();

    const approved = await request.get('/api/agent/v1/proposals/' + key, {
      headers: { Authorization: agentKey },
    });
    const outcome = await approved.json();
    expect(outcome.status).toBe('approved');
    expect(outcome.expiresInSeconds).toBe(180);
    expect(typeof outcome.approval).toBe('string');
  } finally {
    await client.query('DELETE FROM agent_content_proposals WHERE request_id = $1', [key]);
    if (projectId !== undefined) await client.query('DELETE FROM projects WHERE id = $1', [projectId]);
    await client.end();
  }
});

test('actor-attributed writes are transactional, idempotent and reject stale revisions', async ({ request, page }) => {
  const client = await connectDisposableDatabase();

  const slug = 'agent-writer-' + randomUUID().slice(0, 13);
  let projectId: number | undefined;
  const path = '/api/agent/v1/projects/' + slug;
  const key1 = randomUUID();
  const key2 = randomUUID();
  const writeHeaders: Record<string, string> = {
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
    const approve = await loginAndApprove(page, request);
    const updateBody = { description: 'After agent patch' };
    // Knowing the service write key is insufficient to change content.
    const noApproval = await request.patch(path, { headers: writeHeaders, data: updateBody });
    expect(noApproval.status()).toBe(403);
    writeHeaders['X-Agent-Approval'] = await approve(path, 1, key1, updateBody);
    const unapprovedChange = await request.patch(path, {
      headers: writeHeaders,
      data: { description: 'Changed after approval' },
    });
    expect(unapprovedChange.status()).toBe(403);

    const first = await request.patch(path, { headers: writeHeaders, data: updateBody });
    expect(first.status(), await first.text()).toBe(204);

    const replay = await request.patch(path, { headers: writeHeaders, data: updateBody });
    expect(replay.status(), await replay.text()).toBe(204);

    const differentBody = { description: 'Different content with reused key' };
    const collision = await request.post('/api/agent/v1/proposals', {
      headers: {
        Authorization: agentKey, 'If-Match': '"1"', 'Idempotency-Key': key1,
      },
      data: { resource: path, patch: differentBody },
    });
    expect(collision.status()).toBe(409);
    const conflictKey = await request.patch(path, {
      headers: writeHeaders,
      data: differentBody,
    });
    expect(conflictKey.status()).toBe(403);

    const staleKey = randomUUID();
    const staleBody = { description: 'Stale write' };
    const stale = await request.post('/api/agent/v1/proposals', {
      headers: { Authorization: agentKey, 'If-Match': '"1"', 'Idempotency-Key': staleKey },
      data: { resource: path, patch: staleBody },
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
    const concurrentHeaders = { ...writeHeaders, 'If-Match': '"2"', 'Idempotency-Key': key2,
      'X-Agent-Approval': await approve(path, 2, key2, updated) };
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

test('a published article cannot be proposed through generic PATCH', async ({ request }) => {
  const client = await connectDisposableDatabase();
  const slug = 'agent-published-' + randomUUID().slice(0, 13);
  let id: number | undefined;
  try {
    const created = await client.query<{ id: number }>(
      'INSERT INTO posts(slug, title, excerpt, body, published) VALUES($1, $2, $3, $4, true) RETURNING id',
      [slug, 'Published fixture', 'Excerpt', 'Original'],
    );
    id = created.rows[0].id;
    const path = '/api/agent/v1/posts/' + slug;
    const key = randomUUID();
    const patch = { body: 'Must not silently republish' };
    const forbidden = await request.post('/api/agent/v1/proposals', {
      headers: {
        Authorization: agentKey,
        'If-Match': '"1"',
        'Idempotency-Key': key,
      },
      data: { resource: path, patch },
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

test('a human can reject an agent proposal; rejection grants no token', async ({ request, page }) => {
  const client = await connectDisposableDatabase();
  const slug = 'agent-rejected-' + randomUUID().slice(0, 13);
  const id = randomUUID();
  const path = '/api/agent/v1/projects/' + slug;
  let projectId: number | undefined;
  try {
    const created = await client.query<{ id: number }>(
      'INSERT INTO projects(slug,title,description) VALUES($1,$2,$3) RETURNING id',
      [slug, 'Rejected proposal fixture', 'Original content'],
    );
    projectId = created.rows[0].id;
    const submitted = await request.post('/api/agent/v1/proposals', {
      headers: { Authorization: agentKey, 'If-Match': '"1"', 'Idempotency-Key': id },
      data: { resource: path, patch: { description: 'Rejected change' } },
    });
    expect(submitted.status(), await submitted.text()).toBe(202);

    await page.goto('/admin/login');
    await page.getByLabel('Password').fill(E2E_ADMIN_PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await page.goto('/admin/agent-approvals');
    const section = page.locator('section').filter({ hasText: 'Rejected change' });
    await expect(section).toBeVisible();
    await section.getByRole('button', { name: 'Reject' }).click();
    await expect(section).toHaveCount(0);

    const status = await request.get('/api/agent/v1/proposals/' + id, {
      headers: { Authorization: agentKey },
    });
    expect(await status.json()).toEqual({ requestId: id, status: 'rejected' });
    const row = await client.query<{ revision: number; description: string }>(
      'SELECT revision, description FROM projects WHERE id=$1', [projectId],
    );
    expect(row.rows[0]).toEqual({ revision: 1, description: 'Original content' });
  } finally {
    if (projectId !== undefined) await client.query('DELETE FROM projects WHERE id=$1', [projectId]);
    await client.end();
  }
});


test('a new article requires human approval and remains an unpublished draft', async ({ request, page }) => {
  const client = await connectDisposableDatabase();
  const slug = 'agent-new-draft-' + randomUUID().slice(0, 13);
  const key = randomUUID();
  const resource = '/api/agent/v1/posts';
  const draft = {
    title: 'Human reviewed article',
    slug,
    excerpt: 'Draft summary',
    body: '# Only the owner can publish this',
    tags: ['agent-test'],
  };
  const headers = {
    Authorization: agentKey,
    'If-None-Match': '*',
    'Idempotency-Key': key,
  };

  try {
    const unapproved = await request.post(resource, { headers, data: draft });
    expect(unapproved.status()).toBe(403);
    const noPremature = await client.query('SELECT id FROM posts WHERE slug = $1', [slug]);
    expect(noPremature.rowCount).toBe(0);

    const wrongPublished = await request.post('/api/agent/v1/proposals', {
      headers,
      data: { resource, patch: { ...draft, published: true } },
    });
    expect(wrongPublished.status()).toBe(422);

    const wrongPrecondition = await request.post('/api/agent/v1/proposals', {
      headers: { Authorization: agentKey, 'If-Match': '"1"', 'Idempotency-Key': randomUUID() },
      data: { resource, patch: draft },
    });
    expect(wrongPrecondition.status()).toBe(428);

    const approve = await loginAndApprove(page, request);
    const signed = await approve(resource, 0, key, draft);
    const response = await request.post(resource, {
      headers: { ...headers, 'X-Agent-Approval': signed },
      data: draft,
    });
    expect(response.status(), await response.text()).toBe(201);

    const again = await request.post(resource, {
      headers: { ...headers, 'X-Agent-Approval': signed },
      data: draft,
    });
    expect(again.status()).toBe(201);

    const rows = await client.query<{
      id: number; published: boolean; revision: number; title: string;
    }>('SELECT id, published, revision, title FROM posts WHERE slug = $1', [slug]);
    expect(rows.rows).toHaveLength(1);
    expect(rows.rows[0].published).toBe(false);
    expect(rows.rows[0].revision).toBe(1);
    expect(rows.rows[0].title).toBe(draft.title);

    const history = await client.query<{ actor_id: string; request_id: string; revision: number }>(
      'SELECT actor_id, request_id, revision FROM content_changes WHERE entity_type = $1 AND entity_id = $2',
      ['posts', rows.rows[0].id],
    );
    expect(history.rows).toEqual([{
      actor_id: 'agent:isolated-e2e',
      request_id: key,
      revision: 1,
    }]);
    const ledger = await client.query<{ approval_id: string }>(
      'SELECT approval_id FROM agent_write_requests WHERE request_id = $1', [key],
    );
    expect(ledger.rows).toHaveLength(1);
    expect(ledger.rows[0].approval_id).toMatch(/^[a-z0-9-]{36}$/);

    const secondProposal = await request.post('/api/agent/v1/proposals', {
      headers: { ...headers, 'Idempotency-Key': randomUUID() },
      data: { resource, patch: draft },
    });
    expect(secondProposal.status()).toBe(409);
  } finally {
    await client.query('DELETE FROM posts WHERE slug = $1', [slug]);
    await client.end();
  }
});


test('an admin-approved project is private until explicitly published', async ({ request, page }) => {
  const client = await connectDisposableDatabase();
  const slug = 'agent-project-draft-' + randomUUID().slice(0, 13);
  const key = randomUUID();
  const resource = '/api/agent/v1/projects';
  const patch = {
    title: 'Private project fixture ' + slug,
    slug,
    description: 'This content must never appear publicly before publishing',
    tags: ['internal'],
  };
  const headers = {
    Authorization: agentKey,
    'If-None-Match': '*',
    'Idempotency-Key': key,
  };

  try {
    const noApproval = await request.post(resource, { headers, data: patch });
    expect(noApproval.status()).toBe(403);

    for (const unauthorized of [
      { ...patch, published: true },
      { ...patch, published: false },
      { ...patch, featured: true },
      { ...patch, featured: false },
    ]) {
      const forbidden = await request.post('/api/agent/v1/proposals', {
        headers: { ...headers, 'Idempotency-Key': randomUUID() },
        data: { resource, patch: unauthorized },
      });
      expect(forbidden.status()).toBe(422);
    }

    const approve = await loginAndApprove(page, request);
    const token = await approve(resource, 0, key, patch);
    const publishedAttempt = await request.post(resource, {
      headers: { ...headers, 'X-Agent-Approval': token },
      data: { ...patch, featured: true },
    });
    expect(publishedAttempt.status()).toBe(403);

    const created = await request.post(resource, {
      headers: { ...headers, 'X-Agent-Approval': token },
      data: patch,
    });
    expect(created.status(), await created.text()).toBe(201);

    const retry = await request.post(resource, {
      headers: { ...headers, 'X-Agent-Approval': token },
      data: patch,
    });
    expect(retry.status()).toBe(201);

    const rows = await client.query<{
      id: number; published: boolean; featured: boolean; revision: number;
    }>('SELECT id,published,featured,revision FROM projects WHERE slug=$1', [slug]);
    expect(rows.rows).toHaveLength(1);
    expect(rows.rows[0].published).toBe(false);
    expect(rows.rows[0].featured).toBe(false);
    expect(rows.rows[0].revision).toBe(1);

    const history = await client.query<{ actor_id: string; request_id: string; revision: number }>(
      'SELECT actor_id, request_id, revision FROM content_changes WHERE entity_type=$1 AND entity_id=$2',
      ['projects', rows.rows[0].id],
    );
    expect(history.rows).toEqual([{ actor_id: 'agent:isolated-e2e', request_id: key, revision: 1 }]);

    const detail = await request.get('/projects/' + slug);
    expect(detail.status()).toBe(404);
    const openGraph = await request.get('/projects/' + slug + '/opengraph-image');
    expect(openGraph.status()).toBe(404);
    const listing = await request.get('/projects');
    expect(listing.status()).toBe(200);
    expect(await listing.text()).not.toContain(patch.title);
    const sitemap = await request.get('/sitemap.xml');
    expect(sitemap.status()).toBe(200);
    expect(await sitemap.text()).not.toContain('/projects/' + slug);

    await page.goto('/admin/projects');
    const adminRow = page.getByRole('row').filter({ hasText: patch.title });
    await expect(adminRow).toContainText('Draft');

    const collision = await request.post('/api/agent/v1/proposals', {
      headers: { ...headers, 'Idempotency-Key': randomUUID() },
      data: { resource, patch },
    });
    expect(collision.status()).toBe(409);
  } finally {
    await client.query('DELETE FROM projects WHERE slug=$1', [slug]);
    await client.end();
  }
});


test('publication and unpublication require separate approvals, preserve history and public visibility', async ({ request, page }) => {
  const client = await connectDisposableDatabase();
  const approve = await loginAndApprove(page, request);

  for (const kind of ['projects', 'posts'] as const) {
    const slug = `agent-publication-${kind}-` + randomUUID().slice(0, 13);
    const title = 'Approved publication ' + slug;
    const isProject = kind === 'projects';
    const resource = `/api/agent/v1/${kind}/${slug}/publication`;
    const publicPath = `/${isProject ? 'projects' : 'articles'}/${slug}`;
    const table = isProject ? 'projects' : 'posts';
    const readStatusSql = isProject
      ? 'SELECT published,revision FROM projects WHERE id=$1'
      : 'SELECT published,revision FROM posts WHERE id=$1';
    const deleteSql = isProject ? 'DELETE FROM projects WHERE id=$1' : 'DELETE FROM posts WHERE id=$1';
    const created = isProject
      ? await client.query('INSERT INTO projects (slug,title,description,published) VALUES ($1,$2,$3,false) RETURNING id', [slug, title, 'Private fixture'])
      : await client.query('INSERT INTO posts (slug,title,excerpt,body,published) VALUES ($1,$2,$3,$4,false) RETURNING id', [slug, title, 'Fixture', 'A test publication body']);
    const id = created.rows[0].id as number;

    try {
      expect((await request.get(publicPath)).status()).toBe(404);
      const firstKey = randomUUID();
      const headers = { Authorization: agentKey, 'Idempotency-Key': firstKey, 'If-Match': '"1"' };
      const patch = { published: true };

      const unauthorized = await request.post(resource, { headers, data: patch });
      expect(unauthorized.status()).toBe(403);
      for (const wrong of [{ published: 'true' }, { published: true, title: 'Injected' }, { publishedAt: '2026-10-18T00:00:00Z' }]) {
        const invalid = await request.post('/api/agent/v1/proposals', {
          headers: { ...headers, 'Idempotency-Key': randomUUID() },
          data: { resource, patch: wrong },
        });
        expect(invalid.status()).toBe(422);
      }

      const token = await approve(resource, 1, firstKey, patch);
      const changedBody = await request.post(resource, {
        headers: { ...headers, 'X-Agent-Approval': token },
        data: { published: false },
      });
      expect(changedBody.status()).toBe(403);
      const first = await request.post(resource, {
        headers: { ...headers, 'X-Agent-Approval': token }, data: patch,
      });
      expect(first.status(), await first.text()).toBe(204);
      const retry = await request.post(resource, {
        headers: { ...headers, 'X-Agent-Approval': token }, data: patch,
      });
      expect(retry.status()).toBe(204);
      const updated = await client.query(readStatusSql, [id]);
      expect(updated.rows[0]).toEqual({ published: true, revision: 2 });
      expect((await request.get(publicPath)).status()).toBe(200);

      const stale = await request.post('/api/agent/v1/proposals', {
        headers: { ...headers, 'Idempotency-Key': randomUUID() },
        data: { resource, patch: { published: false } },
      });
      expect(stale.status()).toBe(409);

      const secondKey = randomUUID();
      const secondHeaders = { Authorization: agentKey, 'Idempotency-Key': secondKey, 'If-Match': '"2"' };
      const unpublish = { published: false };
      const secondToken = await approve(resource, 2, secondKey, unpublish);
      const unpublished = await request.post(resource, {
        headers: { ...secondHeaders, 'X-Agent-Approval': secondToken }, data: unpublish,
      });
      expect(unpublished.status(), await unpublished.text()).toBe(204);
      expect((await request.get(publicPath)).status()).toBe(404);
      const after = await client.query(readStatusSql, [id]);
      expect(after.rows[0]).toEqual({ published: false, revision: 3 });
      const history = await client.query(
        'SELECT revision,actor_id,request_id FROM content_changes WHERE entity_type=$1 AND entity_id=$2 ORDER BY revision',
        [table, id],
      );
      expect(history.rows.map((row) => row.revision)).toEqual([1, 2, 3]);
      expect(history.rows.slice(1).map((row) => row.request_id)).toEqual([firstKey, secondKey]);
      expect(history.rows.slice(1).map((row) => row.actor_id)).toEqual(['agent:isolated-e2e', 'agent:isolated-e2e']);
      const sitemap = await request.get('/sitemap.xml');
      expect(await sitemap.text()).not.toContain(publicPath);
    } finally {
      await client.query(deleteSql, [id]);
    }
  }
  await client.end();
});
