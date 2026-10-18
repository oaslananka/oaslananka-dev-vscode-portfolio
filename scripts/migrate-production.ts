import { spawnSync } from 'node:child_process';

const nodeCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const verification = spawnSync(
  nodeCommand,
  ['tsx', 'scripts/verify-release-target.ts'],
  { stdio: 'inherit', env: process.env, shell: process.platform === 'win32' },
);
if (verification.error) throw verification.error;
if (verification.status !== 0) {
  process.exit(verification.status ?? 2);
}

const migration = spawnSync(
  nodeCommand,
  ['drizzle-kit', 'migrate'],
  { stdio: 'inherit', env: process.env, shell: process.platform === 'win32' },
);
if (migration.error) throw migration.error;
process.exit(migration.status ?? 1);
