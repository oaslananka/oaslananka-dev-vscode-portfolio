import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('SEO response matchers are awaited', () => {
  const source = read('e2e/seo.spec.ts');
  assert.match(
    source,
    /await expect\(await request\.get\('\/privacy'\)\)\.toBeOK\(\);/,
  );
  assert.match(
    source,
    /await expect\(await request\.get\('\/glossary'\)\)\.toBeOK\(\);/,
  );
});

test('terminal focus uses a native control instead of a clickable container', () => {
  const source = read('components/Terminal.tsx');
  assert.match(source, /aria-label="Focus terminal command"/);
  assert.doesNotMatch(source, /className=\{styles\.body\}[\s\S]{0,160}onClick=/);
});

test('site error boundary does not shadow the global Error constructor', () => {
  const source = read('app/(site)/error.tsx');
  assert.match(source, /export default function SiteError\(/);
  assert.doesNotMatch(source, /export default function Error\(/);
});
