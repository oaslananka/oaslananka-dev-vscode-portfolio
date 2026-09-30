import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

interface PackageManifest {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  overrides?: Record<string, string>;
}

type VersionTuple = readonly [number, number, number];

const read = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const manifest = JSON.parse(read('package.json')) as PackageManifest;
const securityWorkflow = read('.github/workflows/security.yml');

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

test('Python CI tooling is wheel-only and hash locked', () => {
  const requirements = read('requirements-security.txt');
  const preCommit = read('.pre-commit-config.yaml');

  assert.match(requirements, /^pre-commit==4\.6\.2\s+\\/m);
  assert.match(requirements, /^virtualenv==21\.7\.13\s+\\/m);
  assert.match(requirements, /^filelock==3\.32\.5\s+\\/m);
  assert.match(requirements, /--hash=sha256:/);
  assert.match(preCommit, /minimum_pre_commit_version: ['"]4\.6\.2['"]/);
  assert.doesNotMatch(preCommit, /id: semgrep/);
  assert.match(
    securityWorkflow,
    /python -m pip install --only-binary=:all: --require-hashes --requirement requirements-security\.txt/,
  );
});

test('Semgrep runs from an immutable official container image', () => {
  assert.doesNotMatch(securityWorkflow, /python -m pip install semgrep/);
  assert.match(
    securityWorkflow,
    /semgrep\/semgrep@sha256:32e459968daabe7ab86968184a29109b9564aa00392401156f9788452b42786b/,
  );
  assert.match(securityWorkflow, /--entrypoint semgrep/);
  assert.match(securityWorkflow, /--sarif/);
});

test('security workflow runs the official OSV reusable workflow from an immutable revision', () => {
  assert.match(securityWorkflow, /^  osv-scanner:$/m);
  assert.match(
    securityWorkflow,
    /google\/osv-scanner-action\/\.github\/workflows\/osv-scanner-reusable\.yml@a345acffa64b0eaede81a3d9aae6141214d9c8fc # v2\.6\.0/,
  );
  assert.match(securityWorkflow, /actions: read/);
  assert.match(securityWorkflow, /security-events: write/);
  assert.match(securityWorkflow, /--include-git-root/);
  assert.match(securityWorkflow, /--recursive/);
  assert.match(securityWorkflow, /results-file-name: osv-scanner\.sarif/);
});

test('main-only SBOM attestation uses isolated write permissions', () => {
  const sbomStart = securityWorkflow.indexOf('  sbom:\n');
  const attestStart = securityWorkflow.indexOf('  sbom-attestation:\n');
  const preCommitStart = securityWorkflow.indexOf('  pre-commit:\n');
  assert.ok(sbomStart >= 0 && attestStart > sbomStart && preCommitStart > attestStart);

  const sbomJob = securityWorkflow.slice(sbomStart, attestStart);
  assert.doesNotMatch(sbomJob, /id-token: write/);
  assert.doesNotMatch(sbomJob, /attestations: write/);

  const attestJob = securityWorkflow.slice(attestStart, preCommitStart);
  assert.match(attestJob, /needs: sbom/);
  assert.match(attestJob, /github\.event_name == 'push'/);
  assert.match(attestJob, /id-token: write/);
  assert.match(attestJob, /attestations: write/);
  assert.match(attestJob, /artifact-metadata: write/);
  assert.match(attestJob, /subject-path: sbom\.cdx\.json/);
});
