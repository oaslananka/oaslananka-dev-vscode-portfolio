import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

interface PackageManifest {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  overrides?: Record<string, string>;
}

const read = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const manifest = JSON.parse(read('package.json')) as PackageManifest;
const securityWorkflow = read('.github/workflows/security.yml');

test('production dependency floors remain on patched releases', () => {
  assert.equal(manifest.dependencies.next, '^16.2.12');
  assert.equal(manifest.dependencies['@next/third-parties'], '^16.2.12');
  assert.equal(manifest.dependencies.react, '^19.2.8');
  assert.equal(manifest.dependencies['react-dom'], '^19.2.8');
  assert.equal(manifest.devDependencies['eslint-config-next'], '^16.2.12');
  assert.equal(manifest.overrides?.postcss, '^8.5.26');
  assert.equal(manifest.overrides?.['fast-uri'], '^3.1.7');
  assert.equal(manifest.overrides?.sharp, '0.35.3');
});

test('security workflow blocks high-severity production dependency findings', () => {
  assert.match(securityWorkflow, /npm audit --omit=dev --audit-level=high/);
});

test('Python security tooling stays on OSV-clean pins and safety floors', () => {
  const requirements = read('requirements-security.txt');
  const preCommit = read('.pre-commit-config.yaml');

  assert.match(requirements, /^pre-commit==4\.6\.2$/m);
  assert.match(requirements, /^semgrep==1\.176\.0$/m);
  assert.match(requirements, /^filelock==3\.32\.5$/m);
  assert.match(requirements, /^idna==3\.19$/m);
  assert.match(requirements, /^python-multipart==0\.0\.32$/m);
  assert.match(preCommit, /minimum_pre_commit_version: ['"]4\.6\.2['"]/);
  assert.match(preCommit, /semgrep==1\.176\.0/);
  assert.match(preCommit, /idna==3\.19/);
  assert.match(preCommit, /python-multipart==0\.0\.32/);
  assert.doesNotMatch(securityWorkflow, /python -m pip install semgrep==/);
  assert.match(securityWorkflow, /python -m pip install --requirement requirements-security\.txt/);
});

test('security workflow runs the official OSV reusable workflow from an immutable revision', () => {
  assert.match(securityWorkflow, /^  osv-scanner:$/m);
  assert.match(
    securityWorkflow,
    /google\/osv-scanner-action\/\.github\/workflows\/osv-scanner-reusable\.yml@6e4298ebc4db23e847df9b2e2de2939d6f066c67 # v2\.5\.1/,
  );
  assert.match(securityWorkflow, /actions: read/);
  assert.match(securityWorkflow, /security-events: write/);
  assert.match(securityWorkflow, /--include-git-root/);
  assert.match(securityWorkflow, /--recursive/);
  assert.match(securityWorkflow, /results-file-name: osv-scanner\.sarif/);
});
