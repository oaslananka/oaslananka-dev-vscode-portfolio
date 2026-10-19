import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

test('single owner media facade never accepts public uploads or exposes upstream secret', () => {
  const source = readFileSync(path.join(process.cwd(), 'app/api/agent/v1/media/route.ts'), 'utf8');
  assert.match(source, /isAgentWriteConfigured/);
  assert.match(source, /verifyAgentBearer/);
  assert.match(source, /MAX_REQUEST_BYTES/);
  assert.match(source, /MEDIA_UPLOAD_TOKEN/);
  assert.match(source, /https:\/\/media\.oaslananka\.dev\/v1\/media/);
  assert.match(source, /redirect: 'error'/);
  assert.match(source, /src|url/);
  assert.doesNotMatch(source, /export async function GET/);
});
