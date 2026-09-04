import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('Dependabot is configured for security updates without routine version PRs', () => {
  const config = read('.github/dependabot.yml');
  assert.match(config, /package-ecosystem: ['"]npm['"]/);
  assert.match(config, /open-pull-requests-limit: 0/);
  assert.match(config, /default-days: 7/);
  assert.match(config, /applies-to: security-updates/);
});

test('README and dependency runbook document Renovate and Dependabot ownership accurately', () => {
  for (const content of [read('README.md'), read('docs/operations/dependency-and-static-analysis.md')]) {
    assert.match(content, /Renovate[^\n]*routine dependency/i);
    assert.match(content, /Dependabot[^\n]*security update/i);
  }
});






test('Sonar source scope excludes CI metadata and binary assets', () => {
  const properties = read('sonar-project.properties');
  assert.match(properties, /sonar\.exclusions=.*\.github\/\*\*/);
  assert.match(properties, /sonar\.exclusions=.*\*\*\/\*\.png/);
  assert.match(properties, /sonar\.exclusions=.*\*\*\/\*\.webp/);
  assert.match(properties, /sonar\.exclusions=.*\*\*\/\*\.mp4/);
  assert.match(properties, /sonar\.exclusions=.*\*\*\/\*\.ico/);
});


test('Sonar is advisory and never runs automatically for pushes or pull requests', () => {
  const workflow = read('.github/workflows/sonarcloud.yml');
  assert.doesNotMatch(workflow, /^  push:/m);
  assert.doesNotMatch(workflow, /^  pull_request:/m);
  assert.match(workflow, /^  workflow_dispatch:/m);
  assert.match(workflow, /^  schedule:/m);
  assert.match(workflow, /continue-on-error: true/);
});

test('free required quality checks are documented without Sonar dependency', () => {
  const readme = read('README.md');
  const runbook = read('docs/operations/quality-gate.md');
  for (const content of [readme, runbook]) {
    assert.match(content, /CodeQL/);
    assert.match(content, /Semgrep/);
    assert.match(content, /OSV Scanner/);
    assert.match(content, /sbom/);
    assert.match(content, /production-audit/);
    assert.match(content, /pre-commit/);
    assert.match(content, /visual-regression/);
    assert.match(content, /restore-drill/);
  }
  assert.match(runbook, /SonarQube Cloud is advisory/);
  assert.match(runbook, /not a required status check/);
});

test('repository exposes one-command deterministic local verification', () => {
  const pkg = JSON.parse(read('package.json')) as {
    scripts?: Record<string, string>;
  };
  assert.equal(pkg.scripts?.verify, 'npm run typecheck && npm run lint && npm run test && npm run test:agent-evals');

  for (const content of [
    read('README.md'),
    read('AGENTS.md'),
    read('docs/operations/quality-gate.md'),
  ]) {
    assert.match(content, /npm run verify/);
  }
});

test('Doppler documentation never relies on an implicit directory-scoped config', () => {
  for (const [path, content] of [
    ['README.md', read('README.md')],
    ['AGENTS.md', read('AGENTS.md')],
  ] as const) {
    assert.doesNotMatch(
      content,
      /doppler run -- npm run/,
      `${path} must select a Doppler config explicitly`,
    );
  }

  const safetyText = `${read('README.md')}\n${read('AGENTS.md')}`;
  assert.match(safetyText, /local[^\n]*must not use production services/i);
});

test('fresh-clone bootstrap installs the pinned Node version before use', () => {
  for (const [path, content] of [
    ['README.md', read('README.md')],
    ['AGENTS.md', read('AGENTS.md')],
  ] as const) {
    assert.match(content, /nvm install/, `${path} must handle a missing pinned Node version`);
  }
});

test('CI uses the exact pinned Node toolchain and enforces critical-module coverage thresholds', () => {
  const ci = read('.github/workflows/ci.yml');
  assert.doesNotMatch(ci, /node-version: 22\s*$/m);
  assert.match(ci, /node-version-file: \.node-version/);
  assert.match(ci, /npm run test:coverage/);

  const pkg = JSON.parse(read('package.json')) as { scripts?: Record<string, string> };
  const coverage = pkg.scripts?.['test:coverage'] ?? '';
  assert.match(coverage, /--check-coverage/);
  assert.match(coverage, /--lines=95/);
  assert.match(coverage, /--branches=80/);
  assert.match(coverage, /--functions=95/);
  assert.match(coverage, /--statements=95/);
});

test('security workflow publishes a CycloneDX SBOM and isolates main-only attestation privileges', () => {
  const workflow = read('.github/workflows/security.yml');
  const pkg = JSON.parse(read('package.json')) as { scripts?: Record<string, string> };
  assert.match(pkg.scripts?.sbom ?? '', /npm sbom --sbom-format cyclonedx/);
  assert.match(workflow, /^  sbom:/m);
  assert.match(workflow, /npm run sbom/);
  assert.match(workflow, /sbom\.cdx\.json/);
  assert.match(workflow, /actions\/upload-artifact@/);

  const sbomStart = workflow.indexOf('  sbom:\n');
  const attestStart = workflow.indexOf('  sbom-attestation:\n');
  const preCommitStart = workflow.indexOf('  pre-commit:\n');
  assert.ok(sbomStart >= 0 && attestStart > sbomStart && preCommitStart > attestStart);

  const sbomJob = workflow.slice(sbomStart, attestStart);
  assert.doesNotMatch(sbomJob, /id-token: write/);
  assert.doesNotMatch(sbomJob, /attestations: write/);
  assert.doesNotMatch(sbomJob, /artifact-metadata: write/);
  assert.doesNotMatch(sbomJob, /actions\/attest@/);

  const attestJob = workflow.slice(attestStart, preCommitStart);
  assert.match(attestJob, /needs: sbom/);
  assert.match(attestJob, /github\.event_name == 'push'/);
  assert.match(attestJob, /actions\/download-artifact@3e5f45b2cfb9172054b4087a40e8e0b5a5461e7c # v8\.0\.1/);
  assert.match(attestJob, /actions\/attest@508db95dd578ae2727ebd6217d5ba78e4fbda05d # v4\.2\.1/);
  assert.match(attestJob, /id-token: write/);
  assert.match(attestJob, /attestations: write/);
  assert.match(attestJob, /artifact-metadata: write/);
  assert.match(attestJob, /subject-path: sbom\.cdx\.json/);
});

test('repository governance and operations system-of-record files are present and linked', () => {
  for (const path of [
    'CONTRIBUTING.md',
    'SUPPORT.md',
    '.github/CODEOWNERS',
    'docs/operations/threat-model.md',
    'docs/operations/service-level-objectives.md',
    'docs/decisions/0001-single-nextjs-application.md',
    'docs/operations/release-process.md',
    'evals/agent-tasks.json',
  ]) {
    assert.doesNotThrow(() => read(path), `${path} must exist`);
  }

  const readme = read('README.md');
  assert.match(readme, /CONTRIBUTING\.md/);
  assert.match(readme, /threat-model\.md/);
  assert.match(readme, /service-level-objectives\.md/);
  const pkg = JSON.parse(read('package.json')) as { scripts?: Record<string, string> };
  assert.equal(pkg.scripts?.['test:agent-evals'], 'node scripts/validate-agent-evals.mjs');
});


test('package and lockfile versions stay synchronized for release provenance', () => {
  const pkg = JSON.parse(read('package.json')) as { version: string };
  const lock = JSON.parse(read('package-lock.json')) as { version: string; packages?: Record<string, { version?: string }> };
  assert.equal(lock.version, pkg.version);
  assert.equal(lock.packages?.['']?.version, pkg.version);
  assert.match(read('CHANGELOG.md'), /^## \[Unreleased\]/m);
  assert.match(read('docs/operations/release-process.md'), /annotated `v<version>` tag/);
});
