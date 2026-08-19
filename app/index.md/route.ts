import {
  getProfile,
  getProjects,
  getPublishedPosts,
  getSettings,
} from '@/lib/content';
import { buildHomepageMarkdown } from '@/lib/agent-discovery';
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
    buildHomepageMarkdown({ profile, projects, posts, settings }),
    { canonicalPath: '/', contentLocation: '/index.md' },
  );
}
