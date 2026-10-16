import { expect, test } from '@playwright/test';

test.skip(process.env.E2E_AGENT_WRITE_TEST === 'true', 'Separate E2E suite verifies explicitly enabled writes.');

const endpoints = [
  '/api/agent/v1/profile',
  '/api/agent/v1/settings',
  '/api/agent/v1/projects/not-a-live-project',
  '/api/agent/v1/posts/not-a-live-article',
];

test('without explicit write configuration every agent PATCH fails closed', async ({ request }) => {
  for (const endpoint of endpoints) {
    const response = await request.patch(endpoint, {
      headers: { 'If-Match': '"1"' },
      data: { title: 'Should never be saved' },
    });
    expect(response.status(), endpoint).toBe(503);
    expect(response.headers()['cache-control']).toContain('no-store');
  }
});


test('proposal workflow is also unavailable without explicit credentials and enablement', async ({ request }) => {
  const created = await request.post('/api/agent/v1/proposals', {
    headers: { 'If-Match': '"1"', 'Idempotency-Key': 'fd42cc2c-948f-44fa-8921-f5aa8c61e5cc' },
    data: { resource: '/api/agent/v1/profile', patch: { role: 'Must not write' } },
  });
  expect(created.status()).toBe(503);
  const status = await request.get('/api/agent/v1/proposals/fd42cc2c-948f-44fa-8921-f5aa8c61e5cc');
  expect(status.status()).toBe(503);
});
