import {
  resolveDeploymentEnvironment,
  type DeploymentEnvironmentVariables,
} from './deployment-environment';

/**
 * Central, env-driven site configuration.
 *
 * Only values that must be known at build time / inside the edge runtime live
 * here. Everything else (name, bio, projects, posts, socials …) is dynamic and
 * comes from the database via `lib/content.ts`, editable in the admin panel.
 */

interface SiteEnvironment extends DeploymentEnvironmentVariables {
  CI?: string;
  SITE_URL?: string;
  NEXT_PUBLIC_SITE_URL?: string;
  VERCEL_PROJECT_PRODUCTION_URL?: string;
}

function isLoopbackHostname(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname === '[::1]'
  );
}

function normalizeSiteUrl(value: string, productionDeployment: boolean): string {
  const requirement = productionDeployment
    ? 'an HTTPS origin (HTTP is allowed only for a loopback host)'
    : 'an HTTP(S) origin';
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error(`NEXT_PUBLIC_SITE_URL must be ${requirement}.`);
  }

  const isHttp = url.protocol === 'https:' || url.protocol === 'http:';
  const isOriginOnly =
    url.pathname === '/' && !url.search && !url.hash && !url.username && !url.password;
  const isRequiredProtocol =
    !productionDeployment ||
    url.protocol === 'https:' ||
    (url.protocol === 'http:' && isLoopbackHostname(url.hostname));

  if (!isHttp || !isOriginOnly || !isRequiredProtocol) {
    throw new Error(
      `NEXT_PUBLIC_SITE_URL must be ${requirement} without a path, query, credentials, or hash.`,
    );
  }

  return url.origin;
}

export function resolveSiteUrl(
  env: SiteEnvironment = process.env,
): string {
  const deployment = resolveDeploymentEnvironment(env);

  if (env.SITE_URL) {
    return normalizeSiteUrl(env.SITE_URL, deployment.isProduction);
  }

  if (env.NEXT_PUBLIC_SITE_URL) {
    return normalizeSiteUrl(env.NEXT_PUBLIC_SITE_URL, deployment.isProduction);
  }

  if (deployment.isProduction) {
    throw new Error(
      'NEXT_PUBLIC_SITE_URL must be set to the canonical HTTPS origin for a production deployment.',
    );
  }

  // Preview deployments can reuse Vercel's production-domain hint. They are
  // noindex, while local development and tests retain the localhost fallback.
  if (deployment.isPreview && env.VERCEL_PROJECT_PRODUCTION_URL) {
    return normalizeSiteUrl(
      `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`,
      false,
    );
  }

  return 'http://localhost:3000';
}

/** Absolute production URL, e.g. https://example.com (no trailing slash). */
export const SITE_URL = resolveSiteUrl();

/** GitHub handle powering the /github page and contribution calendar. */
export const GITHUB_USERNAME =
  process.env.NEXT_PUBLIC_GITHUB_USERNAME || 'oaslananka';

/** Google Analytics 4 measurement id (empty string disables GA). */
export const GA_ID = process.env.NEXT_PUBLIC_GA_ID || '';

/** Google Tag Manager container id (empty string disables GTM). */
export const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || '';

/** Meta (Facebook) Pixel id (empty string disables the pixel). */
export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || '';

/** Build an absolute URL for a site-relative path. */
export function absoluteUrl(path = ''): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${SITE_URL}${normalized}`;
}
