import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('root layout advertises llms.txt through the describedby relation', async () => {
  const layout = await readFile(new URL('../app/layout.tsx', import.meta.url), 'utf8');

  assert.match(layout, /<link rel="describedby" href="\/llms\.txt" \/>/);
});
