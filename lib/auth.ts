import 'server-only';

import { cookies } from 'next/headers';
import { SignJWT } from 'jose';

import {
  SESSION_COOKIE,
  SESSION_DURATION_SECONDS,
  SESSION_AUDIENCE,
  SESSION_ISSUER,
  SESSION_ROLE,
  getSecretKey,
  verifyToken,
} from './auth-edge';

export { SESSION_COOKIE } from './auth-edge';

/** Sign a session token and set it as an httpOnly cookie. */
export async function createSession(): Promise<void> {
  const token = await new SignJWT({ role: SESSION_ROLE })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject('admin')
    .setIssuer(SESSION_ISSUER)
    .setAudience(SESSION_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getSecretKey());

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

/** True when the current request carries a valid admin session cookie. */
export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  return verifyToken(cookieStore.get(SESSION_COOKIE)?.value);
}

/** Throw if the caller is not authenticated. Use at the top of mutations. */
export async function requireAuth(): Promise<void> {
  if (!(await isAuthenticated())) {
    throw new Error('Unauthorized');
  }
}
