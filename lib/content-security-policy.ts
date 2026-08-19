import { resolveDeploymentEnvironment } from './deployment-environment';

export interface ContentSecurityPolicyOptions {
  development?: boolean;
  production?: boolean;
}

const TRUSTED_SCRIPT_SOURCES = [
  'https://www.googletagmanager.com',
  'https://connect.facebook.net',
  'https://va.vercel-scripts.com',
] as const;

const SHARED_DIRECTIVES = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "script-src-attr 'none'",
  "font-src 'self' data:",
  "img-src 'self' data: blob: https://avatars.githubusercontent.com https://www.google-analytics.com https://www.googletagmanager.com https://www.facebook.com",
  "connect-src 'self' https://api.github.com https://github-contributions-api.jogruber.de https://www.google-analytics.com https://analytics.google.com https://region1.google-analytics.com https://*.ingest.sentry.io https://*.ingest.us.sentry.io https://www.facebook.com https://graph.facebook.com",
  'frame-src https://www.googletagmanager.com https://www.facebook.com',
  "worker-src 'self' blob:",
  "manifest-src 'self'",
] as const;

function resolveOptions(options: ContentSecurityPolicyOptions = {}) {
  const deployment = resolveDeploymentEnvironment();
  return {
    development: options.development ?? deployment.isDevelopment,
    production: options.production ?? deployment.isProduction,
  };
}

function assemblePolicy(
  scriptDirective: string,
  styleDirective: string,
  production: boolean,
): string {
  return [
    ...SHARED_DIRECTIVES.slice(0, 5),
    scriptDirective,
    SHARED_DIRECTIVES[5],
    styleDirective,
    ...SHARED_DIRECTIVES.slice(6),
    ...(production ? ['upgrade-insecure-requests'] : []),
  ].join('; ');
}

function assertValidNonce(nonce: string): void {
  if (!nonce || !/^[A-Za-z0-9+/_=-]+$/.test(nonce)) {
    throw new Error('Invalid CSP nonce.');
  }
}

export function createRequestNonce(): string {
  return Buffer.from(crypto.randomUUID()).toString('base64');
}

export function buildPublicContentSecurityPolicy(
  options: ContentSecurityPolicyOptions = {},
): string {
  const { production } = resolveOptions(options);
  const scriptDirective = [
    "script-src 'self' 'unsafe-inline'",
    ...(production ? [] : ["'unsafe-eval'"]),
    ...TRUSTED_SCRIPT_SOURCES,
  ].join(' ');

  return assemblePolicy(
    scriptDirective,
    "style-src 'self' 'unsafe-inline'",
    production,
  );
}

export function buildAdminContentSecurityPolicy(
  nonce: string,
  options: ContentSecurityPolicyOptions = {},
): string {
  assertValidNonce(nonce);
  const { development, production } = resolveOptions(options);
  const scriptDirective = [
    "script-src 'self'",
    `'nonce-${nonce}'`,
    ...(development ? ["'unsafe-eval'"] : []),
    ...TRUSTED_SCRIPT_SOURCES,
  ].join(' ');

  return assemblePolicy(
    scriptDirective,
    `style-src 'self' 'nonce-${nonce}'`,
    production,
  );
}
