import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { buildRobotsFile } from '../app/robots';
import { isPreviewDeployment } from '../lib/deployment-environment';
import {
  buildLlmsText,
  buildRssXml,
  decodeXmlText,
} from '../lib/discovery';
import type {
  Post,
  Profile,
  Project,
  SiteSettings,
} from '../lib/db/schema';
import {
  PERSON_ID,
  WEBSITE_ID,
  articleJsonLd,
  buildPageMetadata,
  buildRobotsMetadata,
  buildRootMetadata,
  personJsonLd,
  projectJsonLd,
  serializeJsonLd,
  websiteJsonLd,
} from '../lib/seo';
import { SITE_URL, absoluteUrl } from '../lib/site-config';

const now = new Date('2026-07-14T12:00:00.000Z');

const profile: Profile = {
  id: 1,
  name: 'Oğuz Aslan Anka',
  role: 'Software Engineer',
  tagline: 'Embedded systems and developer tooling',
  greeting: "Hello, I'm",
  heroDescription: 'I build reliable engineering tools.',
  location: 'Türkiye',
  email: 'hello@example.com',
  avatarUrl: '',
  resumeUrl: '',
  availableForWork: true,
  bio: ['Engineer focused on reliable systems.'],
  socials: [{ platform: 'github', label: 'GitHub', url: 'https://github.com/oaslananka' }],
  skills: [{ category: 'Languages', items: ['TypeScript', 'Python'] }],
  experience: [],
  education: [
    {
      institution: 'Ege University',
      qualification: 'M.Sc., Civil & Structural Engineering',
      details: 'Thesis: Structural Health Monitoring',
    },
    {
      institution: 'Ege University',
      qualification: 'B.Eng., Civil & Structural Engineering',
      details: '',
    },
    {
      institution: 'Middle East Technical University',
      qualification: 'B.Ed., Elementary Science Education',
      details: '',
    },
  ],
  writing: [],
  updatedAt: now,
};

const settings: SiteSettings = {
  id: 1,
  siteTitle: 'Oğuz Aslan Anka - Portfolio',
  siteDescription: 'Engineering portfolio and technical writing.',
  keywords: ['embedded systems', 'developer tooling'],
  defaultTheme: 'github-dark',
  ogHeading: '',
  updatedAt: now,
};

const project: Project = {
  id: 1,
  slug: 'safe-project',
  title: 'Safe Project',
  description: 'A verified project.',
  longDescription: '',
  role: 'Developer',
  logo: '',
  coverImage: '',
  coverImageAlt: '',
  link: '',
  repo: 'https://github.com/oaslananka/safe-project',
  tags: ['TypeScript'],
  outcomes: [],
  media: [],
  links: [],
  featured: true,
  sortOrder: 1,
  createdAt: now,
  updatedAt: now,
};

const post: Post = {
  id: 1,
  slug: 'safe-article',
  title: 'Safe Article',
  excerpt: 'A practical engineering article.',
  body: '# Duplicate heading',
  coverImage: '',
  tags: ['Engineering'],
  published: true,
  publishedAt: now,
  createdAt: now,
  updatedAt: now,
};

test('JSON-LD serialization neutralizes script-breaking content', () => {
  const payload = { value: '</script><script>alert(1)</script>&\u2028\u2029' };
  const serialized = serializeJsonLd(payload);

  assert.equal(serialized.includes('</script>'), false);
  assert.equal(serialized.includes('<'), false);
  assert.equal(serialized.includes('&'), false);
  assert.equal(serialized.includes('\u2028'), false);
  assert.equal(serialized.includes('\u2029'), false);
  assert.deepEqual(JSON.parse(serialized), payload);
});

test('page metadata has a self canonical and complete social cards', () => {
  const metadata = buildPageMetadata({
    title: 'Projects',
    description: 'Selected projects.',
    path: '/projects',
  });
  const alternates = metadata.alternates as { canonical: string };
  const openGraph = metadata.openGraph as {
    title: string;
    url: string;
    images: { url: string; width: number; height: number }[];
  };
  const twitter = metadata.twitter as { title: string; images: { url: string }[] };

  assert.equal(alternates.canonical, absoluteUrl('/projects'));
  assert.equal(
    (alternates as { types?: Record<string, string> }).types?.['text/markdown'],
    absoluteUrl('/projects.md'),
  );
  assert.equal(openGraph.title, 'Projects');
  assert.equal(openGraph.url, absoluteUrl('/projects'));
  assert.deepEqual(
    [openGraph.images[0].width, openGraph.images[0].height],
    [1200, 630],
  );
  assert.equal(twitter.title, 'Projects');
  assert.match(twitter.images[0].url, /^https?:\/\//);
});

test('dynamic pages leave social images to the file convention', () => {
  const metadata = buildPageMetadata({
    title: 'Article',
    description: 'A technical article.',
    path: '/articles/article',
    useFileConventionImage: true,
  });
  const openGraph = metadata.openGraph as { images?: unknown };
  const twitter = metadata.twitter as { images?: unknown };

  assert.equal(openGraph.images, undefined);
  assert.equal(twitter.images, undefined);
  assert.equal(
    (metadata.alternates as { types?: Record<string, string> }).types?.[
      'text/markdown'
    ],
    absoluteUrl('/articles/article.md'),
  );
});

test('root metadata does not leak a homepage canonical and advertises RSS', () => {
  const metadata = buildRootMetadata(settings, profile);
  const alternates = metadata.alternates as {
    canonical?: string;
    types: Record<string, string>;
  };

  assert.equal(alternates.canonical, undefined);
  assert.equal(alternates.types['application/rss+xml'], absoluteUrl('/feed.xml'));
  assert.deepEqual(buildRobotsMetadata(true), {
    index: false,
    follow: false,
    nocache: true,
  });
});

test('person identity links the public alias and canonical external profiles', () => {
  const canonical = new URL(SITE_URL);
  const alternateHost = canonical.hostname.startsWith('www.')
    ? canonical.hostname.slice(4)
    : `www.${canonical.hostname}`;
  const alternateSiteUrl = new URL(canonical.toString());
  alternateSiteUrl.hostname = alternateHost;

  const person = personJsonLd({
    ...profile,
    name: 'Osman Aslan',
    socials: [
      { platform: 'github', label: 'GitHub', url: 'https://github.com/oaslananka' },
      { platform: 'github-copy', label: 'GitHub duplicate', url: 'https://github.com/oaslananka/' },
      { platform: 'linkedin', label: 'LinkedIn', url: 'https://www.linkedin.com/in/oaslananka' },
      { platform: 'website', label: 'Website', url: alternateSiteUrl.toString() },
      { platform: 'website-www', label: 'Website canonical', url: absoluteUrl('/about') },
      { platform: 'email', label: 'Email', url: 'mailto:info@oaslananka.dev' },
    ],
  });

  assert.equal(person.alternateName, 'oaslananka');
  assert.deepEqual(person.sameAs, [
    'https://github.com/oaslananka',
    'https://www.linkedin.com/in/oaslananka',
    'https://pypi.org/user/oaslananka/',
    'https://www.npmjs.com/~oaslananka',
    'https://peerlist.io/oaslananka',
  ]);
});

test('education institutions are deduplicated in Person structured data', () => {
  assert.deepEqual(personJsonLd(profile).alumniOf, [
    { '@type': 'EducationalOrganization', name: 'Ege University' },
    {
      '@type': 'EducationalOrganization',
      name: 'Middle East Technical University',
    },
  ]);
});

test('structured data uses stable linked entity identifiers', () => {
  const person = personJsonLd(profile);
  const website = websiteJsonLd(settings, profile);
  const software = projectJsonLd(project, profile);
  const article = articleJsonLd(post, profile);

  assert.equal(person['@id'], PERSON_ID);
  assert.equal(website['@id'], WEBSITE_ID);
  assert.equal(website.author['@id'], PERSON_ID);
  assert.equal(software.author['@id'], PERSON_ID);
  assert.equal(software.url, absoluteUrl('/projects/safe-project'));
  assert.equal(article.author['@id'], PERSON_ID);
  assert.equal(article.image, absoluteUrl('/opengraph-image'));
});

test('structured data drops unsafe legacy resource URLs', () => {
  const software = projectJsonLd(
    {
      ...project,
      coverImage: '//evil.example/cover.png',
      repo: 'javascript:alert(1)',
    },
    profile,
  );

  assert.equal(software.image, absoluteUrl('/opengraph-image'));
  assert.equal('codeRepository' in software, false);
});

test('llms.txt uses canonical internal links and contains no injected headings', () => {
  const text = buildLlmsText({
    profile,
    settings,
    projects: [{ ...project, title: 'Project]\n## Injected' }],
    posts: [{ ...post, excerpt: 'Useful\n# Injected' }],
  });

  assert.match(text, new RegExp(absoluteUrl('/projects/safe-project')));
  assert.doesNotMatch(text, /\n## Injected/);
  assert.doesNotMatch(text, /github\.com\/oaslananka\/safe-project\):/);
  assert.match(text, /\[RSS feed\]\(.*\/feed\.xml\)/);
  assert.match(text, /## Education/);
  assert.match(text, /Ege University/);
  assert.match(text, /Middle East Technical University/);
  assert.match(text, /Open to senior software, edge AI, embedded systems and technical leadership roles/);
  assert.match(text, /mailto:hello@example.com/);
  assert.doesNotMatch(text, /dev\.to/);
  assert.doesNotMatch(text, /oaslananka\.dev\/?\)/);
});

test('RSS escapes database-authored XML and exposes canonical entries', () => {
  const xml = buildRssXml({
    profile,
    settings: { ...settings, siteTitle: 'Engineering & Tools' },
    projects: [],
    posts: [{ ...post, title: '<unsafe> & useful' }],
  });

  assert.match(xml, /<rss version="2\.0"/);
  assert.match(xml, /Engineering &amp; Tools/);
  assert.match(xml, /&lt;unsafe&gt; &amp; useful/);
  assert.match(xml, new RegExp(absoluteUrl('/articles/safe-article')));
  assert.doesNotMatch(xml, /<title><unsafe>/);
});

test('XML decoding does not decode nested entities twice', () => {
  assert.equal(
    decodeXmlText('https://example.com/?a=1&amp;b=2'),
    'https://example.com/?a=1&b=2',
  );
  assert.equal(decodeXmlText('&amp;lt;script&amp;gt;'), '&lt;script&gt;');
});

test('robots separates search discovery from model training', () => {
  const production = JSON.stringify(buildRobotsFile(false));
  const preview = buildRobotsFile(
    isPreviewDeployment({ NODE_ENV: 'production', VERCEL_ENV: 'preview' }),
  );

  assert.match(production, /OAI-SearchBot/);
  assert.match(production, /Claude-SearchBot/);
  assert.match(production, /PerplexityBot/);
  assert.match(production, /GPTBot/);
  assert.match(production, /Google-Extended/);
  assert.deepEqual(preview, { rules: [{ userAgent: '*', disallow: '/' }] });
});


test('About identity metadata uses one absolute full-name title', async () => {
  const source = await readFile(
    new URL('../app/(site)/about/page.tsx', import.meta.url),
    'utf8',
  );

  assert.match(source, /title: `About \${profile\.name} — \${profile\.role}`/);
  assert.match(source, /absoluteTitle: true/);
});
