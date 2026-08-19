import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

import { buildPublicContentSecurityPolicy } from './lib/content-security-policy';
import { ALLOWED_REMOTE_IMAGE_HOSTNAMES } from './lib/image-policy';
import {
  UI_ICON_SPRITE_CACHE_CONTROL,
  UI_ICON_SPRITE_PATH,
  THEME_INIT_SCRIPT_CACHE_CONTROL,
  THEME_INIT_SCRIPT_PATH,
} from './lib/static-assets';

const contentSecurityPolicy = buildPublicContentSecurityPolicy();

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: contentSecurityPolicy,
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value:
      'camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()',
  },
  {
    key: 'Cross-Origin-Opener-Policy',
    value: 'same-origin',
  },
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'off',
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: ALLOWED_REMOTE_IMAGE_HOSTNAMES.map((hostname) => ({
      protocol: 'https' as const,
      hostname,
    })),
  },
  async headers() {
    return [
      {
        source: UI_ICON_SPRITE_PATH,
        headers: [
          {
            key: 'Cache-Control',
            value: UI_ICON_SPRITE_CACHE_CONTROL,
          },
        ],
      },
      {
        source: THEME_INIT_SCRIPT_PATH,
        headers: [
          {
            key: 'Cache-Control',
            value: THEME_INIT_SCRIPT_CACHE_CONTROL,
          },
        ],
      },
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
  async redirects() {
    return [
      // The blog used to live at /articles; keep old links working.
      { source: '/blog', destination: '/articles', permanent: true },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  // Route Sentry requests through the app to avoid ad-blockers.
  tunnelRoute: '/monitoring',
  widenClientFileUpload: true,
  silent: !process.env.CI,
  // Only upload source maps when a Sentry auth token is configured.
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
});
