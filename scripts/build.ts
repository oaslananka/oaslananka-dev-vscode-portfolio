import { spawnSync } from 'node:child_process';

import { buildScriptsForEnvironment } from '../lib/build-policy';
import { resolveDeploymentEnvironment } from '../lib/deployment-environment';

const deployment = resolveDeploymentEnvironment(process.env);
const scripts = buildScriptsForEnvironment(process.env);

if (!deployment.isProduction) {
  console.log(
    `[build] ${deployment.kind} deployment: production database preflight skipped; CI validates migrations against disposable PostgreSQL.`,
  );
}

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
for (const script of scripts) {
  const result = spawnSync(npmCommand, ['run', script], {
    env: process.env,
    stdio: 'inherit',
  });

  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
