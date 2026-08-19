import assert from 'node:assert/strict';
import test from 'node:test';

import { hasValidBearerToken } from '../lib/cron-auth';

test('cron bearer authentication requires an exact configured secret', () => {
  const secret = 'cron-secret-with-at-least-32-bytes';

  assert.equal(hasValidBearerToken(`Bearer ${secret}`, secret), true);
  assert.equal(hasValidBearerToken('Bearer wrong-secret', secret), false);
  assert.equal(hasValidBearerToken(`Basic ${secret}`, secret), false);
  assert.equal(hasValidBearerToken(null, secret), false);
  assert.equal(hasValidBearerToken(`Bearer ${secret}`, undefined), false);
});
