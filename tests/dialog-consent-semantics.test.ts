import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('command palette uses the native dialog element', () => {
  const source = read('components/CommandPalette.tsx');
  assert.match(source, /useRef<HTMLDialogElement>/);
  assert.match(source, /<dialog[\s\S]*aria-label="Command palette"/);
  assert.match(source, /\.showModal\(\)/);
  assert.doesNotMatch(source, /role="presentation"/);
  assert.doesNotMatch(source, /role="dialog"/);
  assert.match(source, /<output className=\{styles\.noResults\}/);
});

test('privacy panel handles Escape outside the non-interactive section', () => {
  const source = read('components/ConsentManager.tsx');
  assert.match(source, /window\.addEventListener\('keydown', handleSettingsKeyDown\)/);
  assert.match(source, /window\.removeEventListener\('keydown', handleSettingsKeyDown\)/);
  assert.doesNotMatch(source, /<section[\s\S]{0,260}onKeyDown=/);
  assert.doesNotMatch(source, /<section[\s\S]{0,300}role="region"/);
});
