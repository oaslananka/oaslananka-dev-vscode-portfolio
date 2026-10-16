import assert from 'node:assert/strict';
import test from 'node:test';

import { ADMIN_CONTENT_LIMITS } from '../lib/admin/limits';
import { isCanonicalSlug } from '../lib/slug-policy';

test('canonical slugs preserve existing lowercase, number, and hyphen format', () => {
  for (const value of ['a', '9', 'a-b', 'abc-123-def', '0a9', 'a'.repeat(ADMIN_CONTENT_LIMITS.slugLength)]) {
    assert.equal(isCanonicalSlug(value), true, value);
  }
  for (const value of ['', '-', 'a-', '-a', 'a--b', 'A', 'a_B', 'a b', 'ç', 'a/../b', 'a.b', 'a\u200bb']) {
    assert.equal(isCanonicalSlug(value), false, value);
  }
});

test('canonical slugs fail closed on oversized untrusted path segments', () => {
  assert.equal(isCanonicalSlug('a'.repeat(ADMIN_CONTENT_LIMITS.slugLength + 1)), false);
  assert.equal(isCanonicalSlug('a-'.repeat(500_000)), false);
});
