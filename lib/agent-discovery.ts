import { contentClusterMarkdownLines } from './content-relations';
import type { Post, Profile, Project, SiteSettings } from './db/schema';
import { escapeMarkdownText } from './discovery';
import {
  HOMEPAGE_DELIVERY_INTRO,
  HOMEPAGE_DELIVERY_STAGES,
  HOMEPAGE_ENGINEERING_PRINCIPLES,
} from './homepage-content';
import { profileAvailabilityCopy } from './profile-content';
import { absoluteUrl } from './site-config';

export interface AgentDiscoveryData {
  profile: Profile;
  projects: Project[];
  posts: Post[];
  settings: SiteSettings;
}

function timestamp(value: Date | string): number {
  const result = new Date(value).getTime();
  return Number.isFinite(result) ? result : 0;
}

function latestUpdatedAt(data: AgentDiscoveryData): string {
  const latest = Math.max(
    timestamp(data.profile.updatedAt),
    timestamp(data.settings.updatedAt),
    ...data.projects.map((project) => timestamp(project.updatedAt)),
    ...data.posts.map((post) => timestamp(post.updatedAt)),
  );
  return new Date(latest || 0).toISOString();
}

function yamlString(value: string): string {
  return JSON.stringify(value.replace(/[\u0000-\u001f\u007f]+/g, ' ').trim());
}

function quotedMarkdown(value: string): string {
  const safe = value
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
    .replaceAll('<', '\\<')
    .replaceAll('>', '\\>')
    .trim();

  if (!safe) return '> No additional details provided.';
  return safe
    .split('\n')
    .map((line) => (line ? `> ${line}` : '>'))
    .join('\n');
}

function canonicalLinks(): string[] {
  return [
    `- [Home](${absoluteUrl('/')}): portfolio overview and selected work`,
    `- [About](${absoluteUrl('/about')}): background, experience, and skills`,
    `- [Projects](${absoluteUrl('/projects')}): engineering project index`,
    `- [Articles](${absoluteUrl('/articles')}): technical writing index`,
    `- [GitHub](${absoluteUrl('/github')}): public repository activity`,
    `- [Glossary](${absoluteUrl('/glossary')}): terminology used across the portfolio`,
    `- [Contact](${absoluteUrl('/contact')}): project, role, and collaboration inquiries`,
  ];
}

export function buildHomepageMarkdown(data: AgentDiscoveryData): string {
  const { profile, projects, posts, settings } = data;
  const lines = [
    '---',
    `title: ${yamlString(settings.siteTitle)}`,
    `description: ${yamlString(settings.siteDescription)}`,
    `canonical: ${yamlString(absoluteUrl('/'))}`,
    `last_modified: ${yamlString(latestUpdatedAt(data))}`,
    `last_updated: ${yamlString(latestUpdatedAt(data))}`,
    '---',
    '',
    `# ${escapeMarkdownText(profile.name)}`,
    '',
    `> ${escapeMarkdownText(profile.tagline)}`,
    '',
    `${escapeMarkdownText(profile.role)}${
      profile.location ? ` — ${escapeMarkdownText(profile.location)}` : ''
    }`,
    '',
    escapeMarkdownText(profile.heroDescription),
    '',
    '## About',
    '',
    ...profile.bio.flatMap((paragraph) => [escapeMarkdownText(paragraph), '']),
    '## What production-ready means in my work',
    '',
    ...HOMEPAGE_ENGINEERING_PRINCIPLES.flatMap((principle) => [
      `### ${escapeMarkdownText(principle.title)}`,
      '',
      escapeMarkdownText(principle.body),
      '',
      `[${escapeMarkdownText(principle.linkLabel)}](${absoluteUrl(principle.href)})`,
      '',
    ]),
    '### How work moves from prototype to release',
    '',
    escapeMarkdownText(HOMEPAGE_DELIVERY_INTRO),
    '',
    ...HOMEPAGE_DELIVERY_STAGES.flatMap((stage) => {
      const heading = escapeMarkdownText(`${stage.order} — ${stage.title}`);
      return [`#### ${heading}`, '', escapeMarkdownText(stage.body), ''];
    }),
    '## Engineering domains',
    '',
    ...contentClusterMarkdownLines(data.projects, data.posts, {
      headingLevel: 3,
      escapeText: escapeMarkdownText,
      projectUrl: (slug) => absoluteUrl(`/projects/${slug}`),
      articleUrl: (slug) => absoluteUrl(`/articles/${slug}`),
    }),
    '## Selected projects',
    '',
    ...projects.slice(0, 6).map(
      (project) =>
        `- [${escapeMarkdownText(project.title)}](${absoluteUrl(`/projects/${project.slug}`)}): ${escapeMarkdownText(project.description)}`,
    ),
    '',
    '## Recent articles',
    '',
    ...posts.slice(0, 6).map(
      (post) =>
        `- [${escapeMarkdownText(post.title)}](${absoluteUrl(`/articles/${post.slug}`)}): ${escapeMarkdownText(post.excerpt)}`,
    ),
    '',
    '## Sitemap',
    '',
    ...canonicalLinks(),
    '',
    '## Machine-readable resources',
    '',
    `- [Human-readable Markdown sitemap](${absoluteUrl('/sitemap.md')})`,
    `- [Concise LLM context](${absoluteUrl('/llms.txt')})`,
    `- [Full LLM context](${absoluteUrl('/llms-full.txt')})`,
    `- [Agent instructions](${absoluteUrl('/AGENTS.md')})`,
    `- [XML sitemap](${absoluteUrl('/sitemap.xml')})`,
    `- [RSS feed](${absoluteUrl('/feed.xml')})`,
    '',
  ];

  return `${lines.join('\n').trim()}\n`;
}

export function buildMarkdownSitemap(data: AgentDiscoveryData): string {
  const lines = [
    '# oaslananka.dev sitemap',
    '',
    'A human-readable map of the canonical portfolio, technical writing, and machine-discovery resources.',
    '',
    '## Main pages',
    '',
    ...canonicalLinks(),
    '',
    '## Engineering domains',
    '',
    ...contentClusterMarkdownLines(data.projects, data.posts, {
      headingLevel: 3,
      escapeText: escapeMarkdownText,
      projectUrl: (slug) => absoluteUrl(`/projects/${slug}`),
      articleUrl: (slug) => absoluteUrl(`/articles/${slug}`),
    }),
    '## Projects',
    '',
    ...data.projects.map(
      (project) =>
        `- [${escapeMarkdownText(project.title)}](${absoluteUrl(`/projects/${project.slug}`)}): ${escapeMarkdownText(project.description)}`,
    ),
    '',
    '## Articles',
    '',
    ...data.posts.map(
      (post) =>
        `- [${escapeMarkdownText(post.title)}](${absoluteUrl(`/articles/${post.slug}`)}): ${escapeMarkdownText(post.excerpt)}`,
    ),
    '',
    '## Machine-readable resources',
    '',
    `- [Homepage Markdown mirror](${absoluteUrl('/index.md')}): clean Markdown representation of the homepage`,
    `- [Agent instructions](${absoluteUrl('/AGENTS.md')}): repository and verification guidance`,
    `- [Concise LLM context](${absoluteUrl('/llms.txt')}): compact site summary`,
    `- [Full LLM context](${absoluteUrl('/llms-full.txt')}): complete project and article context`,
    `- [XML sitemap](${absoluteUrl('/sitemap.xml')}): crawler-oriented URL index`,
    `- [RSS feed](${absoluteUrl('/feed.xml')}): published article feed`,
    '',
  ];

  return `${lines.join('\n').trim()}\n`;
}

export function buildLlmsFullText(data: AgentDiscoveryData): string {
  const { profile, projects, posts, settings } = data;
  const lines: string[] = [
    `# ${escapeMarkdownText(profile.name)} — full portfolio context`,
    '',
    `> ${escapeMarkdownText(settings.siteDescription)}`,
    '',
    `Canonical site: ${absoluteUrl('/')}`,
    `Last updated: ${latestUpdatedAt(data)}`,
    '',
    '## Profile',
    '',
    `- Role: ${escapeMarkdownText(profile.role)}`,
    `- Location: ${escapeMarkdownText(profile.location)}`,
    `- Availability: ${profileAvailabilityCopy(profile.availableForWork)}`,
    '',
    ...profile.bio.flatMap((paragraph) => [escapeMarkdownText(paragraph), '']),
    '## Expertise',
    '',
    ...profile.skills.map(
      (group) =>
        `- **${escapeMarkdownText(group.category)}:** ${group.items.map(escapeMarkdownText).join(', ')}`,
    ),
    '',
    '## Experience',
    '',
  ];

  profile.experience.forEach((experience) => {
    lines.push(
      `### ${escapeMarkdownText(experience.role)}${
        experience.company ? ` — ${escapeMarkdownText(experience.company)}` : ''
      }`,
      '',
      `Period: ${escapeMarkdownText(experience.period)}`,
      '',
    );
    if (experience.description) {
      lines.push(escapeMarkdownText(experience.description), '');
    }
    experience.points.forEach((point) => {
      lines.push(`- ${escapeMarkdownText(point)}`);
    });
    lines.push('');
  });

  if (profile.education.length) {
    lines.push('## Education', '');
    profile.education.forEach((item) => {
      lines.push(
        `### ${escapeMarkdownText(item.institution)}`,
        '',
        escapeMarkdownText(item.qualification),
        '',
      );
      if (item.details) lines.push(escapeMarkdownText(item.details), '');
    });
  }

  lines.push(
    '## Engineering domains',
    '',
    ...contentClusterMarkdownLines(data.projects, data.posts, {
      headingLevel: 3,
      escapeText: escapeMarkdownText,
      projectUrl: (slug) => absoluteUrl(`/projects/${slug}`),
      articleUrl: (slug) => absoluteUrl(`/articles/${slug}`),
    }),
    '## Projects',
    '',
  );
  projects.forEach((project) => {
    lines.push(
      `### ${escapeMarkdownText(project.title)}`,
      '',
      `Canonical URL: ${absoluteUrl(`/projects/${project.slug}`)}`,
      `Role: ${escapeMarkdownText(project.role)}`,
      `Tags: ${project.tags.map(escapeMarkdownText).join(', ')}`,
      '',
      escapeMarkdownText(project.description),
      '',
    );
    if (project.outcomes.length) {
      lines.push('Outcomes:', '');
      project.outcomes.forEach((outcome) => {
        lines.push(`- ${escapeMarkdownText(outcome)}`);
      });
      lines.push('');
    }
    lines.push('Details:', '', quotedMarkdown(project.longDescription), '');
  });

  lines.push('## Articles', '');
  posts.forEach((post) => {
    lines.push(
      `### ${escapeMarkdownText(post.title)}`,
      '',
      `Canonical URL: ${absoluteUrl(`/articles/${post.slug}`)}`,
      `Published: ${new Date(post.publishedAt).toISOString()}`,
      `Updated: ${new Date(post.updatedAt).toISOString()}`,
      `Tags: ${post.tags.map(escapeMarkdownText).join(', ')}`,
      '',
      escapeMarkdownText(post.excerpt),
      '',
      'Full article:',
      '',
      quotedMarkdown(post.body),
      '',
    );
  });

  lines.push('## Sitemap', '', ...canonicalLinks(), '');
  return `${lines.join('\n').trim()}\n`;
}

export const AGENT_INSTRUCTIONS = `# AGENTS.md — oaslananka.dev

These instructions apply to the complete repository and public portfolio.

## Installation

Use the pinned JavaScript toolchain and the lockfile-only installation path:

\`\`\`bash
nvm install
nvm use
npm ci
python -m pip install --requirement requirements-security.txt
\`\`\`

## Configuration

Runtime secrets are managed through Doppler. Never create or commit production environment files.

\`\`\`bash
doppler setup --project oaslananka-dev-vscode-portfolio --config dev
doppler secrets --only-names
doppler run --config dev -- npm run db:migrate
doppler run --config dev -- npm run db:preflight
\`\`\`

Local development requires the isolated \`dev\` config. If Doppler only offers \`prod\`, do not use production services for local work; provision/populate \`dev\` first. Always pass \`--config\` explicitly instead of relying on directory-scoped Doppler state.

Production content is database-backed and fails closed. Never enable bundled default content in production. Apply migrations only with an explicitly selected Doppler configuration.

## Usage

Run the development site and inspect the main public surfaces:

\`\`\`bash
doppler run --config dev -- npm run dev
curl --fail http://localhost:3000/llms.txt
curl --fail http://localhost:3000/sitemap.md
curl --fail --header 'Accept: text/markdown' http://localhost:3000/
\`\`\`

Content is managed through \`/admin\`; public pages must not expose admin, message, credential, or rate-limit data.

## Verification

Before proposing a change, run the checks that match the modified surface:

\`\`\`bash
npm run verify
pre-commit run --all-files
npm run build
\`\`\`

Database and browser tests use disposable PostgreSQL only. Do not point tests, seeds, restore drills, or exploratory commands at production.

## Safety boundaries

- Do not commit secrets, generated credentials, database dumps, or local environment files.
- Preserve canonical URLs, noindex preview behavior, robots separation, and Markdown/HTML content parity.
- Keep GitHub Actions pinned to immutable commit SHAs.
- Do not force dependency upgrades or bypass branch protection to merge failing changes.
- Treat ERC, DRC, simulation, and estimation outputs as evidence for human review, not autonomous engineering sign-off.
`;
