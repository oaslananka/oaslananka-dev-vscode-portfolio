import {
  getProfile,
  getProjects,
  getPublishedPosts,
  getSettings,
} from '@/lib/content';
import { buildMarkdownSitemap } from '@/lib/agent-discovery';
import { markdownResponse } from '@/lib/markdown-response';

export const revalidate = 3600;

export async function GET() {
  const [profile, projects, posts, settings] = await Promise.all([
    getProfile(),
    getProjects(),
    getPublishedPosts(),
    getSettings(),
  ]);

  return markdownResponse(
    buildMarkdownSitemap({ profile, projects, posts, settings }),
    { contentLocation: '/sitemap.md' },
  );
}
