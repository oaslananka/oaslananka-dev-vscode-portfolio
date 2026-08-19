import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

interface PackageManifest {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  overrides?: Record<string, string>;
}

const manifest = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
) as PackageManifest;
const securityWorkflow = readFileSync(
  new URL('../.github/workflows/security.yml', import.meta.url),
  'utf8',
);

test('production dependency floors remain on patched releases', () => {
  assert.equal(manifest.dependencies.next, '^16.2.12');
  assert.equal(manifest.dependencies['@next/third-parties'], '^16.2.12');
  assert.equal(manifest.dependencies.react, '^19.2.8');
  assert.equal(manifest.dependencies['react-dom'], '^19.2.8');
  assert.equal(manifest.devDependencies['eslint-config-next'], '^16.2.12');
  assert.equal(manifest.overrides?.postcss, '8.5.18');
  assert.equal(manifest.overrides?.['fast-uri'], '3.1.4');
  assert.equal(manifest.overrides?.sharp, '0.35.3');
});

test('security workflow blocks high-severity production dependency findings', () => {
  assert.match(securityWorkflow, /npm audit --omit=dev --audit-level=high/);
});
