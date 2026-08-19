import assert from 'node:assert/strict';
import test from 'node:test';

import {
  INDEXNOW_KEY,
  INDEXNOW_KEY_PATH,
  buildIndexNowPayload,
  notifyIndexNow,
} from '../lib/indexnow';

const siteUrl = 'https://www.example.com';

test('IndexNow payload contains canonical, deduplicated same-origin URLs', () => {
  const payload = buildIndexNowPayload(
    [
      '/projects/example',
      '/projects/example#details',
      'https://www.example.com/articles/example',
    ],
    siteUrl,
  );

  assert.deepEqual(payload, {
    host: 'www.example.com',
    key: INDEXNOW_KEY,
    keyLocation: `${siteUrl}${INDEXNOW_KEY_PATH}`,
    urlList: [
      'https://www.example.com/projects/example',
      'https://www.example.com/articles/example',
    ],
  });
});

test('IndexNow payload rejects URLs belonging to another origin', () => {
  assert.throws(
    () => buildIndexNowPayload(['https://evil.example/path'], siteUrl),
    /must belong to/,
  );
});

test('IndexNow notification is disabled for local environments', async () => {
  const result = await notifyIndexNow(['/projects/example'], 'http://127.0.0.1:3100');

  assert.deepEqual(result, {
    submitted: false,
    urlCount: 1,
    reason: 'disabled',
  });
});

test('IndexNow disable flag is case-insensitive in production', async () => {
  let calls = 0;
  const fetcher: typeof fetch = async () => {
    calls += 1;
    return new Response(null, { status: 202 });
  };

  const result = await notifyIndexNow(['/projects/example'], siteUrl, {
    environment: {
      NODE_ENV: 'production',
      INDEXNOW_DISABLED: 'TRUE',
    },
    fetcher,
  });

  assert.equal(result.reason, 'disabled');
  assert.equal(calls, 0);
});

test('IndexNow is disabled for preview deployments even with a public HTTPS URL', async () => {
  let calls = 0;
  const fetcher: typeof fetch = async () => {
    calls += 1;
    return new Response(null, { status: 202 });
  };

  const result = await notifyIndexNow(['/projects/example'], siteUrl, {
    environment: { NODE_ENV: 'production', VERCEL_ENV: 'preview' },
    fetcher,
  });

  assert.deepEqual(result, {
    submitted: false,
    urlCount: 1,
    reason: 'disabled',
  });
  assert.equal(calls, 0);
});

test('IndexNow is disabled for test deployments even with a public HTTPS URL', async () => {
  let calls = 0;
  const fetcher: typeof fetch = async () => {
    calls += 1;
    return new Response(null, { status: 202 });
  };

  const result = await notifyIndexNow(['/projects/example'], siteUrl, {
    environment: { NODE_ENV: 'test' },
    fetcher,
  });

  assert.equal(result.reason, 'disabled');
  assert.equal(calls, 0);
});

test('IndexNow retries transient responses and preserves one payload', async () => {
  const statuses = [429, 503, 202];
  const bodies: string[] = [];
  const fetcher: typeof fetch = async (_input, init) => {
    bodies.push(String(init?.body ?? ''));
    return new Response(null, { status: statuses.shift() ?? 202 });
  };

  const result = await notifyIndexNow(['/projects/example'], siteUrl, {
    environment: { NODE_ENV: 'production' },
    fetcher,
    retryDelaysMs: [0, 0, 0],
  });

  assert.equal(result.submitted, true);
  assert.equal(result.status, 202);
  assert.equal(result.attempts, 3);
  assert.equal(bodies.length, 3);
  assert.equal(new Set(bodies).size, 1);
});

test('IndexNow performs three retries after network failures', async () => {
  let calls = 0;
  const fetcher: typeof fetch = async () => {
    calls += 1;
    throw new Error('temporary network failure');
  };

  const originalConsoleError = console.error;
  console.error = () => undefined;
  try {
    const result = await notifyIndexNow(['/projects/example'], siteUrl, {
      environment: { NODE_ENV: 'production' },
      fetcher,
      retryDelaysMs: [0, 0, 0],
    });

    assert.equal(result.submitted, false);
    assert.equal(result.reason, 'failed');
    assert.equal(result.attempts, 4);
    assert.equal(calls, 4);
  } finally {
    console.error = originalConsoleError;
  }
});
