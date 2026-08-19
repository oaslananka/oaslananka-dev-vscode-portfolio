import { getProfile, getPublishedPosts, getSettings } from '@/lib/content';
import { buildRssXml } from '@/lib/discovery';

export const revalidate = 3600;

export async function GET() {
  const [profile, posts, settings] = await Promise.all([
    getProfile(),
    getPublishedPosts(),
    getSettings(),
  ]);

  return new Response(
    buildRssXml({ profile, projects: [], posts, settings }),
    {
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'Cache-Control':
          'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
      },
    },
  );
}
