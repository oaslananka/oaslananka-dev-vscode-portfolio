import * as Sentry from '@sentry/nextjs';
import { NextRequest, NextResponse } from 'next/server';

import { hasValidBearerToken } from '@/lib/cron-auth';
import { runContactNotificationBatch } from '@/lib/contact-notifications';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' } as const;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: 'Contact notification redrive is not configured.' },
      { status: 503, headers: NO_STORE_HEADERS },
    );
  }

  if (!hasValidBearerToken(request.headers.get('authorization'), secret)) {
    return NextResponse.json(
      { error: 'Unauthorized.' },
      { status: 401, headers: NO_STORE_HEADERS },
    );
  }

  try {
    const delivery = await runContactNotificationBatch();
    if (!delivery) {
      return NextResponse.json(
        { error: 'Database is not configured.' },
        { status: 503, headers: NO_STORE_HEADERS },
      );
    }

    return NextResponse.json(
      { ok: true, delivery },
      { headers: NO_STORE_HEADERS },
    );
  } catch (error) {
    Sentry.captureException(error, {
      tags: { component: 'contact-notification-cron' },
    });
    return NextResponse.json(
      { error: 'Contact notification redrive failed.' },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }
}
