import type { MetadataRoute } from 'next';

import { isPreviewDeployment } from '@/lib/deployment-environment';
import { SITE_URL } from '@/lib/site-config';

const PRIVATE_PATHS = ['/admin', '/api'];

export function buildRobotsFile(preview: boolean): MetadataRoute.Robots {
  if (preview) {
    return { rules: [{ userAgent: '*', disallow: '/' }] };
  }

  return {
    rules: [
      {
        userAgent: [
          'Googlebot',
          'Bingbot',
          'OAI-SearchBot',
          'ChatGPT-User',
          'Claude-SearchBot',
          'Claude-User',
          'PerplexityBot',
          'Perplexity-User',
        ],
        allow: '/',
        disallow: PRIVATE_PATHS,
      },
      {
        userAgent: [
          'GPTBot',
          'ClaudeBot',
          'Google-Extended',
          'Applebot-Extended',
          'CCBot',
        ],
        disallow: '/',
      },
      {
        userAgent: '*',
        allow: '/',
        disallow: PRIVATE_PATHS,
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}

export default function robots(): MetadataRoute.Robots {
  return buildRobotsFile(isPreviewDeployment());
}
