export const DEPLOYMENT_ENVIRONMENT_KINDS = [
  'production',
  'preview',
  'development',
  'test',
] as const;

export type DeploymentEnvironmentKind =
  (typeof DEPLOYMENT_ENVIRONMENT_KINDS)[number];
export type DeploymentProvider = 'vercel' | 'generic';

export interface DeploymentEnvironmentVariables {
  ALLOW_DEFAULT_CONTENT?: string;
  NODE_ENV?: string;
  VERCEL_ENV?: string;
}

export interface DeploymentEnvironment {
  kind: DeploymentEnvironmentKind;
  provider: DeploymentProvider;
  isProduction: boolean;
  isPreview: boolean;
  isDevelopment: boolean;
  isTest: boolean;
}

const NODE_ENV_VALUES = ['production', 'development', 'test'] as const;
const VERCEL_ENV_VALUES = ['production', 'preview', 'development'] as const;

function optionalEnvironmentValue<T extends string>(
  key: string,
  value: string | undefined,
  allowed: readonly T[],
): T | undefined {
  if (value === undefined || value === '') return undefined;
  if (!allowed.includes(value as T)) {
    throw new Error(
      `Unsupported ${key} value "${value}". Expected one of: ${allowed.join(', ')}.`,
    );
  }
  return value as T;
}

/**
 * Resolve the deployment kind once from provider and runtime signals.
 *
 * Vercel is authoritative because preview builds intentionally use
 * NODE_ENV=production while remaining non-production deployments.
 */
export function resolveDeploymentEnvironment(
  env: DeploymentEnvironmentVariables = process.env,
): DeploymentEnvironment {
  const nodeEnvironment = optionalEnvironmentValue(
    'NODE_ENV',
    env.NODE_ENV,
    NODE_ENV_VALUES,
  );
  const vercelEnvironment = optionalEnvironmentValue(
    'VERCEL_ENV',
    env.VERCEL_ENV,
    VERCEL_ENV_VALUES,
  );
  const kind: DeploymentEnvironmentKind =
    vercelEnvironment ?? nodeEnvironment ?? 'development';

  return {
    kind,
    provider: vercelEnvironment ? 'vercel' : 'generic',
    isProduction: kind === 'production',
    isPreview: kind === 'preview',
    isDevelopment: kind === 'development',
    isTest: kind === 'test',
  };
}

export function isProductionDeployment(
  env: DeploymentEnvironmentVariables = process.env,
): boolean {
  return resolveDeploymentEnvironment(env).isProduction;
}

export function isPreviewDeployment(
  env: DeploymentEnvironmentVariables = process.env,
): boolean {
  return resolveDeploymentEnvironment(env).isPreview;
}

/** Accept conventional boolean casing while keeping every other value disabled. */
export function isEnvironmentFlagEnabled(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === 'true';
}

/** Bundled placeholder content is local/test-only and always explicit. */
export function allowsBundledDefaultContent(
  env: DeploymentEnvironmentVariables = process.env,
): boolean {
  const deployment = resolveDeploymentEnvironment(env);
  return (
    (deployment.isDevelopment || deployment.isTest) &&
    isEnvironmentFlagEnabled(env.ALLOW_DEFAULT_CONTENT)
  );
}
