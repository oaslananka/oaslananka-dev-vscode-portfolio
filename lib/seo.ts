import type { Metadata } from 'next';

import { isPreviewDeployment } from './deployment-environment';
import {
  PERSON_ALTERNATE_NAME,
  publicIdentityProfiles,
} from './person-identity';
import { advertisedMarkdownPath } from './public-markdown-path';
import { SITE_URL, absoluteUrl } from './site-config';
import type { Post, Profile, Project, SiteSettings } from './db/schema';
import { isSafeHttpsUrl, isSafeResourceUrl } from './url-policy';

export const PERSON_ID = absoluteUrl('/about#person');
export const WEBSITE_ID = absoluteUrl('/#website');

const DEFAULT_SOCIAL_IMAGE = absoluteUrl('/opengraph-image');
const SOCIAL_IMAGE_SIZE = { width: 1200, height: 630 } as const;

function publicImageUrl(value: string, fallback = DEFAULT_SOCIAL_IMAGE): string {
  const image = value.trim();
  if (image.startsWith('/') && isSafeResourceUrl(image)) {
    return absoluteUrl(image);
  }

  return isSafeHttpsUrl(image) ? new URL(image).toString() : fallback;
}

interface PageMetadataInput {
  title: string;
  absoluteTitle?: boolean;
  description: string;
  path: string;
  image?: string;
  imageAlt?: string;
  useFileConventionImage?: boolean;
  type?: 'website' | 'article';
  publishedTime?: string;
  modifiedTime?: string;
  tags?: string[];
  markdownAlternate?: string;
}

/** Metadata shared by every indexable page so nested fields never go stale. */
export function buildPageMetadata({
  title,
  absoluteTitle = false,
  description,
  path,
  image = DEFAULT_SOCIAL_IMAGE,
  imageAlt = title,
  useFileConventionImage = false,
  type = 'website',
  publishedTime,
  modifiedTime,
  tags,
  markdownAlternate,
}: PageMetadataInput): Metadata {
  const canonical = absoluteUrl(path);
  const resolvedMarkdownAlternate =
    markdownAlternate ?? advertisedMarkdownPath(path);
  const socialImage = publicImageUrl(image);
  const imageMetadata = {
    url: socialImage,
    ...SOCIAL_IMAGE_SIZE,
    alt: imageAlt,
  };
  const articleFields = type === 'article'
    ? { publishedTime, modifiedTime, tags }
    : {};

  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: {
      canonical,
      types: {
        'application/rss+xml': absoluteUrl('/feed.xml'),
        ...(resolvedMarkdownAlternate
          ? { 'text/markdown': absoluteUrl(resolvedMarkdownAlternate) }
          : {}),
      },
    },
    openGraph: {
      type,
      locale: 'en_US',
      siteName: 'oaslananka.dev',
      title,
      description,
      url: canonical,
      ...(!useFileConventionImage ? { images: [imageMetadata] } : {}),
      ...articleFields,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(!useFileConventionImage
        ? { images: [{ url: socialImage, alt: imageAlt }] }
        : {}),
    },
    robots: buildRobotsMetadata(isPreviewDeployment()),
  };
}

export function buildRobotsMetadata(preview = false): Metadata['robots'] {
  return preview
    ? { index: false, follow: false, nocache: true }
    : {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          'max-image-preview': 'large',
          'max-snippet': -1,
          'max-video-preview': -1,
        },
      };
}

export function buildNotFoundMetadata(title = 'Page not found'): Metadata {
  return {
    title,
    robots: { index: false, follow: false, nocache: true },
  };
}

/** Escape characters that can terminate or alter an inline JSON-LD script. */
export function serializeJsonLd(data: unknown): string {
  const serialized = JSON.stringify(data);
  if (serialized === undefined) return 'null';

  return serialized
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

/** Root-level metadata built from the editable site settings. */
export function buildRootMetadata(
  settings: SiteSettings,
  profile: Profile
): Metadata {
  const title = settings.siteTitle;
  const description = settings.siteDescription;

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: title,
      template: `%s · ${profile.name}`,
    },
    description,
    keywords: settings.keywords,
    authors: [{ name: profile.name, url: absoluteUrl('/about') }],
    creator: profile.name,
    applicationName: `${profile.name} — Portfolio`,
    alternates: {
      types: { 'application/rss+xml': absoluteUrl('/feed.xml') },
    },
    openGraph: {
      type: 'website',
      siteName: `${profile.name} — Portfolio`,
      title,
      description,
      url: SITE_URL,
      images: [{ url: DEFAULT_SOCIAL_IMAGE, ...SOCIAL_IMAGE_SIZE, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [{ url: DEFAULT_SOCIAL_IMAGE, alt: title }],
    },
    robots: buildRobotsMetadata(isPreviewDeployment()),
    manifest: '/manifest.webmanifest',
  };
}

/** JSON-LD Person describing the site owner. */
export function personJsonLd(profile: Profile) {
  const avatarUrl = profile.avatarUrl
    ? publicImageUrl(profile.avatarUrl, '')
    : '';
  const sameAs = publicIdentityProfiles(profile.socials).map(
    (social) => social.url,
  );
  const alumniOf = [...new Set(
    profile.education
      .map((item) => item.institution.trim())
      .filter(Boolean),
  )].map((name) => ({ '@type': 'EducationalOrganization', name }));

  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': PERSON_ID,
    name: profile.name,
    alternateName: PERSON_ALTERNATE_NAME,
    url: absoluteUrl('/about'),
    jobTitle: profile.role,
    description: profile.tagline,
    ...(profile.email ? { email: `mailto:${profile.email}` } : {}),
    ...(avatarUrl ? { image: avatarUrl } : {}),
    ...(profile.location ? { homeLocation: { '@type': 'Place', name: profile.location } } : {}),
    knowsAbout: profile.skills.flatMap((s) => s.items),
    ...(alumniOf.length ? { alumniOf } : {}),
    ...(sameAs.length ? { sameAs } : {}),
  };
}

/** JSON-LD ProfilePage connecting the About page to the canonical Person. */
export function profilePageJsonLd(profile: Profile) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    '@id': absoluteUrl('/about#profile-page'),
    url: absoluteUrl('/about'),
    name: `About ${profile.name}`,
    description: `${profile.role}. ${profile.tagline}`,
    dateModified: profile.updatedAt.toISOString(),
    inLanguage: 'en',
    isPartOf: { '@id': WEBSITE_ID },
    mainEntity: { '@id': PERSON_ID },
  };
}

/** JSON-LD WebSite. */
export function websiteJsonLd(settings: SiteSettings, profile: Profile) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    name: settings.siteTitle,
    url: SITE_URL,
    description: settings.siteDescription,
    inLanguage: 'en',
    author: { '@type': 'Person', '@id': PERSON_ID, name: profile.name },
  };
}

export function projectJsonLd(project: Project, profile: Profile) {
  const url = absoluteUrl(`/projects/${project.slug}`);

  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareSourceCode',
    '@id': `${url}#software`,
    name: project.title,
    description: project.description,
    url,
    image: project.coverImage
      ? publicImageUrl(project.coverImage)
      : DEFAULT_SOCIAL_IMAGE,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    isPartOf: { '@id': WEBSITE_ID },
    author: { '@type': 'Person', '@id': PERSON_ID, name: profile.name },
    ...(project.repo && isSafeHttpsUrl(project.repo)
      ? { codeRepository: project.repo }
      : {}),
    ...(project.tags.length ? { keywords: project.tags.join(', ') } : {}),
  };
}

export function articleJsonLd(post: Post, profile: Profile) {
  const url = absoluteUrl(`/articles/${post.slug}`);

  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    '@id': `${url}#article`,
    headline: post.title,
    description: post.excerpt,
    datePublished: new Date(post.publishedAt).toISOString(),
    dateModified: new Date(post.updatedAt).toISOString(),
    author: { '@type': 'Person', '@id': PERSON_ID, name: profile.name },
    publisher: { '@type': 'Person', '@id': PERSON_ID, name: profile.name },
    keywords: post.tags.join(', '),
    url,
    image: post.coverImage
      ? publicImageUrl(post.coverImage)
      : DEFAULT_SOCIAL_IMAGE,
    isPartOf: { '@id': WEBSITE_ID },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
  };
}

/** JSON-LD BreadcrumbList for a section. */
export function breadcrumbJsonLd(
  items: { name: string; path: string }[]
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    '@id': `${absoluteUrl(items.at(-1)?.path ?? '/')}#breadcrumb`,
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}
