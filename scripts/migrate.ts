import { spawnSync } from 'node:child_process';

import { productionGuardRequired } from '../lib/db/production-target';

const nodeCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const child = productionGuardRequired(process.env)
  ? ['tsx', 'scripts/migrate-production.ts']
  : ['drizzle-kit', 'migrate'];
const result = spawnSync(nodeCommand, child, {
  stdio: 'inherit',
  env: process.env,
  shell: process.platform === 'win32',
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
