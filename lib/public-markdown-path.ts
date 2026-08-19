const STATIC_PUBLIC_PATHS = new Set([
  '/',
  '/about',
  '/projects',
  '/articles',
  '/github',
  '/glossary',
  '/contact',
  '/privacy',
]);

const DYNAMIC_PUBLIC_PATH = /^\/(projects|articles)\/[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const MACHINE_MARKDOWN_PATHS = new Set([
  '/index.md',
  '/sitemap.md',
  '/AGENTS.md',
]);

export function normalizeCanonicalPublicPath(pathname: string): string | null {
  const withoutQuery = pathname.split(/[?#]/, 1)[0] ?? '';
  if (!withoutQuery.startsWith('/')) return null;

  const normalized =
    withoutQuery.length > 1 ? withoutQuery.replace(/\/+$/, '') : withoutQuery;
  if (STATIC_PUBLIC_PATHS.has(normalized)) return normalized;
  return DYNAMIC_PUBLIC_PATH.test(normalized) ? normalized : null;
}

export function markdownMirrorPath(canonicalPath: string): string | null {
  const normalized = normalizeCanonicalPublicPath(canonicalPath);
  if (!normalized) return null;
  return normalized === '/' ? '/.md' : `${normalized}.md`;
}

export function advertisedMarkdownPath(canonicalPath: string): string | null {
  const normalized = normalizeCanonicalPublicPath(canonicalPath);
  if (!normalized) return null;
  return normalized === '/' ? '/index.md' : `${normalized}.md`;
}

export function canonicalPathFromMarkdownPath(
  markdownPath: string,
): string | null {
  if (markdownPath === '/.md' || markdownPath === '/index.md') return '/';
  if (!markdownPath.endsWith('.md')) return null;
  return normalizeCanonicalPublicPath(markdownPath.slice(0, -3));
}
