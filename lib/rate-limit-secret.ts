import {
  isProductionDeployment,
  type DeploymentEnvironmentVariables,
} from './deployment-environment';

const DEVELOPMENT_HMAC_SECRET =
  'portfolio-rate-limit-development-only-secret-change-me';

export interface RateLimitSecretEnvironment
  extends DeploymentEnvironmentVariables {
  AUTH_SECRET?: string;
  RATE_LIMIT_HMAC_SECRET?: string;
}

/** Resolve the HMAC key without importing server-only request/database modules. */
export function resolveRateLimitHmacSecret(
  env: RateLimitSecretEnvironment = process.env,
): string {
  const configured = env.RATE_LIMIT_HMAC_SECRET;

  if (!configured && isProductionDeployment(env)) {
    throw new Error(
      'RATE_LIMIT_HMAC_SECRET must be set for a production deployment.',
    );
  }

  const source = configured
    ? 'RATE_LIMIT_HMAC_SECRET'
    : env.AUTH_SECRET
      ? 'AUTH_SECRET'
      : 'development rate-limit fallback';
  const secret = configured || env.AUTH_SECRET || DEVELOPMENT_HMAC_SECRET;
  if (Buffer.byteLength(secret, 'utf8') < 32) {
    throw new Error(`${source} must be at least 32 bytes.`);
  }

  return secret;
}
