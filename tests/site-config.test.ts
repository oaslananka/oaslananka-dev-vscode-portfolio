import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveSiteUrl } from '../lib/site-config';

test('production requires an explicit canonical HTTPS origin', () => {
  assert.throws(
    () => resolveSiteUrl({ NODE_ENV: 'production' }),
    /must be set to the canonical HTTPS origin/,
  );
  assert.throws(
    () =>
      resolveSiteUrl({
        ALLOW_DEFAULT_CONTENT: 'true',
        CI: 'true',
        NODE_ENV: 'production',
      }),
    /must be set to the canonical HTTPS origin/,
  );
  assert.throws(
    () =>
      resolveSiteUrl({
        NEXT_PUBLIC_SITE_URL: 'not a URL',
        NODE_ENV: 'production',
      }),
    /must be an HTTPS origin/,
  );
  assert.throws(
    () =>
      resolveSiteUrl({
        NEXT_PUBLIC_SITE_URL: 'http://example.com',
        NODE_ENV: 'production',
      }),
    /must be an HTTPS origin/,
  );
  assert.throws(
    () =>
      resolveSiteUrl({
        NEXT_PUBLIC_SITE_URL: 'https://example.com/portfolio',
        NODE_ENV: 'production',
      }),
    /without a path/,
  );

  assert.equal(
    resolveSiteUrl({
      NEXT_PUBLIC_SITE_URL: 'https://example.com/',
      NODE_ENV: 'production',
    }),
    'https://example.com',
  );
  assert.equal(
    resolveSiteUrl({
      NEXT_PUBLIC_SITE_URL: 'http://127.0.0.1:3100',
      NODE_ENV: 'production',
    }),
    'http://127.0.0.1:3100',
  );
  assert.equal(
    resolveSiteUrl({
      NEXT_PUBLIC_SITE_URL: 'http://[::1]:3100',
      NODE_ENV: 'production',
    }),
    'http://[::1]:3100',
  );
});

test('development, tests, and previews keep safe fallbacks', () => {
  assert.equal(
    resolveSiteUrl({ NODE_ENV: 'development' }),
    'http://localhost:3000',
  );
  assert.equal(
    resolveSiteUrl({ NODE_ENV: 'test' }),
    'http://localhost:3000',
  );
  assert.equal(
    resolveSiteUrl({
      NODE_ENV: 'production',
      VERCEL_ENV: 'preview',
      VERCEL_PROJECT_PRODUCTION_URL: 'portfolio.example.com',
    }),
    'https://portfolio.example.com',
  );
  assert.equal(
    resolveSiteUrl({
      NODE_ENV: 'development',
      VERCEL_PROJECT_PRODUCTION_URL: 'portfolio.example.com',
    }),
    'http://localhost:3000',
  );
});
