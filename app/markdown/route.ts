import {
  getProfile,
  getProjects,
  getPublishedPosts,
  getSettings,
} from '@/lib/content';
import { markdownResponse } from '@/lib/markdown-response';
import { buildCanonicalPageMarkdown } from '@/lib/page-markdown';
import { markdownMirrorPath } from '@/lib/public-markdown-path';

export const revalidate = 3600;

export async function GET(request: Request) {
  const requestedPath = new URL(request.url).searchParams.get('path') ?? '';
  const [profile, projects, posts, settings] = await Promise.all([
    getProfile(),
    getProjects(),
    getPublishedPosts(),
    getSettings(),
  ]);
  const document = buildCanonicalPageMarkdown(requestedPath, {
    profile,
    projects,
    posts,
    settings,
  });

  if (!document) {
    return new Response('Markdown page not found.\n', {
      status: 404,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    });
  }

  return markdownResponse(document.body, {
    canonicalPath: document.canonicalPath,
    contentLocation:
      markdownMirrorPath(document.canonicalPath) ?? '/index.md',
    additionalHeaders: { 'X-Robots-Tag': 'noindex, follow' },
  });
}
