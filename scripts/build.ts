import { spawnSync } from 'node:child_process';

import { buildScriptsForEnvironment } from '../lib/build-policy';
import { getPreviewSourceProvenance, resolveDeploymentEnvironment } from '../lib/deployment-environment';

const deployment = resolveDeploymentEnvironment(process.env);
const scripts = buildScriptsForEnvironment(process.env);

const previewSource = getPreviewSourceProvenance(process.env);
if (previewSource) {
  console.log(
    `[preview-provenance] source=${previewSource.source}; branch_ancestry=${previewSource.branchAncestry}; live_data_parity=${previewSource.liveDataParity}`,
  );
}

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
    shell: process.platform === 'win32',
  });

  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
