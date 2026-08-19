import {
  createRemoteJWKSet,
  jwtVerify,
  type JWTVerifyGetKey,
} from 'jose';

export interface AdminAccessEnvironment {
  ADMIN_ACCESS_EMAILS?: string;
  ADMIN_ACCESS_HOST?: string;
  CF_ACCESS_AUD?: string;
  CF_ACCESS_TEAM_DOMAIN?: string;
}

export interface AdminAccessConfig {
  allowedEmails: readonly string[];
  host: string;
  audience: string;
  issuer: string;
  jwksUrl: URL;
}

const remoteKeySets = new Map<string, JWTVerifyGetKey>();

function requiredTogether(
  values: ReadonlyArray<string | undefined>,
): boolean {
  return values.some(Boolean) && !values.every(Boolean);
}

function normalizeAdminHost(value: string): string {
  if (value.includes('://') || value.includes('/') || value.includes(':')) {
    throw new Error('ADMIN_ACCESS_HOST must be a hostname without protocol, path, or port.');
  }

  const hostname = value.trim().toLowerCase();
  if (
    hostname.length > 253 ||
    !hostname.includes('.') ||
    hostname.startsWith('.') ||
    hostname.endsWith('.') ||
    hostname.split('.').some((label) =>
      label.length === 0 ||
      label.length > 63 ||
      !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label),
    )
  ) {
    throw new Error('ADMIN_ACCESS_HOST must be a valid public hostname.');
  }

  return hostname;
}

function normalizeIssuer(value: string): string {
  const url = new URL(value);
  if (url.protocol !== 'https:') {
    throw new Error('CF_ACCESS_TEAM_DOMAIN must use HTTPS.');
  }
  if (!url.hostname.endsWith('.cloudflareaccess.com')) {
    throw new Error(
      'CF_ACCESS_TEAM_DOMAIN must be a Cloudflare Access team domain.',
    );
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error('CF_ACCESS_TEAM_DOMAIN must not contain credentials or query data.');
  }
  return url.origin;
}

function isValidEmail(value: string): boolean {
  if (value.length > 254 || [...value].some((character) => character.trim() === '')) {
    return false;
  }

  const separator = value.indexOf('@');
  if (separator <= 0 || separator !== value.lastIndexOf('@')) return false;

  const domain = value.slice(separator + 1);
  const dot = domain.indexOf('.');
  return dot > 0 && dot < domain.length - 1 && !domain.includes('..');
}

function parseAllowedEmails(value: string): string[] {
  const emails = [
    ...new Set(
      value
        .split(/[\n,]/)
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];

  if (emails.length === 0 || emails.some((email) => !isValidEmail(email))) {
    throw new Error('ADMIN_ACCESS_EMAILS must contain valid email addresses.');
  }
  return emails;
}

export function resolveAdminAccessConfig(
  env: AdminAccessEnvironment = process.env as AdminAccessEnvironment,
): AdminAccessConfig | null {
  const adminHost = env.ADMIN_ACCESS_HOST?.trim();
  const teamDomain = env.CF_ACCESS_TEAM_DOMAIN?.trim();
  const audience = env.CF_ACCESS_AUD?.trim();
  const allowedEmailSource = env.ADMIN_ACCESS_EMAILS?.trim();
  const values = [adminHost, teamDomain, audience, allowedEmailSource];

  if (values.every((value) => !value)) return null;
  if (requiredTogether(values)) {
    throw new Error(
      'ADMIN_ACCESS_HOST, CF_ACCESS_TEAM_DOMAIN, CF_ACCESS_AUD, and ADMIN_ACCESS_EMAILS must be configured together.',
    );
  }

  const issuer = normalizeIssuer(teamDomain as string);
  const normalizedAudience = audience as string;
  if (normalizedAudience.length < 8 || normalizedAudience.length > 512) {
    throw new Error('CF_ACCESS_AUD must be between 8 and 512 characters.');
  }

  return {
    host: normalizeAdminHost(adminHost as string),
    issuer,
    audience: normalizedAudience,
    allowedEmails: parseAllowedEmails(allowedEmailSource as string),
    jwksUrl: new URL('/cdn-cgi/access/certs', issuer),
  };
}

function remoteKeySet(config: AdminAccessConfig): JWTVerifyGetKey {
  const cacheKey = config.jwksUrl.href;
  const cached = remoteKeySets.get(cacheKey);
  if (cached) return cached;

  const created = createRemoteJWKSet(config.jwksUrl);
  remoteKeySets.set(cacheKey, created);
  return created;
}

export async function verifyAdminAccessToken(
  token: string | null | undefined,
  config: AdminAccessConfig,
  getKey: JWTVerifyGetKey = remoteKeySet(config),
): Promise<boolean> {
  if (!token) return false;

  try {
    const { payload } = await jwtVerify(token, getKey, {
      algorithms: ['RS256'],
      issuer: config.issuer,
      audience: config.audience,
    });
    const email =
      typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
    return config.allowedEmails.includes(email);
  } catch {
    return false;
  }
}
