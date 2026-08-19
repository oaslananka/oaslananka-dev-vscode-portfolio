import type { MetadataRoute } from 'next';

import { getProfile, getSettings } from '@/lib/content';

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const [profile, settings] = await Promise.all([getProfile(), getSettings()]);

  return {
    name: settings.siteTitle,
    short_name: profile.name,
    description: settings.siteDescription,
    start_url: '/',
    display: 'standalone',
    background_color: '#0d1117',
    theme_color: '#0d1117',
    icons: [
      { src: '/icon.png', sizes: '512x512', type: 'image/png' },
      { src: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  };
}
