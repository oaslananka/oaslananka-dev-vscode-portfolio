import assert from 'node:assert/strict';
import test from 'node:test';
import { AgentWriteInputError, isAgentWriteConfigured, parseIfMatchRevision, parseAgentIdempotencyKey, requireCreatePrecondition, readAgentJsonPatch, rejectImplicitPublication } from '../lib/agent-api/write-policy';

const env = { AGENT_CONTENT_WRITE_ENABLED: 'true', AGENT_API_SECRET_KEY: 'read-' + 'x'.repeat(40), AGENT_API_WRITE_KEY: 'write-' + 'y'.repeat(40), AGENT_WRITE_ACTOR_ID: 'agent:portfolio-owner' };

test('agent writes are opt-in with separate strong credentials', () => {
  assert.equal(isAgentWriteConfigured({}), false);
  assert.equal(isAgentWriteConfigured({ ...env, AGENT_CONTENT_WRITE_ENABLED: 'false' }), false);
  assert.equal(isAgentWriteConfigured({ ...env, AGENT_API_WRITE_KEY: env.AGENT_API_SECRET_KEY }), false);
  assert.equal(isAgentWriteConfigured({ ...env, AGENT_API_WRITE_KEY: 'short' }), false);
  assert.equal(isAgentWriteConfigured(env), true);
});

test('If-Match requires a strong bounded revision', () => {
  assert.equal(parseIfMatchRevision('"1"'), 1);
  for (const header of [null, '', '1', 'W/"1"', '*', '"0"', '"01"', '"1","2"', '"2147483647"', '"bad"']) {
    assert.throws(() => parseIfMatchRevision(header), AgentWriteInputError);
  }
});

test('JSON requests are bounded and strict', async () => {
  const req = (body: string, type = 'application/json') => new Request('https://example.test/write', { method: 'PATCH', body, headers: { 'Content-Type': type } });
  assert.deepEqual(await readAgentJsonPatch(req('{"role":"Engineer"}')), { role: 'Engineer' });
  for (const s of ['', '{}', '[]', 'null', '{bad']) await assert.rejects(readAgentJsonPatch(req(s)), AgentWriteInputError);
  await assert.rejects(readAgentJsonPatch(req('{"role":"x"}', 'text/plain')), AgentWriteInputError);
  await assert.rejects(readAgentJsonPatch(req('a'.repeat(256 * 1024 + 1))), AgentWriteInputError);
});

test('publication requires a different deliberate operation', () => {
  assert.doesNotThrow(() => rejectImplicitPublication({ title: 'Updated' }));
  for (const data of [{ published: true }, { published: false }, { publishedAt: null }]) {
    assert.throws(() => rejectImplicitPublication(data), AgentWriteInputError);
  }
});

test('agent requests must carry a stable strict UUIDv4 and actor identifier', () => {
  assert.equal(parseAgentIdempotencyKey('fd42cc2c-948f-44fa-8921-f5aa8c61e5cc'), 'fd42cc2c-948f-44fa-8921-f5aa8c61e5cc');
  for (const value of [null, '', 'abc', 'FD42CC2C-948F-44FA-8921-F5AA8C61E5CC', 'fd42cc2c-948f-14fa-8921-f5aa8c61e5cc']) {
    assert.throws(() => parseAgentIdempotencyKey(value), AgentWriteInputError);
  }
  assert.equal(isAgentWriteConfigured({ ...env, AGENT_WRITE_ACTOR_ID: '' }), false);
});

test('new draft creation requires an exclusive non-overwrite precondition', () => {
  assert.doesNotThrow(() => requireCreatePrecondition('*', null));
  for (const [none, match] of [[null, null], ['"0"', null], ['*', '"1"'], ['*', ''], ['"*"','"1"']] as const) {
    assert.throws(() => requireCreatePrecondition(none, match), AgentWriteInputError);
  }
});
