import type { AgentDiscoveryData } from './agent-discovery';
import { contentClusterMarkdownLines } from './content-relations';
import { buildHomepageMarkdown } from './agent-discovery';
import { escapeMarkdownText } from './discovery';
import { GLOSSARY_GROUPS } from './glossary';
import {
  PERSON_ALTERNATE_NAME,
  personIdentityStatement,
  publicContactChannels,
  publicIdentityProfiles,
} from './person-identity';
import { profileAvailabilityCopy } from './profile-content';
import { normalizeCanonicalPublicPath } from './public-markdown-path';
import { GITHUB_USERNAME, absoluteUrl } from './site-config';
import { isSafeHttpsUrl } from './url-policy';

export interface CanonicalMarkdownDocument {
  canonicalPath: string;
  body: string;
}

function yamlString(value: string): string {
  return JSON.stringify(value.replace(/[\u0000-\u001f\u007f]+/g, ' ').trim());
}

function safeAuthoredMarkdown(value: string): string {
  return value
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
    .replaceAll('<', '\\<')
    .trim();
}


function latestDate(
  initial: Date | string,
  values: readonly (Date | string)[],
): Date | string {
  return values.reduce<Date | string>((latest, value) => {
    const latestTimestamp = new Date(latest).getTime();
    const valueTimestamp = new Date(value).getTime();
    return Number.isFinite(valueTimestamp) && valueTimestamp > latestTimestamp
      ? value
      : latest;
  }, initial);
}

function frontmatter(input: {
  title: string;
  description: string;
  canonicalPath: string;
  updatedAt: Date | string;
}): string[] {
  return [
    '---',
    `title: ${yamlString(input.title)}`,
    `description: ${yamlString(input.description)}`,
    `canonical: ${yamlString(absoluteUrl(input.canonicalPath))}`,
    `last_modified: ${yamlString(new Date(input.updatedAt).toISOString())}`,
    `last_updated: ${yamlString(new Date(input.updatedAt).toISOString())}`,
    '---',
    '',
  ];
}

function sitemapLines(): string[] {
  return [
    '## Sitemap',
    '',
    `- [Home](${absoluteUrl('/')})`,
    `- [About](${absoluteUrl('/about')})`,
    `- [Projects](${absoluteUrl('/projects')})`,
    `- [Articles](${absoluteUrl('/articles')})`,
    `- [GitHub](${absoluteUrl('/github')})`,
    `- [Glossary](${absoluteUrl('/glossary')})`,
    `- [Contact](${absoluteUrl('/contact')})`,
    `- [Privacy](${absoluteUrl('/privacy')})`,
    `- [Markdown sitemap](${absoluteUrl('/sitemap.md')})`,
    '',
  ];
}

function finish(lines: string[]): string {
  return `${lines.join('\n').trim()}\n`;
}

function buildAboutMarkdown(data: AgentDiscoveryData): string {
  const { profile } = data;
  const lines = [
    ...frontmatter({
      title: `About ${profile.name}`,
      description: `${profile.role}. ${profile.tagline}`,
      canonicalPath: '/about',
      updatedAt: profile.updatedAt,
    }),
    `# About ${escapeMarkdownText(profile.name)}`,
    '',
    personIdentityStatement(
      escapeMarkdownText(profile.name),
      escapeMarkdownText(profile.role),
    ).replace(
      PERSON_ALTERNATE_NAME,
      `**${PERSON_ALTERNATE_NAME}**`,
    ),
    '',
    `> ${escapeMarkdownText(profile.tagline)}`,
    '',
    ...profile.bio.flatMap((paragraph) => [escapeMarkdownText(paragraph), '']),
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
    experience.points.forEach((point) => lines.push(`- ${escapeMarkdownText(point)}`));
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

  if (profile.skills.length) {
    lines.push(
      '## Skills',
      '',
      ...profile.skills.map(
        (group) =>
          `- **${escapeMarkdownText(group.category)}:** ${group.items.map(escapeMarkdownText).join(', ')}`,
      ),
      '',
    );
  }

  const verifiedProfiles = publicIdentityProfiles(profile.socials);
  if (verifiedProfiles.length) {
    lines.push(
      '## Verified profiles',
      '',
      ...verifiedProfiles.map(
        (social) =>
          `- [${escapeMarkdownText(`${profile.name} on ${social.label}`)}](${social.url})`,
      ),
      '',
    );
  }

  if (profile.writing.length) {
    lines.push(
      '## Writing',
      '',
      ...profile.writing.map(
        (item) => `- [${escapeMarkdownText(item.label)}](${item.url})`,
      ),
      '',
    );
  }

  lines.push(...sitemapLines());
  return finish(lines);
}

function buildProjectsMarkdown(data: AgentDiscoveryData): string {
  return finish([
    ...frontmatter({
      title: 'Engineering projects',
      description: 'Selected edge AI, embedded systems, IoT, EDA, and developer-tool projects.',
      canonicalPath: '/projects',
      updatedAt: latestDate(
        data.profile.updatedAt,
        data.projects.map((project) => project.updatedAt),
      ),
    }),
    '# Engineering projects',
    '',
    'The portfolio is organized around three connected engineering domains. Each domain combines implementation evidence with technical analysis.',
    '',
    ...contentClusterMarkdownLines(data.projects, data.posts, {
      headingLevel: 2,
      escapeText: escapeMarkdownText,
      projectUrl: (slug) => absoluteUrl(`/projects/${slug}`),
      articleUrl: (slug) => absoluteUrl(`/articles/${slug}`),
    }),
    ...data.projects.flatMap((project) => [
      `## [${escapeMarkdownText(project.title)}](${absoluteUrl(`/projects/${project.slug}`)})`,
      '',
      escapeMarkdownText(project.description),
      '',
      `- Role: ${escapeMarkdownText(project.role || 'Project owner')}`,
      `- Technologies: ${project.tags.map(escapeMarkdownText).join(', ')}`,
      '',
    ]),
    ...sitemapLines(),
  ]);
}

function buildProjectMarkdown(
  canonicalPath: string,
  slug: string,
  data: AgentDiscoveryData,
): string | null {
  const project = data.projects.find((candidate) => candidate.slug === slug);
  if (!project) return null;

  return finish([
    ...frontmatter({
      title: project.title,
      description: project.description,
      canonicalPath,
      updatedAt: project.updatedAt,
    }),
    `# ${escapeMarkdownText(project.title)}`,
    '',
    `> ${escapeMarkdownText(project.description)}`,
    '',
    `- Role: ${escapeMarkdownText(project.role || 'Project owner')}`,
    `- Technologies: ${project.tags.map(escapeMarkdownText).join(', ')}`,
    ...(project.repo && isSafeHttpsUrl(project.repo)
      ? [`- Source: ${project.repo}`]
      : []),
    ...(project.link && isSafeHttpsUrl(project.link)
      ? [`- Live link: ${project.link}`]
      : []),
    '',
    '## Project details',
    '',
    safeAuthoredMarkdown(project.longDescription),
    '',
    ...(project.outcomes.length
      ? [
          '## Outcomes',
          '',
          ...project.outcomes.map((outcome) => `- ${escapeMarkdownText(outcome)}`),
          '',
        ]
      : []),
    ...sitemapLines(),
  ]);
}

function buildArticlesMarkdown(data: AgentDiscoveryData): string {
  return finish([
    ...frontmatter({
      title: 'Technical articles',
      description: 'Technical writing about edge AI, embedded systems, IoT, control, EDA, and safe automation.',
      canonicalPath: '/articles',
      updatedAt: latestDate(
        data.settings.updatedAt,
        data.posts.map((post) => post.updatedAt),
      ),
    }),
    '# Technical articles',
    '',
    'These notes form topic clusters around AI-assisted EDA, edge AI and embedded sensing, with direct links to the projects where the ideas are implemented.',
    '',
    ...contentClusterMarkdownLines(data.projects, data.posts, {
      headingLevel: 2,
      escapeText: escapeMarkdownText,
      projectUrl: (slug) => absoluteUrl(`/projects/${slug}`),
      articleUrl: (slug) => absoluteUrl(`/articles/${slug}`),
    }),
    ...data.posts.flatMap((post) => [
      `## [${escapeMarkdownText(post.title)}](${absoluteUrl(`/articles/${post.slug}`)})`,
      '',
      escapeMarkdownText(post.excerpt),
      '',
      `- Published: ${new Date(post.publishedAt).toISOString()}`,
      `- Tags: ${post.tags.map(escapeMarkdownText).join(', ')}`,
      '',
    ]),
    ...sitemapLines(),
  ]);
}

function buildArticleMarkdown(
  canonicalPath: string,
  slug: string,
  data: AgentDiscoveryData,
): string | null {
  const post = data.posts.find((candidate) => candidate.slug === slug);
  if (!post) return null;

  return finish([
    ...frontmatter({
      title: post.title,
      description: post.excerpt,
      canonicalPath,
      updatedAt: post.updatedAt,
    }),
    `# ${escapeMarkdownText(post.title)}`,
    '',
    `> ${escapeMarkdownText(post.excerpt)}`,
    '',
    `Published: ${new Date(post.publishedAt).toISOString()}`,
    '',
    safeAuthoredMarkdown(post.body),
    '',
    ...sitemapLines(),
  ]);
}

function buildGitHubMarkdown(data: AgentDiscoveryData): string {
  const repositoryLinks = data.projects
    .filter((project) => isSafeHttpsUrl(project.repo))
    .map(
      (project) =>
        `- [${escapeMarkdownText(project.title)}](${project.repo}): ${escapeMarkdownText(project.description)}`,
    );

  return finish([
    ...frontmatter({
      title: 'GitHub and open-source work',
      description: `Public repositories and open-source activity for @${GITHUB_USERNAME}.`,
      canonicalPath: '/github',
      updatedAt: data.profile.updatedAt,
    }),
    '# GitHub and open-source work',
    '',
    `- Profile: https://github.com/${GITHUB_USERNAME}`,
    `- Portfolio repository: https://github.com/oaslananka-dev/oaslananka-dev-vscode-portfolio`,
    '',
    '## Selected repositories',
    '',
    ...(repositoryLinks.length
      ? repositoryLinks
      : ['- Public repositories are available from the GitHub profile.']),
    '',
    ...sitemapLines(),
  ]);
}

function buildGlossaryMarkdown(data: AgentDiscoveryData): string {
  return finish([
    ...frontmatter({
      title: 'Engineering glossary',
      description: 'Definitions for recurring engineering terminology used across the portfolio.',
      canonicalPath: '/glossary',
      updatedAt: data.settings.updatedAt,
    }),
    '# Engineering glossary',
    '',
    ...GLOSSARY_GROUPS.flatMap((group) => [
      `## ${escapeMarkdownText(group.title)}`,
      '',
      ...group.terms.flatMap(({ term, definition }) => [
        `### ${escapeMarkdownText(term)}`,
        '',
        escapeMarkdownText(definition),
        '',
      ]),
    ]),
    ...sitemapLines(),
  ]);
}

function buildContactMarkdown(data: AgentDiscoveryData): string {
  const { profile } = data;
  return finish([
    ...frontmatter({
      title: `Contact ${profile.name}`,
      description: `Contact ${profile.name} about engineering projects, role opportunities, and technical collaboration.`,
      canonicalPath: '/contact',
      updatedAt: profile.updatedAt,
    }),
    `# Contact ${escapeMarkdownText(profile.name)}`,
    '',
    profileAvailabilityCopy(profile.availableForWork),
    '',
    '## Contact channels',
    '',
    ...publicContactChannels(profile).map(
      (social) => `- ${escapeMarkdownText(social.label)}: ${social.url}`,
    ),
    '',
    '## What to include',
    '',
    '- The problem or opportunity you are working on.',
    '- The expected outcome, constraints, and relevant timeline.',
    '- Existing technical context, repositories, or system boundaries.',
    '',
    'Messages submitted through the HTML contact form are stored securely and governed by the privacy notice.',
    '',
    ...sitemapLines(),
  ]);
}

function buildPrivacyMarkdown(data: AgentDiscoveryData): string {
  return finish([
    ...frontmatter({
      title: 'Privacy',
      description: 'How oaslananka.dev handles contact details, security data, analytics, and privacy choices.',
      canonicalPath: '/privacy',
      updatedAt: data.settings.updatedAt,
    }),
    '# Privacy',
    '',
    'This notice explains how oaslananka.dev handles information when you browse the portfolio or send an inquiry.',
    '',
    '## Information collected',
    '',
    'The contact form collects a name, email address, inquiry type, optional organization, and message. Security controls may process a short-lived pseudonymous identifier derived from request data to prevent abuse. Hosting and error-monitoring providers receive standard technical request data.',
    '',
    '## How information is used',
    '',
    'Contact details are used only to review and respond to project, employment, or collaboration inquiries. Technical data is used to operate, secure, and diagnose the site. Optional analytics and marketing integrations are not loaded before consent.',
    '',
    '## Service providers',
    '',
    'The site may use Vercel for hosting, Neon for database hosting, Resend for email delivery, and Sentry for essential error monitoring. Optional analytics providers may load only after consent.',
    '',
    '## Retention',
    '',
    'Contact inquiries expire no later than 12 months after receipt, and abuse-prevention records expire after 24 hours. Scheduled cleanup removes expired records.',
    '',
    '## Rights and contact',
    '',
    `Privacy requests can be sent through the [contact page](${absoluteUrl('/contact')}).`,
    '',
    ...sitemapLines(),
  ]);
}

export function buildCanonicalPageMarkdown(
  requestedPath: string,
  data: AgentDiscoveryData,
): CanonicalMarkdownDocument | null {
  const canonicalPath = normalizeCanonicalPublicPath(requestedPath);
  if (!canonicalPath) return null;

  if (canonicalPath === '/') {
    return { canonicalPath, body: buildHomepageMarkdown(data) };
  }
  if (canonicalPath === '/about') {
    return { canonicalPath, body: buildAboutMarkdown(data) };
  }
  if (canonicalPath === '/projects') {
    return { canonicalPath, body: buildProjectsMarkdown(data) };
  }
  if (canonicalPath.startsWith('/projects/')) {
    const body = buildProjectMarkdown(
      canonicalPath,
      canonicalPath.slice('/projects/'.length),
      data,
    );
    return body ? { canonicalPath, body } : null;
  }
  if (canonicalPath === '/articles') {
    return { canonicalPath, body: buildArticlesMarkdown(data) };
  }
  if (canonicalPath.startsWith('/articles/')) {
    const body = buildArticleMarkdown(
      canonicalPath,
      canonicalPath.slice('/articles/'.length),
      data,
    );
    return body ? { canonicalPath, body } : null;
  }
  if (canonicalPath === '/github') {
    return { canonicalPath, body: buildGitHubMarkdown(data) };
  }
  if (canonicalPath === '/glossary') {
    return { canonicalPath, body: buildGlossaryMarkdown(data) };
  }
  if (canonicalPath === '/contact') {
    return { canonicalPath, body: buildContactMarkdown(data) };
  }
  if (canonicalPath === '/privacy') {
    return { canonicalPath, body: buildPrivacyMarkdown(data) };
  }

  return null;
}
