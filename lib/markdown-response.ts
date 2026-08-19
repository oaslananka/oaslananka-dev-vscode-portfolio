import { absoluteUrl } from './site-config';

interface MarkdownResponseOptions {
  canonicalPath?: string;
  contentLocation?: string;
  maxAgeSeconds?: number;
  additionalHeaders?: HeadersInit;
}

export function markdownResponse(
  body: string,
  options: MarkdownResponseOptions = {},
): Response {
  const maxAge = options.maxAgeSeconds ?? 3600;
  const headers = new Headers({
    'Content-Type': 'text/markdown; charset=utf-8',
    'Cache-Control': `public, max-age=0, s-maxage=${maxAge}, stale-while-revalidate=86400`,
    Vary: 'Accept',
  });

  if (options.additionalHeaders) {
    new Headers(options.additionalHeaders).forEach((value, key) => {
      headers.set(key, value);
    });
  }

  if (options.canonicalPath) {
    headers.set(
      'Link',
      `<${absoluteUrl(options.canonicalPath)}>; rel="canonical"; type="text/html"`,
    );
  }
  if (options.contentLocation) {
    headers.set('Content-Location', options.contentLocation);
  }

  return new Response(body, { headers });
}
