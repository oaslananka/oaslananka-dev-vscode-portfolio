import { NextRequest, NextResponse } from 'next/server';

import { hasValidBearerToken } from '@/lib/cron-auth';
import { purgeExpiredRecords } from '@/lib/retention';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' } as const;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: 'Retention cleanup is not configured.' },
      { status: 503, headers: NO_STORE_HEADERS },
    );
  }

  if (!hasValidBearerToken(request.headers.get('authorization'), secret)) {
    return NextResponse.json(
      { error: 'Unauthorized.' },
      { status: 401, headers: NO_STORE_HEADERS },
    );
  }

  const result = await purgeExpiredRecords();
  if (!result) {
    return NextResponse.json(
      { error: 'Database is not configured.' },
      { status: 503, headers: NO_STORE_HEADERS },
    );
  }

  return NextResponse.json(
    { ok: true, deleted: result },
    { headers: NO_STORE_HEADERS },
  );
}
