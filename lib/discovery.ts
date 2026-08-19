import { contentClusterMarkdownLines } from './content-relations';
import { publicContactChannels } from './person-identity';
import { profileAvailabilityCopy } from './profile-content';
import { absoluteUrl } from './site-config';

interface DiscoveryProfile {
  name: string;
  tagline: string;
  role: string;
  location: string;
  email: string;
  availableForWork: boolean;
  bio: string[];
  skills: { category: string; items: string[] }[];
  education: { institution: string; qualification: string; details: string }[];
  socials: { platform: string; label: string; url: string }[];
}

interface DiscoveryProject {
  slug: string;
  title: string;
  description: string;
}

interface DiscoveryPost {
  slug: string;
  title: string;
  excerpt: string;
  tags: string[];
  publishedAt: Date | string;
  updatedAt: Date | string;
}

interface DiscoverySettings {
  siteTitle: string;
  siteDescription: string;
}

interface DiscoveryData {
  profile: DiscoveryProfile;
  projects: DiscoveryProject[];
  posts: DiscoveryPost[];
  settings: DiscoverySettings;
}

function singleLine(value: string): string {
  return value
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Keep database-authored content inside its current Markdown construct. */
export function escapeMarkdownText(value: string): string {
  return singleLine(value).replace(/([\\`*_\[\]<>])/g, '\\$1');
}

function safePublicUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (!['https:', 'mailto:'].includes(url.protocol)) return null;
    if (url.protocol !== 'mailto:' && (url.username || url.password)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function buildLlmsText({
  profile,
  projects,
  posts,
  settings,
}: DiscoveryData): string {
  const lines: string[] = [
    `# ${escapeMarkdownText(profile.name)}`,
    '',
    `> ${escapeMarkdownText(profile.tagline)}`,
    '',
    `${escapeMarkdownText(profile.role)}${
      profile.location ? ` - ${escapeMarkdownText(profile.location)}` : ''
    }`,
    '',
    escapeMarkdownText(settings.siteDescription),
    '',
    `Availability: ${escapeMarkdownText(profileAvailabilityCopy(profile.availableForWork))}`,
    '',
  ];

  if (profile.bio.length) {
    lines.push('## About', '');
    profile.bio.forEach((paragraph) => {
      lines.push(escapeMarkdownText(paragraph), '');
    });
  }

  if (profile.education.length) {
    lines.push('## Education', '');
    profile.education.forEach((item) => {
      lines.push(`- **${escapeMarkdownText(item.institution)}:** ${escapeMarkdownText(item.qualification)}`);
      if (item.details) lines.push(`  - ${escapeMarkdownText(item.details)}`);
    });
    lines.push('');
  }

  if (profile.skills.length) {
    lines.push('## Expertise', '');
    profile.skills.forEach((group) => {
      const items = group.items.map(escapeMarkdownText).join(', ');
      lines.push(`- **${escapeMarkdownText(group.category)}:** ${items}`);
    });
    lines.push('');
  }

  lines.push(
    '## Engineering domains',
    '',
    ...contentClusterMarkdownLines(projects, posts, {
      headingLevel: 3,
      escapeText: escapeMarkdownText,
      projectUrl: (slug) => absoluteUrl(`/projects/${slug}`),
      articleUrl: (slug) => absoluteUrl(`/articles/${slug}`),
    }),
    '## Canonical pages',
    '',
    `- [Home](${absoluteUrl('/')}): Portfolio overview`,
    `- [About](${absoluteUrl('/about')}): Background, experience and expertise`,
    `- [Projects](${absoluteUrl('/projects')}): Selected engineering work`,
    `- [Articles](${absoluteUrl('/articles')}): Technical writing`,
    `- [GitHub](${absoluteUrl('/github')}): Open-source activity`,
    `- [Glossary](${absoluteUrl('/glossary')}): Terminology used across the portfolio`,
    `- [Contact](${absoluteUrl('/contact')}): Project and role inquiries`,
    '',
  );

  if (projects.length) {
    lines.push('## Projects', '');
    projects.forEach((project) => {
      lines.push(
        `- [${escapeMarkdownText(project.title)}](${absoluteUrl(`/projects/${project.slug}`)}): ${escapeMarkdownText(project.description)}`,
      );
    });
    lines.push('');
  }

  if (posts.length) {
    lines.push('## Articles', '');
    posts.forEach((post) => {
      lines.push(
        `- [${escapeMarkdownText(post.title)}](${absoluteUrl(`/articles/${post.slug}`)}): ${escapeMarkdownText(post.excerpt)}`,
      );
    });
    lines.push('');
  }

  const contactLinks = publicContactChannels(profile)
    .map((social) => ({ ...social, safeUrl: safePublicUrl(social.url) }))
    .filter((social) => social.safeUrl);

  if (contactLinks.length) {
    lines.push('## Contact', '');
    contactLinks.forEach((social) => {
      lines.push(
        `- [${escapeMarkdownText(social.label)}](${social.safeUrl})`,
      );
    });
    lines.push('');
  }

  lines.push(
    '## Feeds',
    '',
    `- [RSS feed](${absoluteUrl('/feed.xml')})`,
    `- [XML sitemap](${absoluteUrl('/sitemap.xml')})`,
    `- [Markdown sitemap](${absoluteUrl('/sitemap.md')})`,
    `- [Full LLM context](${absoluteUrl('/llms-full.txt')})`,
    `- [Agent instructions](${absoluteUrl('/AGENTS.md')})`,
    '',
  );

  return `${lines.join('\n').trim()}\n`;
}

export function escapeXml(value: string): string {
  return value.replace(/[<>&"']/g, (character) => ({
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    '"': '&quot;',
    "'": '&apos;',
  })[character] ?? character);
}

export function decodeXmlText(value: string): string {
  return value
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
    .replaceAll('&amp;', '&');
}

export function buildRssXml({ posts, settings }: DiscoveryData): string {
  const latestDate = posts.reduce((latest, post) => {
    const updated = new Date(post.updatedAt).getTime();
    return Number.isFinite(updated) && updated > latest ? updated : latest;
  }, 0);
  const lastBuildDate = new Date(latestDate || Date.now()).toUTCString();

  const items = posts.map((post) => {
    const url = absoluteUrl(`/articles/${post.slug}`);
    const categories = post.tags
      .map((tag) => `      <category>${escapeXml(tag)}</category>`)
      .join('\n');

    return [
      '    <item>',
      `      <title>${escapeXml(post.title)}</title>`,
      `      <link>${escapeXml(url)}</link>`,
      `      <guid isPermaLink="true">${escapeXml(url)}</guid>`,
      `      <description>${escapeXml(post.excerpt)}</description>`,
      `      <pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate>`,
      ...(categories ? [categories] : []),
      '    </item>',
    ].join('\n');
  });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '  <channel>',
    `    <title>${escapeXml(settings.siteTitle)}</title>`,
    `    <link>${escapeXml(absoluteUrl('/'))}</link>`,
    `    <atom:link href="${escapeXml(absoluteUrl('/feed.xml'))}" rel="self" type="application/rss+xml" />`,
    `    <description>${escapeXml(settings.siteDescription)}</description>`,
    `    <language>en</language>`,
    `    <lastBuildDate>${lastBuildDate}</lastBuildDate>`,
    ...items,
    '  </channel>',
    '</rss>',
    '',
  ].join('\n');
}
