import { jwtVerify } from 'jose';

/**
 * Edge-safe auth primitives (no `next/headers`, no `server-only`), so they can
 * be used from both middleware and server components/actions.
 */

export const SESSION_COOKIE = 'admin_session';
export const SESSION_DURATION_SECONDS = 60 * 60 * 8;
export const SESSION_ISSUER = 'oaslananka.dev';
export const SESSION_AUDIENCE = 'oaslananka-admin';
export const SESSION_ROLE = 'admin';

export function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error(
      'AUTH_SECRET is not set. Generate one with `openssl rand -base64 32`.'
    );
  }
  const key = new TextEncoder().encode(secret);
  if (key.byteLength < 32) {
    throw new Error('AUTH_SECRET must be at least 32 bytes.');
  }
  return key;
}

/** Verify a raw session token string. Returns true when valid. */
export async function verifyToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      algorithms: ['HS256'],
      issuer: SESSION_ISSUER,
      audience: SESSION_AUDIENCE,
    });
    return payload.sub === 'admin' && payload.role === SESSION_ROLE;
  } catch {
    return false;
  }
}
