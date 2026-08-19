import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('Playwright exposes Chromium, Firefox smoke, and WebKit smoke projects', () => {
  const config = read('playwright.config.ts');
  assert.match(config, /name: 'chromium'/);
  assert.match(config, /name: 'chromium-visual'/);
  assert.match(config, /testIgnore: \/visual\\\.spec\\\.ts\//);
  assert.match(config, /testMatch: \/visual\\\.spec\\\.ts\//);
  assert.match(config, /name: 'firefox-smoke'/);
  assert.match(config, /name: 'webkit-smoke'/);
  assert.match(config, /PLAYWRIGHT_USE_SYSTEM_CHROME/);
});

test('package scripts separate required Chromium and scheduled browser matrix runs', () => {
  const manifest = JSON.parse(read('package.json')) as {
    scripts: Record<string, string>;
  };
  assert.equal(manifest.scripts['test:e2e'], 'playwright test --project=chromium');
  assert.equal(
    manifest.scripts['test:e2e:visual'],
    'playwright test --project=chromium-visual',
  );
  assert.match(manifest.scripts['test:e2e:matrix'], /firefox-smoke/);
  assert.match(manifest.scripts['test:e2e:matrix'], /webkit-smoke/);
});

test('scheduled browser workflow installs Firefox and WebKit', () => {
  const workflow = read('.github/workflows/browser-matrix.yml');
  assert.match(workflow, /schedule:/);
  assert.match(workflow, /E2E_GITHUB_FIXTURE: 'true'/);
  assert.match(workflow, /npm ci --ignore-scripts/);
  assert.match(
    workflow,
    /\.\/node_modules\/\.bin\/playwright install --with-deps chromium firefox webkit/,
  );
  assert.match(workflow, /npm run test:e2e:visual/);
  assert.match(workflow, /npm run test:e2e:matrix/);
});


test('CI isolates visual baselines from the mutable database E2E job', () => {
  const workflow = read('.github/workflows/ci.yml');
  assert.match(workflow, /visual-regression:/);
  assert.match(workflow, /VERCEL_ENV: development/);
  assert.match(workflow, /ALLOW_DEFAULT_CONTENT: 'true'/);
  assert.match(workflow, /npm ci --ignore-scripts/);
  assert.match(
    workflow,
    /\.\/node_modules\/\.bin\/playwright install --with-deps chromium/,
  );
  assert.match(workflow, /npm run test:e2e:visual/);
});
