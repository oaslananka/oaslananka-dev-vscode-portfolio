import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import Script from 'next/script';

import ConsentManager from '@/components/ConsentManager';
import JsonLd from '@/components/JsonLd';
import { getProfile, getSettings } from '@/lib/content';
import { buildRootMetadata, personJsonLd, websiteJsonLd } from '@/lib/seo';
import { GA_ID, GTM_ID, META_PIXEL_ID } from '@/lib/site-config';
import { DEFAULT_THEME, isThemeKey } from '@/lib/themes';

import '@/styles/globals.css';
import '@/styles/themes.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

// Self-hosted monospace for the code-editor identity of the site.
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
});

export async function generateMetadata(): Promise<Metadata> {
  const [profile, settings] = await Promise.all([getProfile(), getSettings()]);
  return buildRootMetadata(settings, profile);
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0d1117' },
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
  ],
  colorScheme: 'dark light',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [profile, settings] = await Promise.all([getProfile(), getSettings()]);
  const defaultTheme = isThemeKey(settings.defaultTheme)
    ? settings.defaultTheme
    : DEFAULT_THEME;

  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable}`}
      data-default-theme={defaultTheme}
      suppressHydrationWarning
    >
      <head>
        <Script src="/theme-init.v1.js" strategy="beforeInteractive" />
        <JsonLd data={personJsonLd(profile)} />
        <JsonLd data={websiteJsonLd(settings, profile)} />
      </head>
      <body>
        {children}
        <ConsentManager
          gaId={GA_ID}
          gtmId={GTM_ID}
          metaPixelId={META_PIXEL_ID}
        />
      </body>
    </html>
  );
}
