import { INDEXNOW_KEY } from '@/lib/indexnow';

export const revalidate = 86_400;

export function GET(): Response {
  return new Response(INDEXNOW_KEY, {
    headers: {
      'cache-control': 'public, max-age=86400, immutable',
      'content-type': 'text/plain; charset=utf-8',
    },
  });
}
