import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import test from 'node:test';

import { DEFAULT_THEME, THEME_KEYS } from '../lib/themes';

const read = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('theme bootstrap is an external versioned script with curated themes', () => {
  const layout = read('app/layout.tsx');
  const bootstrap = read('public/theme-init.v1.js');

  assert.doesNotMatch(layout, /dangerouslySetInnerHTML/);
  assert.match(layout, /src="\/theme-init\.v1\.js"/);
  assert.match(layout, /strategy="beforeInteractive"/);
  assert.match(layout, /data-default-theme=/);
  assert.match(
    bootstrap,
    new RegExp(
      JSON.stringify(THEME_KEYS).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
    ),
  );
  assert.match(bootstrap, new RegExp(JSON.stringify(DEFAULT_THEME)));
});

test('CSP blocks inline script attributes and caches the versioned bootstrap', () => {
  const config = read('next.config.ts');
  const assets = read('lib/static-assets.ts');
  assert.match(config, /buildPublicContentSecurityPolicy/);
  assert.match(config, /source: THEME_INIT_SCRIPT_PATH/);
  assert.match(assets, /theme-init\.v1\.js/);
  assert.match(assets, /public, max-age=31536000, immutable/);
});

test('public CSP uses the deployment resolver through the shared builder', () => {
  const config = read('next.config.ts');
  const policy = read('lib/content-security-policy.ts');

  assert.match(
    config,
    /import \{ buildPublicContentSecurityPolicy \} from '\.\/lib\/content-security-policy';/,
  );
  assert.doesNotMatch(
    config,
    /process\.env\.NODE_ENV === ['"]production['"]/,
  );
  assert.match(policy, /resolveDeploymentEnvironment\(\)/);
  assert.match(
    policy,
    /production \? \['upgrade-insecure-requests'\] : \[\]/,
  );
});

test('admin proxy forwards nonce CSP without making the root layout dynamic', () => {
  const proxy = read('proxy.ts');
  const layout = read('app/layout.tsx');

  assert.match(proxy, /createRequestNonce/);
  assert.match(proxy, /buildAdminContentSecurityPolicy/);
  assert.match(proxy, /requestHeaders\.set\('x-nonce', nonce\)/);
  assert.match(
    proxy,
    /requestHeaders\.set\('Content-Security-Policy', policy\)/,
  );
  assert.match(
    proxy,
    /response\.headers\.set\('Content-Security-Policy', context\.policy\)/,
  );
  assert.match(proxy, /request: \{ headers: context\.requestHeaders \}/);
  assert.doesNotMatch(layout, /from 'next\/headers'/);
  assert.doesNotMatch(layout, /await headers\(\)/);
});

test('theme bootstrap applies saved, configured, and safe fallback themes', () => {
  const sourceUrl = new URL('../public/theme-init.v1.js', import.meta.url);
  const source = readFileSync(sourceUrl, 'utf8');

  const run = (savedTheme: string | null, configuredDefault: string) => {
    const dataset: Record<string, string> = { defaultTheme: configuredDefault };
    vm.runInNewContext(
      source,
      {
        document: { documentElement: { dataset } },
        localStorage: { getItem: () => savedTheme },
      },
      { filename: fileURLToPath(sourceUrl) },
    );
    return dataset.theme;
  };

  assert.equal(run('dracula', 'nord'), 'dracula');
  assert.equal(run('not-allowed', 'nord'), 'nord');
  assert.equal(run(null, 'not-allowed'), DEFAULT_THEME);
});

test('theme bootstrap remains best-effort when browser storage fails', () => {
  const sourceUrl = new URL('../public/theme-init.v1.js', import.meta.url);
  const dataset: Record<string, string> = { defaultTheme: 'nord' };
  vm.runInNewContext(
    readFileSync(sourceUrl, 'utf8'),
    {
      document: { documentElement: { dataset } },
      localStorage: {
        getItem: () => {
          throw new Error('storage unavailable');
        },
      },
    },
    { filename: fileURLToPath(sourceUrl) },
  );
  assert.equal(dataset.theme, undefined);
});

test('coverage policy includes the public theme bootstrap', async () => {
  const packageJson = JSON.parse(read('package.json')) as {
    scripts: Record<string, string>;
  };
  assert.match(
    packageJson.scripts['test:coverage'],
    /--include='public\/theme-init\.v1\.js'/,
  );
});
