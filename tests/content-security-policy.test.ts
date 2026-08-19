import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildAdminContentSecurityPolicy,
  buildPublicContentSecurityPolicy,
  createRequestNonce,
} from '../lib/content-security-policy';

test('admin CSP replaces unsafe inline execution with a request nonce', () => {
  const policy = buildAdminContentSecurityPolicy('nonce-value', {
    production: true,
    development: false,
  });

  assert.match(policy, /script-src 'self' 'nonce-nonce-value'/);
  assert.doesNotMatch(policy, /'strict-dynamic'/);
  assert.match(policy, /style-src 'self' 'nonce-nonce-value'/);
  assert.doesNotMatch(policy, /'unsafe-inline'/);
  assert.match(policy, /upgrade-insecure-requests/);
});

test('development admin CSP permits React debugging without unsafe inline', () => {
  const policy = buildAdminContentSecurityPolicy('nonce-value', {
    production: false,
    development: true,
  });

  assert.match(policy, /'unsafe-eval'/);
  assert.doesNotMatch(policy, /'unsafe-inline'/);
  assert.doesNotMatch(policy, /upgrade-insecure-requests/);
});

test('request nonces are unique and CSP-safe', () => {
  const first = createRequestNonce();
  const second = createRequestNonce();

  assert.notEqual(first, second);
  assert.match(first, /^[A-Za-z0-9+/=_-]+$/);
  assert.match(second, /^[A-Za-z0-9+/=_-]+$/);
});

test('admin CSP rejects nonce values that could break the directive', () => {
  assert.throws(
    () =>
      buildAdminContentSecurityPolicy("bad' nonce", {
        production: true,
        development: false,
      }),
    /Invalid CSP nonce/,
  );
});

test('public CSP preserves static rendering compatibility', () => {
  const policy = buildPublicContentSecurityPolicy({
    production: true,
    development: false,
  });

  assert.match(policy, /script-src 'self' 'unsafe-inline'/);
  assert.match(policy, /style-src 'self' 'unsafe-inline'/);
  assert.match(policy, /script-src-attr 'none'/);
  assert.match(policy, /upgrade-insecure-requests/);
  assert.doesNotMatch(policy, /'nonce-/);
});
