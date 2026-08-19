import {
  resolveDeploymentEnvironment,
  type DeploymentEnvironmentVariables,
} from './deployment-environment';

export type BuildScript = 'db:preflight' | 'build:next';

/**
 * Production builds must prove database readiness before compiling. Preview,
 * development, and test builds rely on CI's migrated disposable database and
 * must not require the preview database to have production migration parity.
 */
export function buildScriptsForEnvironment(
  env: DeploymentEnvironmentVariables = process.env,
): BuildScript[] {
  return resolveDeploymentEnvironment(env).isProduction
    ? ['db:preflight', 'build:next']
    : ['build:next'];
}
