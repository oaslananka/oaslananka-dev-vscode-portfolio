import assert from 'node:assert/strict';
import test from 'node:test';

import {
  AGENT_INSTRUCTIONS,
  buildHomepageMarkdown,
  buildLlmsFullText,
  buildMarkdownSitemap,
  type AgentDiscoveryData,
} from '../lib/agent-discovery';
import {
  HOMEPAGE_DELIVERY_INTRO,
  HOMEPAGE_DELIVERY_STAGES,
  HOMEPAGE_ENGINEERING_PRINCIPLES,
} from '../lib/homepage-content';
import { acceptsMarkdown } from '../lib/markdown-negotiation';

const now = new Date('2026-07-20T12:00:00.000Z');

const data: AgentDiscoveryData = {
  profile: {
    id: 1,
    name: 'Test Engineer',
    role: 'Edge AI Engineer',
    tagline: 'Reliable physical systems',
    greeting: 'Hello',
    heroDescription: 'Builds dependable systems.',
    location: 'Türkiye',
    email: 'test@example.com',
    avatarUrl: '',
    resumeUrl: '',
    availableForWork: true,
    bio: ['Works across devices and cloud.'],
    socials: [],
    skills: [{ category: 'Languages', items: ['TypeScript', 'Python'] }],
    experience: [
      {
        role: 'Engineer',
        company: 'Example',
        period: '2025 — Present',
        description: 'Builds systems.',
        points: ['Owns verification.'],
      },
    ],
    education: [
      {
        institution: 'Ege University',
        qualification: 'M.Sc., Civil & Structural Engineering',
        details:
          'Thesis: A Big Data– and AI-Driven Embedded Systems Framework for Structural Health Monitoring',
      },
      {
        institution: 'Middle East Technical University',
        qualification: 'B.Ed., Elementary Science Education',
        details: '',
      },
    ],
    writing: [],
    updatedAt: now,
  },
  settings: {
    id: 1,
    siteTitle: 'Test portfolio',
    siteDescription: 'Engineering portfolio.',
    keywords: ['engineering'],
    defaultTheme: 'github-dark',
    ogHeading: '',
    updatedAt: now,
  },
  projects: [
    {
      id: 2,
      slug: 'sismo-smart',
      title: 'Sismo Smart',
      description: 'A privacy-safe sensor-to-alert case study.',
      longDescription:
        '## Public evidence boundary\n\nThis page excludes customer names, deployment quantities and unsupported performance claims.',
      role: 'Founder & Lead Engineer',
      logo: '',
      coverImage: '',
      coverImageAlt: '',
      link: '',
      repo: '',
      tags: ['Embedded Systems', 'IoT'],
      outcomes: ['Reviewable sensor-to-alert boundary'],
      media: [],
      links: [],
      featured: true,
      sortOrder: -1,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 1,
      slug: 'verified-project',
      title: 'Verified Project',
      description: 'A project with evidence.',
      longDescription: '## Design\n\n<script>alert(1)</script>',
      role: 'Maintainer',
      logo: '',
      coverImage: '',
      coverImageAlt: '',
      link: '',
      repo: '',
      tags: ['TypeScript'],
      outcomes: ['Repeatable checks'],
      media: [],
      links: [],
      featured: true,
      sortOrder: 0,
      createdAt: now,
      updatedAt: now,
    },
  ],
  posts: [
    {
      id: 1,
      slug: 'verified-article',
      title: 'Verified Article',
      excerpt: 'An article about verification.',
      body: '# Method\n\nUse evidence.',
      coverImage: '',
      tags: ['Testing'],
      published: true,
      publishedAt: now,
      createdAt: now,
      updatedAt: now,
    },
  ],
};

test('homepage Markdown has frontmatter, canonical context, and a sitemap', () => {
  const markdown = buildHomepageMarkdown(data);

  assert.match(markdown, /^---\ntitle:/);
  assert.match(markdown, /canonical: "https?:\/\//);
  assert.match(markdown, /last_updated:/);
  assert.match(markdown, /## Sitemap/);
  assert.match(markdown, /\/glossary/);
  assert.match(markdown, /\/AGENTS\.md/);
  assert.match(markdown, /## What production-ready means in my work/);
  for (const principle of HOMEPAGE_ENGINEERING_PRINCIPLES) {
    assert.ok(markdown.includes(`### ${principle.title}`));
    assert.ok(markdown.includes(principle.body));
    assert.ok(markdown.includes(principle.href));
  }
  assert.ok(markdown.includes('### How work moves from prototype to release'));
  assert.ok(markdown.includes(HOMEPAGE_DELIVERY_INTRO));
  for (const stage of HOMEPAGE_DELIVERY_STAGES) {
    assert.ok(markdown.includes(`#### ${stage.order} — ${stage.title}`));
    assert.ok(markdown.includes(stage.body));
  }
});

test('Markdown sitemap has multiple descriptive sections and canonical links', () => {
  const markdown = buildMarkdownSitemap(data);

  assert.ok((markdown.match(/^## /gm) ?? []).length >= 4);
  assert.match(markdown, /\[Verified Project\]\(.*\/projects\/verified-project\):/);
  assert.match(markdown, /\[Verified Article\]\(.*\/articles\/verified-article\):/);
  assert.match(markdown, /Homepage Markdown mirror/);
  assert.match(markdown, /## Engineering domains/);
});

test('full LLM context contains authored details without executable HTML', () => {
  const text = buildLlmsFullText(data);

  assert.match(text, /## Projects/);
  assert.match(text, /## Articles/);
  assert.match(text, /Full article:/);
  assert.equal(text.includes('<script>'), false);
  assert.match(text, /\\<script\\>/);
  assert.match(
    text,
    /Open to senior software, edge AI, embedded systems and technical leadership roles; selected consulting engagements considered\./,
  );
});

test('Sismo Smart appears in homepage, sitemap, and full LLM discovery', () => {
  const outputs = [
    buildHomepageMarkdown(data),
    buildMarkdownSitemap(data),
    buildLlmsFullText(data),
  ];

  for (const output of outputs) {
    assert.match(output, /\/projects\/sismo-smart/);
  }
  assert.match(buildLlmsFullText(data), /## Public evidence boundary/);
});

test('education appears in About Markdown and full LLM context', async () => {
  const { buildCanonicalPageMarkdown } = await import('../lib/page-markdown');
  const about = buildCanonicalPageMarkdown('/about', data);
  assert.ok(about);

  for (const output of [about.body, buildLlmsFullText(data)]) {
    assert.match(output, /## Education/);
    assert.match(output, /Ege University/);
    assert.match(output, /M\.Sc\., Civil & Structural Engineering/);
    assert.match(
      output,
      /A Big Data– and AI-Driven Embedded Systems Framework for Structural Health Monitoring/,
    );
    assert.match(output, /Middle East Technical University/);
  }
});

test('agent instructions contain concrete installation, configuration, and usage commands', () => {
  assert.match(AGENT_INSTRUCTIONS, /## Installation/);
  assert.match(AGENT_INSTRUCTIONS, /## Configuration/);
  assert.match(AGENT_INSTRUCTIONS, /## Usage/);
  assert.match(AGENT_INSTRUCTIONS, /nvm install/);
  assert.match(AGENT_INSTRUCTIONS, /npm ci/);
  assert.match(AGENT_INSTRUCTIONS, /npm run verify/);
  assert.match(AGENT_INSTRUCTIONS, /npm run db:preflight/);
  assert.match(AGENT_INSTRUCTIONS, /doppler run --config dev/);
  assert.match(AGENT_INSTRUCTIONS, /If Doppler only offers `prod`/);
  assert.match(AGENT_INSTRUCTIONS, /Accept: text\/markdown/);
});

test('Markdown content negotiation requires an explicit positive media type', () => {
  assert.equal(acceptsMarkdown('text/markdown'), true);
  assert.equal(acceptsMarkdown('text/html, text/markdown;q=0.8'), true);
  assert.equal(acceptsMarkdown('text/markdown;q=0'), false);
  assert.equal(acceptsMarkdown('text/html, */*'), false);
  assert.equal(acceptsMarkdown(null), false);
});

test('canonical Markdown path helpers accept only public sitemap routes', async () => {
  const {
    advertisedMarkdownPath,
    canonicalPathFromMarkdownPath,
    markdownMirrorPath,
    normalizeCanonicalPublicPath,
  } = await import('../lib/public-markdown-path');

  assert.equal(normalizeCanonicalPublicPath('/about/'), '/about');
  assert.equal(normalizeCanonicalPublicPath('/projects/verified-project'), '/projects/verified-project');
  assert.equal(normalizeCanonicalPublicPath('/admin'), null);
  assert.equal(normalizeCanonicalPublicPath('/articles/Bad Slug'), null);
  assert.equal(markdownMirrorPath('/'), '/.md');
  assert.equal(advertisedMarkdownPath('/'), '/index.md');
  assert.equal(advertisedMarkdownPath('/about'), '/about.md');
  assert.equal(canonicalPathFromMarkdownPath('/.md'), '/');
  assert.equal(canonicalPathFromMarkdownPath('/projects/verified-project.md'), '/projects/verified-project');
  assert.equal(canonicalPathFromMarkdownPath('/admin.md'), null);
});

test('every canonical Markdown document has frontmatter, canonical URL, and sitemap', async () => {
  const { buildCanonicalPageMarkdown } = await import('../lib/page-markdown');
  const paths = [
    '/',
    '/about',
    '/projects',
    '/projects/verified-project',
    '/articles',
    '/articles/verified-article',
    '/github',
    '/glossary',
    '/contact',
    '/privacy',
  ];

  for (const path of paths) {
    const document = buildCanonicalPageMarkdown(path, data);
    assert.ok(document, path);
    assert.equal(document.canonicalPath, path);
    assert.match(document.body, /^---\ntitle:/, path);
    assert.match(document.body, new RegExp(`canonical: .*${path === '/' ? '/"' : path.replaceAll('/', '\\/')}`), path);
    assert.match(document.body, /last_updated:/, path);
    assert.match(document.body, /## Sitemap/, path);
    assert.equal(
      document.body.split('\n').some((line) => line.startsWith('<script>')),
      false,
      path,
    );
  }
});

test('authored Markdown keeps blockquotes while neutralizing HTML starts', async () => {
  const { buildCanonicalPageMarkdown } = await import('../lib/page-markdown');
  const customized = structuredClone(data);
  const verifiedProject = customized.projects.find(
    (project) => project.slug === 'verified-project',
  );
  assert.ok(verifiedProject);
  verifiedProject.longDescription =
    '> A valid blockquote\n\n<script>alert(1)</script>';

  const document = buildCanonicalPageMarkdown(
    '/projects/verified-project',
    customized,
  );
  assert.ok(document);
  assert.match(document.body, /^> A valid blockquote$/m);
  assert.equal(
    document.body.split('\n').some((line) => line.startsWith('<script>')),
    false,
  );
  assert.equal(document.body.includes('\\<script>alert(1)\\</script>'), true);
});

test('index documents select the latest date after parsing serialized timestamps', async () => {
  const { buildCanonicalPageMarkdown } = await import('../lib/page-markdown');
  const customized = structuredClone(data) as AgentDiscoveryData;
  customized.profile.updatedAt = new Date('2026-01-01T00:00:00.000Z');
  customized.projects[0]!.updatedAt = '2026-07-21T00:00:00.000Z' as unknown as Date;
  customized.settings.updatedAt = new Date('2026-01-01T00:00:00.000Z');
  customized.posts[0]!.updatedAt = '2026-07-22T00:00:00.000Z' as unknown as Date;

  const projects = buildCanonicalPageMarkdown('/projects', customized);
  const articles = buildCanonicalPageMarkdown('/articles', customized);
  assert.ok(projects);
  assert.ok(articles);
  assert.match(projects.body, /last_modified: "2026-07-21T00:00:00.000Z"/);
  assert.match(articles.body, /last_modified: "2026-07-22T00:00:00.000Z"/);
});

test('dynamic Markdown documents reject unknown and unpublished records', async () => {
  const { buildCanonicalPageMarkdown } = await import('../lib/page-markdown');

  assert.equal(buildCanonicalPageMarkdown('/projects/missing-project', data), null);
  assert.equal(buildCanonicalPageMarkdown('/articles/missing-article', data), null);
  assert.equal(buildCanonicalPageMarkdown('/admin', data), null);
});


test('About identity Markdown links the full name, alias, and verified profiles', async () => {
  const { buildCanonicalPageMarkdown } = await import('../lib/page-markdown');
  const customized = structuredClone(data) as AgentDiscoveryData;
  customized.profile.name = 'Osman *Aslan*';
  customized.profile.role = 'Edge [AI] & Embedded Systems Engineer';
  customized.profile.socials = [
    { platform: 'github', label: 'GitHub', url: 'https://github.com/oaslananka' },
    { platform: 'linkedin', label: 'LinkedIn', url: 'https://www.linkedin.com/in/oaslananka' },
    { platform: 'dev', label: 'DEV', url: ['https://dev.to', 'oaslananka'].join('/') },
    { platform: 'pypi', label: 'PyPI', url: 'https://pypi.org/user/oaslananka/' },
    { platform: 'npm', label: 'npm', url: 'https://www.npmjs.com/~oaslananka' },
    { platform: 'peerlist', label: 'Peerlist', url: 'https://peerlist.io/oaslananka' },
    { platform: 'website', label: 'Website', url: 'https://www.oaslananka.dev' },
    { platform: 'email', label: 'Email', url: 'mailto:info@oaslananka.dev' },
  ];

  const document = buildCanonicalPageMarkdown('/about', customized);
  assert.ok(document);
  assert.ok(
    document.body.includes(
      'Osman \\*Aslan\\*, known online as **oaslananka**, is an Edge \\[AI\\] & Embedded Systems Engineer.',
    ),
  );
  assert.match(document.body, /## Verified profiles/);

  for (const profileUrl of customized.profile.socials
    .filter((social) =>
      ['github', 'linkedin', 'pypi', 'npm', 'peerlist'].includes(
        social.platform,
      ),
    )
    .map((social) => social.url)) {
    assert.match(
      document.body,
      new RegExp(profileUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    );
  }
  assert.doesNotMatch(document.body, /## Verified profiles[\s\S]*dev\.to/);
  assert.doesNotMatch(document.body, /## Verified profiles[\s\S]*oaslananka\.dev/);
  assert.doesNotMatch(document.body, /## Verified profiles[\s\S]*mailto:/);
});
