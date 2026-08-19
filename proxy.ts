import { NextResponse, type NextRequest } from 'next/server';

import {
  resolveAdminAccessConfig,
  verifyAdminAccessToken,
} from '@/lib/admin-access';
import { SESSION_COOKIE, verifyToken } from '@/lib/auth-edge';
import {
  buildAdminContentSecurityPolicy,
  createRequestNonce,
} from '@/lib/content-security-policy';
import { acceptsMarkdown } from '@/lib/markdown-negotiation';
import {
  MACHINE_MARKDOWN_PATHS,
  advertisedMarkdownPath,
  canonicalPathFromMarkdownPath,
  normalizeCanonicalPublicPath,
} from '@/lib/public-markdown-path';

interface AdminSecurityContext {
  policy: string;
  requestHeaders: Headers;
}

function appendVary(headers: Headers, value: string): void {
  const values = new Set(
    (headers.get('Vary') ?? '')
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean),
  );
  values.add(value);
  headers.set('Vary', [...values].join(', '));
}

function createAdminSecurityContext(
  request: NextRequest,
): AdminSecurityContext {
  const nonce = createRequestNonce();
  const policy = buildAdminContentSecurityPolicy(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', policy);
  return { policy, requestHeaders };
}

function applyAdminSecurity(
  response: NextResponse,
  context: AdminSecurityContext,
): NextResponse {
  response.headers.set('Content-Security-Policy', context.policy);
  return response;
}

function nextWithAdminSecurity(context: AdminSecurityContext): NextResponse {
  return applyAdminSecurity(
    NextResponse.next({
      request: { headers: context.requestHeaders },
    }),
    context,
  );
}

function markdownRewrite(request: NextRequest, canonicalPath: string) {
  const markdownUrl = request.nextUrl.clone();
  markdownUrl.pathname = '/markdown';
  markdownUrl.search = '';
  markdownUrl.searchParams.set('path', canonicalPath);
  return NextResponse.rewrite(markdownUrl);
}

function publicPageResponse(request: NextRequest, canonicalPath: string) {
  const markdownPath = advertisedMarkdownPath(canonicalPath);
  const response = acceptsMarkdown(request.headers.get('accept'))
    ? markdownRewrite(request, canonicalPath)
    : NextResponse.next();

  appendVary(response.headers, 'Accept');
  if (markdownPath) {
    response.headers.set(
      'Link',
      `<${new URL(markdownPath, request.url)}>; rel="alternate"; type="text/markdown"`,
    );
  }
  return response;
}

/**
 * Negotiate public Markdown representations and protect every admin route except
 * the login form. Machine discovery documents remain direct route handlers.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (MACHINE_MARKDOWN_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  const markdownCanonicalPath = canonicalPathFromMarkdownPath(pathname);
  if (markdownCanonicalPath) {
    return markdownRewrite(request, markdownCanonicalPath);
  }
  if (pathname.endsWith('.md')) {
    return new NextResponse('Markdown page not found.\n', {
      status: 404,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    });
  }

  const canonicalPublicPath = normalizeCanonicalPublicPath(pathname);
  if (canonicalPublicPath) {
    return publicPageResponse(request, canonicalPublicPath);
  }

  const isAdminRoute =
    pathname === '/admin' || pathname.startsWith('/admin/');
  if (!isAdminRoute) {
    return NextResponse.next();
  }

  const adminSecurity = createAdminSecurityContext(request);

  try {
    const accessConfig = resolveAdminAccessConfig();
    if (accessConfig) {
      if (request.nextUrl.hostname.toLowerCase() !== accessConfig.host) {
        const adminUrl = request.nextUrl.clone();
        adminUrl.protocol = 'https:';
        adminUrl.hostname = accessConfig.host;
        adminUrl.port = '';
        return applyAdminSecurity(
          NextResponse.redirect(adminUrl, 307),
          adminSecurity,
        );
      }

      if (
        !(await verifyAdminAccessToken(
          request.headers.get('cf-access-jwt-assertion'),
          accessConfig,
        ))
      ) {
        return applyAdminSecurity(
          new NextResponse('Forbidden.\n', {
            status: 403,
            headers: { 'Cache-Control': 'no-store' },
          }),
          adminSecurity,
        );
      }
    }
  } catch {
    return applyAdminSecurity(
      new NextResponse('Admin access is not configured correctly.\n', {
        status: 503,
        headers: { 'Cache-Control': 'no-store' },
      }),
      adminSecurity,
    );
  }

  if (pathname === '/admin/login') {
    return nextWithAdminSecurity(adminSecurity);
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const valid = await verifyToken(token);

  if (!valid) {
    const loginUrl = new URL('/admin/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return applyAdminSecurity(
      NextResponse.redirect(loginUrl),
      adminSecurity,
    );
  }

  return nextWithAdminSecurity(adminSecurity);
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|xml|txt|json|webmanifest|mp4|woff|woff2)$).*)',
  ],
};
