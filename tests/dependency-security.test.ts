import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

interface PackageManifest {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  overrides?: Record<string, string>;
}

type VersionTuple = readonly [number, number, number];

const manifest = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
) as PackageManifest;
const securityWorkflow = readFileSync(
  new URL('../.github/workflows/security.yml', import.meta.url),
  'utf8',
);

function parseDeclaredMinimum(
  range: string | undefined,
  label: string,
): VersionTuple {
  assert.ok(range, `${label} must be declared`);

  const match = /^(?:\^|~|>=)?(\d+)\.(\d+)\.(\d+)$/.exec(range.trim());
  assert.ok(
    match,
    `${label} must use an exact version or a simple semver floor; received ${range}`,
  );

  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function compareVersions(left: VersionTuple, right: VersionTuple): number {
  for (let index = 0; index < left.length; index += 1) {
    const delta = left[index] - right[index];
    if (delta !== 0) return delta;
  }

  return 0;
}

function assertAtLeast(
  range: string | undefined,
  minimum: string,
  label: string,
): void {
  const actual = parseDeclaredMinimum(range, label);
  const floor = parseDeclaredMinimum(minimum, `${label} security floor`);

  assert.ok(
    compareVersions(actual, floor) >= 0,
    `${label} ${range} is below the required floor ${minimum}`,
  );
}

test('production dependency ranges remain at or above audited floors', () => {
  assertAtLeast(manifest.dependencies.next, '16.3.3', 'next');
  assertAtLeast(
    manifest.dependencies['@next/third-parties'],
    '16.2.12',
    '@next/third-parties',
  );
  assertAtLeast(manifest.dependencies.react, '19.2.8', 'react');
  assertAtLeast(manifest.dependencies['react-dom'], '19.2.8', 'react-dom');
  assertAtLeast(
    manifest.devDependencies['eslint-config-next'],
    '16.2.12',
    'eslint-config-next',
  );
  assertAtLeast(manifest.overrides?.postcss, '8.5.26', 'postcss');
  assertAtLeast(manifest.overrides?.['fast-uri'], '3.1.7', 'fast-uri');
  assertAtLeast(manifest.overrides?.sharp, '0.35.4', 'sharp');
});

test('security workflow blocks high-severity production dependency findings', () => {
  assert.match(securityWorkflow, /npm audit --omit=dev --audit-level=high/);
});
