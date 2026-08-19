import {
  getProfile,
  getProjects,
  getPublishedPosts,
  getSettings,
} from '@/lib/content';
import { buildLlmsText } from '@/lib/discovery';

export const revalidate = 3600;

/**
 * /llms.txt — a structured plain-text summary for AI crawlers and assistants,
 * following the emerging llms.txt convention (https://llmstxt.org).
 */
export async function GET() {
  const [profile, projects, posts, settings] = await Promise.all([
    getProfile(),
    getProjects(),
    getPublishedPosts(),
    getSettings(),
  ]);

  return new Response(buildLlmsText({ profile, projects, posts, settings }), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
