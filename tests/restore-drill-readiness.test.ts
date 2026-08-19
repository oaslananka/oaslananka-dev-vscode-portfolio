import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(
  new URL('../scripts/test-restore-drill.sh', import.meta.url),
  'utf8',
);

test('restore drill waits for the final PostgreSQL process and query readiness', () => {
  assert.match(source, /source_ready=false/);
  assert.match(source, /cat \/proc\/1\/comm/);
  assert.match(source, /init_process[\s\S]*==[\s\S]*postgres/);
  assert.match(source, /psql[\s\S]*-c 'select 1'/);
  assert.match(source, /Disposable source PostgreSQL did not reach its final ready state/);
});

test('source setup starts only after final readiness succeeds', () => {
  const readiness = source.indexOf('source_ready=true');
  const createRole = source.indexOf("-c 'CREATE ROLE portfolio_source LOGIN'");
  assert.ok(readiness >= 0);
  assert.ok(createRole > readiness);
});
