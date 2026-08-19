'use server';

import { redirect } from 'next/navigation';
import bcrypt from 'bcryptjs';

import type { ActionState } from '@/lib/admin/action-state';
import { createSession, destroySession, requireAuth } from '@/lib/auth';
import {
  LOGIN_RATE_LIMIT,
  clearRateLimit,
  consumeRateLimitAttempt,
  getClientIp,
  isRateLimited,
} from '@/lib/rate-limit';

export async function login(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const passwordEntry = formData.get('password');
  const password = typeof passwordEntry === 'string' ? passwordEntry : '';
  const hash = process.env.ADMIN_PASSWORD_HASH;

  if (!hash) {
    return {
      ok: false,
      message:
        'No admin password is configured. Set ADMIN_PASSWORD_HASH (npm run admin:hash).',
    };
  }

  const ip = await getClientIp();
  if (await isRateLimited(ip, LOGIN_RATE_LIMIT)) {
    return {
      ok: false,
      message: 'Too many attempts. Please wait a few minutes and try again.',
    };
  }

  const valid = await bcrypt.compare(password, hash);
  if (!valid) {
    if (!(await consumeRateLimitAttempt(ip, LOGIN_RATE_LIMIT))) {
      return {
        ok: false,
        message: 'Too many attempts. Please wait a few minutes and try again.',
      };
    }
    return { ok: false, message: 'Incorrect password.' };
  }

  await clearRateLimit(ip, LOGIN_RATE_LIMIT);
  await createSession();
  redirect('/admin');
}

export async function logout(): Promise<void> {
  await requireAuth();
  await destroySession();
  redirect('/admin/login');
}
