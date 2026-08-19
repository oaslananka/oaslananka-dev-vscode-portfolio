import assert from 'node:assert/strict';
import test from 'node:test';

import {
  allowsBundledDefaultContent,
  isPreviewDeployment,
  isProductionDeployment,
  resolveDeploymentEnvironment,
} from '../lib/deployment-environment';
import { resolveRateLimitHmacSecret } from '../lib/rate-limit-secret';

test('deployment resolver classifies provider-neutral development and test', () => {
  assert.equal(resolveDeploymentEnvironment({}).kind, 'development');
  assert.equal(
    resolveDeploymentEnvironment({ NODE_ENV: 'development' }).kind,
    'development',
  );
  assert.equal(resolveDeploymentEnvironment({ NODE_ENV: 'test' }).kind, 'test');
});

test('deployment resolver treats non-Vercel NODE_ENV production as production', () => {
  const deployment = resolveDeploymentEnvironment({ NODE_ENV: 'production' });

  assert.deepEqual(deployment, {
    kind: 'production',
    provider: 'generic',
    isProduction: true,
    isPreview: false,
    isDevelopment: false,
    isTest: false,
  });
  assert.equal(isProductionDeployment({ NODE_ENV: 'production' }), true);
});

test('VERCEL_ENV is authoritative for preview and production deployments', () => {
  const preview = resolveDeploymentEnvironment({
    NODE_ENV: 'production',
    VERCEL_ENV: 'preview',
  });
  const production = resolveDeploymentEnvironment({
    NODE_ENV: 'production',
    VERCEL_ENV: 'production',
  });
  const development = resolveDeploymentEnvironment({
    NODE_ENV: 'development',
    VERCEL_ENV: 'development',
  });

  assert.equal(preview.kind, 'preview');
  assert.equal(preview.provider, 'vercel');
  assert.equal(preview.isPreview, true);
  assert.equal(isPreviewDeployment({ VERCEL_ENV: 'preview' }), true);
  assert.equal(production.kind, 'production');
  assert.equal(development.kind, 'development');
});

test('deployment resolver rejects malformed environment values', () => {
  assert.throws(
    () => resolveDeploymentEnvironment({ NODE_ENV: 'staging' }),
    /Unsupported NODE_ENV/,
  );
  assert.throws(
    () => resolveDeploymentEnvironment({ VERCEL_ENV: 'staging' }),
    /Unsupported VERCEL_ENV/,
  );
  assert.throws(
    () => resolveDeploymentEnvironment({ VERCEL_ENV: ' preview ' }),
    /Unsupported VERCEL_ENV/,
  );
});

test('bundled content requires explicit development or test opt-in', () => {
  assert.equal(
    allowsBundledDefaultContent({
      NODE_ENV: 'development',
      ALLOW_DEFAULT_CONTENT: 'true',
    }),
    true,
  );
  assert.equal(
    allowsBundledDefaultContent({
      NODE_ENV: 'test',
      ALLOW_DEFAULT_CONTENT: 'true',
    }),
    true,
  );
  assert.equal(
    allowsBundledDefaultContent({
      NODE_ENV: 'development',
      ALLOW_DEFAULT_CONTENT: 'TRUE',
    }),
    true,
  );
  assert.equal(
    allowsBundledDefaultContent({
      NODE_ENV: 'production',
      ALLOW_DEFAULT_CONTENT: 'true',
    }),
    false,
  );
  assert.equal(
    allowsBundledDefaultContent({
      NODE_ENV: 'production',
      VERCEL_ENV: 'preview',
      ALLOW_DEFAULT_CONTENT: 'true',
    }),
    false,
  );
  assert.equal(
    allowsBundledDefaultContent({ NODE_ENV: 'development' }),
    false,
  );
});

test('rate-limit HMAC secret is dedicated and mandatory in every production deployment', () => {
  const configured = 'dedicated-rate-limit-secret-at-least-32-bytes';

  assert.equal(
    resolveRateLimitHmacSecret({
      NODE_ENV: 'production',
      RATE_LIMIT_HMAC_SECRET: configured,
    }),
    configured,
  );
  assert.throws(
    () =>
      resolveRateLimitHmacSecret({
        NODE_ENV: 'production',
        AUTH_SECRET: 'auth-secret-at-least-32-bytes-long',
      }),
    /must be set for a production deployment/,
  );
  assert.throws(
    () =>
      resolveRateLimitHmacSecret({
        NODE_ENV: 'production',
        VERCEL_ENV: 'production',
      }),
    /must be set for a production deployment/,
  );
});

test('non-production rate limiting may use auth or development fallback secrets', () => {
  const authSecret = 'auth-secret-at-least-32-bytes-long';

  assert.equal(
    resolveRateLimitHmacSecret({
      NODE_ENV: 'production',
      VERCEL_ENV: 'preview',
      AUTH_SECRET: authSecret,
    }),
    authSecret,
  );
  assert.throws(
    () =>
      resolveRateLimitHmacSecret({
        NODE_ENV: 'development',
        AUTH_SECRET: 'too-short',
      }),
    /AUTH_SECRET must be at least 32 bytes/,
  );
  assert.ok(
    Buffer.byteLength(
      resolveRateLimitHmacSecret({ NODE_ENV: 'development' }),
      'utf8',
    ) >= 32,
  );
  assert.throws(
    () =>
      resolveRateLimitHmacSecret({
        NODE_ENV: 'development',
        RATE_LIMIT_HMAC_SECRET: 'too-short',
      }),
    /RATE_LIMIT_HMAC_SECRET must be at least 32 bytes/,
  );
});

test('database preflight runs only for production builds', async () => {
  const { buildScriptsForEnvironment } = await import('../lib/build-policy');

  assert.deepEqual(
    buildScriptsForEnvironment({ NODE_ENV: 'production' }),
    ['db:preflight', 'build:next'],
  );
  assert.deepEqual(
    buildScriptsForEnvironment({
      NODE_ENV: 'production',
      VERCEL_ENV: 'production',
    }),
    ['db:preflight', 'build:next'],
  );
  assert.deepEqual(
    buildScriptsForEnvironment({
      NODE_ENV: 'production',
      VERCEL_ENV: 'preview',
    }),
    ['build:next'],
  );
  assert.deepEqual(
    buildScriptsForEnvironment({ NODE_ENV: 'test' }),
    ['build:next'],
  );
});
