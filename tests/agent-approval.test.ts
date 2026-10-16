import assert from 'node:assert/strict';
import test from 'node:test';

import { AgentWriteInputError } from '../lib/agent-api/write-policy';
import {
  approvalFingerprint,
  issueAgentApproval,
  verifyAgentApproval,
} from '../lib/agent-api/approval';

test('admin approval is signed and bound to exact actor, change, revision, target and request', async () => {
  const previous = process.env.AUTH_SECRET;
  process.env.AUTH_SECRET = 'test-admin-key-' + 'z'.repeat(50);
  const subject = {
    actorId: 'agent:isolated-e2e',
    requestId: '9cd23924-0fc0-4768-8d8d-b4c7d6093105',
    resource: '/api/agent/v1/projects/test-project',
    revision: 1,
    patch: { description: 'Approved value' },
  };
  try {
    const signed = await issueAgentApproval(subject);
    assert.ok((await verifyAgentApproval(signed, subject)).length >= 36);
    for (const change of [
      { actorId: 'agent:other' },
      { requestId: '9cd23924-0fc0-4768-8d8d-b4c7d6093106' },
      { resource: '/api/agent/v1/posts/test-project' },
      { revision: 2 },
      { patch: { description: 'Unapproved value' } },
    ]) {
      await assert.rejects(
        verifyAgentApproval(signed, { ...subject, ...change }),
        AgentWriteInputError,
      );
    }
    assert.notEqual(approvalFingerprint(subject), approvalFingerprint({ ...subject, revision: 2 }));
    assert.equal(
      approvalFingerprint({ ...subject, patch: { a: { y: 2, x: 1 }, b: 3 } }),
      approvalFingerprint({ ...subject, patch: { b: 3, a: { x: 1, y: 2 } } }),
      'JSONB object key reordering must not alter the approved content fingerprint',
    );
    await assert.rejects(verifyAgentApproval(null, subject), AgentWriteInputError);
    await assert.rejects(verifyAgentApproval('not-a-signed-token', subject), AgentWriteInputError);
  } finally {
    if (previous === undefined) delete process.env.AUTH_SECRET;
    else process.env.AUTH_SECRET = previous;
  }
});
