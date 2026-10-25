import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PERSISTENT_PROPOSAL_EXPIRY,
  isPersistentProposalExpiry,
} from '../lib/agent-api/proposal-expiration';

test('new owner approvals do not expire in normal use and older timed-out requests stay distinct', () => {
  assert.equal(PERSISTENT_PROPOSAL_EXPIRY.toISOString(), '9999-12-31T23:59:59.000Z');
  assert.ok(PERSISTENT_PROPOSAL_EXPIRY.getTime() > Date.now());
  assert.equal(isPersistentProposalExpiry(new Date(PERSISTENT_PROPOSAL_EXPIRY)), true);
  assert.equal(isPersistentProposalExpiry(new Date('2026-10-19T14:05:00.000Z')), false);
});
