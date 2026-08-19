import { revalidatePath } from 'next/cache';
import { after } from 'next/server';

import { db } from '@/lib/db';
import { notifyIndexNow } from '@/lib/indexnow';
import { AdminValidationError } from '@/lib/admin/validation';
import type { ActionState } from '@/lib/admin/action-state';

export const PROFILE_INDEX_PATHS = [
  '/',
  '/about',
  '/contact',
  '/github',
] as const;

export const SETTINGS_INDEX_PATHS = [
  '/',
  '/about',
  '/projects',
  '/articles',
  '/github',
  '/contact',
] as const;

const DISCOVERY_PATHS = [
  '/sitemap.xml',
  '/sitemap.md',
  '/llms.txt',
  '/llms-full.txt',
  '/feed.xml',
] as const;

export function requireDb() {
  if (!db) {
    throw new Error('Database is not configured.');
  }
  return db;
}

export function revalidateDiscoveryPaths(): void {
  for (const path of DISCOVERY_PATHS) revalidatePath(path);
}

export function scheduleIndexNow(paths: Iterable<string>): void {
  const changedPaths = [...new Set(paths)];
  if (changedPaths.length === 0) return;

  after(async () => {
    await notifyIndexNow(changedPaths);
  });
}

export function isUniqueViolation(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: unknown }).code === '23505',
  );
}

export function actionFailure(
  error: unknown,
  fallback: string,
): ActionState {
  if (error instanceof AdminValidationError) {
    return { ok: false, message: error.message };
  }

  return { ok: false, message: fallback };
}
