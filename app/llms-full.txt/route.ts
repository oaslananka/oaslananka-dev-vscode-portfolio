import {
  getProfile,
  getProjects,
  getPublishedPosts,
  getSettings,
} from '@/lib/content';
import { buildLlmsFullText } from '@/lib/agent-discovery';

export const revalidate = 3600;

export async function GET() {
  const [profile, projects, posts, settings] = await Promise.all([
    getProfile(),
    getProjects(),
    getPublishedPosts(),
    getSettings(),
  ]);

  return new Response(
    buildLlmsFullText({ profile, projects, posts, settings }),
    {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control':
          'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
      },
    },
  );
}
