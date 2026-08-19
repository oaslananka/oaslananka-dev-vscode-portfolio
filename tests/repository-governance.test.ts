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

test('README documents Renovate and Dependabot ownership accurately', () => {
  const readme = read('README.md');
  assert.match(
    readme,
    /Renovate handles routine dependency updates[\s\S]*Dependabot handles security updates/,
  );
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
    assert.match(content, /production-audit/);
    assert.match(content, /pre-commit/);
    assert.match(content, /visual-regression/);
    assert.match(content, /restore-drill/);
  }
  assert.match(runbook, /SonarQube Cloud is advisory/);
  assert.match(runbook, /not a required status check/);
});
