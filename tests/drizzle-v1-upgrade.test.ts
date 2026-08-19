import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const manifest = JSON.parse(read('package.json')) as {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  scripts: Record<string, string>;
};

const expectedMigrationHashes = [
  '87ffd8a1573930f0d2f83578bfc16569287dc60ff384da89d4681fabc6b9a4ed',
  '97296afcbd8dfc9e26babd5e9ab846036ddd6a00da7d3969b0e20a606040c4e4',
  'f5c009878d9b47c0db44b0fad1164eb3d121e181b38c7416f2f27447c9777af2',
  'fd669c57df828cbc68f766b3e64af1e8248b315bde67f14770ece2bcd614e29d',
  '87015a828dc132ee8fdc839d1f64769656b1c2b54ff9da3ccd5488e8fa93d412',
  'b320df01860d3f812e8f8282792d43a280df946fc3d3c42b41af531779622507',
  '342cb1330f6b6c5012d193f0a562a92a02135a6366ae45f471551d3b3b143efc',
  '4c30b16a4fb173bd626a2da8358b6612ccc14c8f33d1eeeb93f7279fbdeb4002',
  '04a9b3724fc65cc37c03c2709e807477eee2711ec01c78d1a078ceef928d2c95',
  '199062259c693c1e7b5baffbdcd3a2cc8c30eb6b2bead37916c6994e3413c18c',
];

test('Drizzle v1 RC packages are paired and legacy esbuild loaders are absent', () => {
  assert.equal(manifest.dependencies['drizzle-orm'], '1.0.0-rc.4');
  assert.equal(manifest.devDependencies['drizzle-kit'], '1.0.0-rc.4');
  const lockfile = read('package-lock.json');
  assert.doesNotMatch(lockfile, /@esbuild-kit\/esm-loader/);
  assert.doesNotMatch(lockfile, /@esbuild-kit\/core-utils/);
});

test('v1 driver construction does not pass the removed schema config', () => {
  const database = read('lib/db/index.ts');
  const seed = read('lib/db/seed.ts');
  assert.match(database, /drizzleNodePostgres\(\{ client: pool \}\)/);
  assert.match(database, /drizzleNeon\(\{ client: neon\(url\) \}\)/);
  assert.match(seed, /drizzle\(\{ client: neon\(url\) \}\)/);
  assert.doesNotMatch(database, /drizzle(?:NodePostgres|Neon)\([^)]*schema/);
});

test('migration v3 conversion preserves every SQL file byte-for-byte', () => {
  const migrationsRoot = new URL('../lib/db/migrations/', import.meta.url);
  const directories = readdirSync(migrationsRoot)
    .filter((name) => statSync(new URL(name, migrationsRoot)).isDirectory())
    .sort();

  assert.equal(directories.length, expectedMigrationHashes.length);
  assert.equal(directories.some((name) => name === 'meta'), false);

  const actualHashes = directories.map((directory) =>
    createHash('sha256')
      .update(read(`lib/db/migrations/${directory}/migration.sql`))
      .digest('hex'),
  );
  assert.deepEqual(actualHashes, expectedMigrationHashes);
});

test('Drizzle config pins the legacy migration history location', () => {
  const config = read('drizzle.config.ts');
  assert.match(config, /migrations:\s*\{[\s\S]*table:\s*'__drizzle_migrations'/);
  assert.match(config, /migrations:\s*\{[\s\S]*schema:\s*'drizzle'/);
});

test('CI verifies legacy migration-table compatibility before normal migrations', () => {
  const workflow = read('.github/workflows/ci.yml');
  assert.equal(manifest.scripts['test:drizzle-upgrade'], 'tsx scripts/test-drizzle-v1-upgrade.ts');
  assert.match(workflow, /name: Verify Drizzle v1 legacy migration compatibility/);
  assert.match(workflow, /npm run test:drizzle-upgrade/);
  assert.match(read('scripts/test-drizzle-v1-upgrade.ts'), /__drizzle_migrations/);
  assert.match(
    read('scripts/test-drizzle-v1-upgrade.ts'),
    /execFileSync\('npx', \['drizzle-kit', 'migrate'\]/,
  );
  assert.match(
    read('scripts/test-drizzle-v1-upgrade.ts'),
    /DATABASE_URL_UNPOOLED:\s*fixtureUrl\.toString\(\)/,
  );
  assert.match(
    read('scripts/test-drizzle-v1-upgrade.ts'),
    /1_783_728_271_717/,
  );
  assert.match(
    read('scripts/test-drizzle-v1-upgrade.ts'),
    /created_at::text AS created_at/,
  );
});
