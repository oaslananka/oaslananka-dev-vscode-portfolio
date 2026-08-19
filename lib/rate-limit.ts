import 'server-only';

import { createHmac } from 'node:crypto';
import { headers } from 'next/headers';
import { and, count, eq, gt, sql } from 'drizzle-orm';

import { db } from './db';
import { loginAttempts } from './db/schema';
import { resolveRateLimitHmacSecret } from './rate-limit-secret';

export interface RateLimitPolicy {
  scope: string;
  windowMs: number;
  maxAttempts: number;
}

export const LOGIN_RATE_LIMIT = {
  scope: 'login',
  windowMs: 15 * 60 * 1000,
  maxAttempts: 8,
} as const satisfies RateLimitPolicy;

export const CONTACT_RATE_LIMIT = {
  scope: 'contact',
  windowMs: 15 * 60 * 1000,
  maxAttempts: 5,
} as const satisfies RateLimitPolicy;

export const RATE_LIMIT_RETENTION_MS = 24 * 60 * 60 * 1000;

// A per-instance fallback supplements the durable database counter. It also
// prevents a complete fail-open on transient infrastructure failures.
const memoryAttempts = new Map<string, number[]>();

export function hashRateLimitIdentity(
  identity: string,
  scope: string,
): string {
  return createHmac('sha256', resolveRateLimitHmacSecret())
    .update(scope)
    .update('\0')
    .update(identity)
    .digest('hex');
}

function scopedKey(ip: string, policy: RateLimitPolicy): string {
  return `${policy.scope}:${hashRateLimitIdentity(ip, policy.scope)}`;
}

function safeScopedKey(
  ip: string,
  policy: RateLimitPolicy,
): string | null {
  try {
    return scopedKey(ip, policy);
  } catch (error) {
    console.error(`[rate-limit:${policy.scope}] identity hashing failed`, error);
    return null;
  }
}

function currentMemoryCount(key: string, windowMs: number): number {
  const cutoff = Date.now() - windowMs;
  const recent = (memoryAttempts.get(key) ?? []).filter(
    (timestamp) => timestamp > cutoff,
  );

  if (recent.length > 0) {
    memoryAttempts.set(key, recent);
  } else {
    memoryAttempts.delete(key);
  }

  return recent.length;
}

function recordMemoryAttempt(key: string, windowMs: number): void {
  currentMemoryCount(key, windowMs);
  const attempts = memoryAttempts.get(key) ?? [];
  attempts.push(Date.now());
  memoryAttempts.set(key, attempts);
}

/** Best-effort client IP from trusted proxy headers set by Vercel. */
export async function getClientIp(): Promise<string> {
  const requestHeaders = await headers();
  const forwarded =
    requestHeaders.get('x-vercel-forwarded-for') ??
    requestHeaders.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || requestHeaders.get('x-real-ip');

  return (ip || 'unknown').slice(0, 200);
}

/**
 * Returns true after the configured threshold is reached.
 *
 * Database query failures fail closed. The admin area and contact storage both
 * depend on the same database, so accepting unlimited requests during an
 * outage would provide no useful availability benefit.
 */
export async function isRateLimited(
  ip: string,
  policy: RateLimitPolicy,
): Promise<boolean> {
  const key = safeScopedKey(ip, policy);
  if (!key) return true;
  const memoryCount = currentMemoryCount(key, policy.windowMs);

  if (!db) {
    return memoryCount >= policy.maxAttempts;
  }

  const since = new Date(Date.now() - policy.windowMs);

  try {
    const [row] = await db
      .select({ value: count() })
      .from(loginAttempts)
      .where(
        and(
          eq(loginAttempts.identityHash, key),
          gt(loginAttempts.createdAt, since),
        ),
      );

    return Math.max(Number(row?.value ?? 0), memoryCount) >= policy.maxAttempts;
  } catch (error) {
    console.error(`[rate-limit:${policy.scope}] check failed`, error);
    return true;
  }
}

/**
 * Atomically admits and records one attempt.
 *
 * The database function serializes consumers for the same scoped identity.
 * Returning false is fail-closed: the configured limit was reached or the
 * durable consume could not be completed.
 */
export async function consumeRateLimitAttempt(
  ip: string,
  policy: RateLimitPolicy,
): Promise<boolean> {
  const key = safeScopedKey(ip, policy);
  if (!key) return false;

  if (currentMemoryCount(key, policy.windowMs) >= policy.maxAttempts) {
    return false;
  }

  if (!db) {
    recordMemoryAttempt(key, policy.windowMs);
    return true;
  }

  try {
    const now = Date.now();
    const windowStart = new Date(now - policy.windowMs);
    const retentionMs = Math.max(RATE_LIMIT_RETENTION_MS, policy.windowMs);
    const retentionCutoff = new Date(now - retentionMs);
    const [result] = await db
      .select({
        consumed: sql<boolean>`public.consume_rate_limit_attempt(
          ${key},
          ${windowStart},
          ${policy.maxAttempts},
          ${retentionCutoff}
        )`,
      })
      .from(sql`(SELECT 1) AS rate_limit_consume`);

    if (!result?.consumed) return false;

    recordMemoryAttempt(key, policy.windowMs);
    return true;
  } catch (error) {
    console.error(`[rate-limit:${policy.scope}] consume failed`, error);
    return false;
  }
}

export async function clearRateLimit(
  ip: string,
  policy: RateLimitPolicy,
): Promise<void> {
  const key = safeScopedKey(ip, policy);
  if (!key) return;
  memoryAttempts.delete(key);

  if (!db) return;

  try {
    await db
      .delete(loginAttempts)
      .where(eq(loginAttempts.identityHash, key));
  } catch (error) {
    console.error(`[rate-limit:${policy.scope}] clear failed`, error);
  }
}
