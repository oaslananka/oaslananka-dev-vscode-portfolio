import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { verifyAgentBearer, verifyAgentContentReader } from '../lib/agent-api/auth';

const secret = 'a'.repeat(64);

test('agent API token validation requires a configured high-entropy-length secret', () => {
  assert.equal(verifyAgentBearer(`Bearer ${secret}`, undefined), false);
  assert.equal(verifyAgentBearer(`Bearer ${secret}`, 'too-short'), false);
  assert.equal(verifyAgentBearer(`Bearer ${secret}`, secret), true);
  assert.equal(verifyAgentBearer(`Bearer ${'b'.repeat(64)}`, secret), false);
});

test('agent API bearer parser rejects alternate schemes and malformed headers', () => {
  for (const header of [null, '', secret, `bearer ${secret}`, `Bearer  ${secret}`, `Bearer ${secret} `, `Bearer ${secret}\nBearer ${secret}`, `Bearer ${'a'.repeat(8200)}`]) {
    assert.equal(verifyAgentBearer(header, secret), false);
  }
});

test('one write credential can read only when the write facility is enabled', () => {
  const reader = 'r'.repeat(64);
  const writer = 'w'.repeat(64);
  assert.equal(verifyAgentContentReader('Bearer ' + reader, reader, writer, false), true);
  assert.equal(verifyAgentContentReader('Bearer ' + writer, reader, writer, false), false);
  assert.equal(verifyAgentContentReader('Bearer ' + writer, reader, writer, true), true);
  assert.equal(verifyAgentContentReader('Bearer ' + reader, reader, writer, true), true);
  assert.equal(verifyAgentContentReader('Bearer ' + 'x'.repeat(64), reader, writer, true), false);
});

test('all agent API reads pass through the same authentication gate', () => {
  const paths = [
    'context/route.ts',
    'profile/route.ts',
    'settings/route.ts',
    'projects/route.ts',
    'projects/[slug]/route.ts',
    'posts/route.ts',
    'posts/[slug]/route.ts',
  ];
  for (const file of paths) {
    const source = readFileSync(path.join(process.cwd(), 'app/api/agent/v1', file), 'utf8');
    assert.match(source, /return agentRead\(request,/);
    assert.match(source, /export const dynamic = 'force-dynamic'/);
  }
});

test('response layer fails closed and always sets private, non-indexed headers', () => {
  const source = readFileSync(path.join(process.cwd(), 'lib/agent-api/response.ts'), 'utf8');
  assert.match(source, /'Cache-Control': 'private, no-store'/);
  assert.match(source, /'X-Robots-Tag': 'noindex, nofollow'/);
  assert.match(source, /if \(!db\)/);
  assert.match(source, /verifyAgentContentReader\(/);
});
