import type { Post, Project } from './db/schema';

export interface ContentClusterDefinition {
  id: 'ai-assisted-eda' | 'edge-ai-vision' | 'embedded-sensing-iot';
  title: string;
  description: string;
  projectSlugs: readonly string[];
  articleSlugs: readonly string[];
}

export const CONTENT_CLUSTERS: readonly ContentClusterDefinition[] = [
  {
    id: 'ai-assisted-eda',
    title: 'AI-assisted EDA and engineering tools',
    description:
      'Inspect-first automation for electronics design, with constrained mutations, native validation and explicit human review boundaries.',
    projectSlugs: ['kicad-mcp-pro', 'kicad-studio-kit', 'easyeda-mcp-pro'],
    articleSlugs: [
      'safe-ai-assisted-kicad-workflows',
      'ai-ready-mcp-server-for-kicad',
    ],
  },
  {
    id: 'edge-ai-vision',
    title: 'Edge AI, computer vision and control',
    description:
      'Perception and on-device inference connected to deterministic tracking, control, safety checks and field-ready operations.',
    projectSlugs: ['sky-track-vision'],
    articleSlugs: [
      'edge-vision-tracking-control-pipeline',
      'production-first-edge-ai',
    ],
  },
  {
    id: 'embedded-sensing-iot',
    title: 'Embedded sensing and device-to-cloud systems',
    description:
      'Sensor drivers, embedded interfaces and authenticated telemetry services designed around testability, observability and operational constraints.',
    projectSlugs: ['sismo-smart', 'adxl355', 'iot-cloud-monitor'],
    articleSlugs: [
      'cross-language-sensor-driver-design',
      'production-first-edge-ai',
    ],
  },
] as const;

interface SluggedContent {
  slug: string;
}

interface TitledContent extends SluggedContent {
  title: string;
}

interface ContentClusterMarkdownOptions {
  headingLevel: 2 | 3;
  escapeText: (value: string) => string;
  projectUrl: (slug: string) => string;
  articleUrl: (slug: string) => string;
}

export function resolveContentClusters<
  ProjectItem extends SluggedContent,
  ArticleItem extends SluggedContent,
>(
  projects: readonly ProjectItem[],
  articles: readonly ArticleItem[],
) {
  return CONTENT_CLUSTERS.map((cluster) => ({
    ...cluster,
    projects: cluster.projectSlugs.flatMap((slug) => {
      const project = projects.find((candidate) => candidate.slug === slug);
      return project ? [project] : [];
    }),
    articles: cluster.articleSlugs.flatMap((slug) => {
      const article = articles.find((candidate) => candidate.slug === slug);
      return article ? [article] : [];
    }),
  }));
}

export function contentClusterMarkdownLines<
  ProjectItem extends TitledContent,
  ArticleItem extends TitledContent,
>(
  projects: readonly ProjectItem[],
  articles: readonly ArticleItem[],
  options: ContentClusterMarkdownOptions,
): string[] {
  const heading = '#'.repeat(options.headingLevel);

  return resolveContentClusters(projects, articles).flatMap((cluster) => [
    `${heading} ${options.escapeText(cluster.title)}`,
    '',
    options.escapeText(cluster.description),
    '',
    ...cluster.projects.map(
      (project) =>
        `- Project: [${options.escapeText(project.title)}](${options.projectUrl(project.slug)})`,
    ),
    ...cluster.articles.map(
      (article) =>
        `- Article: [${options.escapeText(article.title)}](${options.articleUrl(article.slug)})`,
    ),
    '',
  ]);
}

function clusterIdsForProject(project: Pick<Project, 'slug'>): Set<string> {
  return new Set(
    CONTENT_CLUSTERS.filter((cluster) =>
      cluster.projectSlugs.includes(project.slug),
    ).map((cluster) => cluster.id),
  );
}

function clusterIdsForPost(post: Pick<Post, 'slug'>): Set<string> {
  return new Set(
    CONTENT_CLUSTERS.filter((cluster) =>
      cluster.articleSlugs.includes(post.slug),
    ).map((cluster) => cluster.id),
  );
}

function normalizedTags(tags: readonly string[]): Set<string> {
  return new Set(tags.map((tag) => tag.trim().toLocaleLowerCase('en-US')));
}

function intersectionSize(left: Set<string>, right: Set<string>): number {
  let size = 0;
  for (const value of left) {
    if (right.has(value)) size += 1;
  }
  return size;
}

function scoreRelatedContent(
  leftClusters: Set<string>,
  leftTags: Set<string>,
  rightClusters: Set<string>,
  rightTags: Set<string>,
): number {
  return (
    intersectionSize(leftClusters, rightClusters) * 10 +
    intersectionSize(leftTags, rightTags) * 2
  );
}

export function relatedPostsForProject(
  project: Pick<Project, 'slug' | 'tags'>,
  posts: readonly Post[],
  limit = 3,
): Post[] {
  const projectClusters = clusterIdsForProject(project);
  const projectTags = normalizedTags(project.tags);

  return posts
    .map((post) => ({
      post,
      score: scoreRelatedContent(
        projectClusters,
        projectTags,
        clusterIdsForPost(post),
        normalizedTags(post.tags),
      ),
      updatedAtTime: new Date(post.updatedAt).getTime(),
    }))
    .filter(({ score }) => score > 0)
    .sort(
      (left, right) =>
        right.score - left.score ||
        right.updatedAtTime - left.updatedAtTime ||
        left.post.title.localeCompare(right.post.title),
    )
    .slice(0, Math.max(0, limit))
    .map(({ post }) => post);
}

export function relatedProjectsForPost(
  post: Pick<Post, 'slug' | 'tags'>,
  projects: readonly Project[],
  limit = 3,
): Project[] {
  const postClusters = clusterIdsForPost(post);
  const postTags = normalizedTags(post.tags);

  return projects
    .map((project) => ({
      project,
      score: scoreRelatedContent(
        clusterIdsForProject(project),
        normalizedTags(project.tags),
        postClusters,
        postTags,
      ),
    }))
    .filter(({ score }) => score > 0)
    .sort(
      (left, right) =>
        right.score - left.score ||
        Number(right.project.featured) - Number(left.project.featured) ||
        left.project.sortOrder - right.project.sortOrder,
    )
    .slice(0, Math.max(0, limit))
    .map(({ project }) => project);
}

export function relatedPostsForPost(
  post: Pick<Post, 'slug' | 'tags'>,
  posts: readonly Post[],
  limit = 2,
): Post[] {
  const sourceClusters = clusterIdsForPost(post);
  const sourceTags = normalizedTags(post.tags);

  return posts
    .filter((candidate) => candidate.slug !== post.slug)
    .map((candidate) => ({
      post: candidate,
      score: scoreRelatedContent(
        sourceClusters,
        sourceTags,
        clusterIdsForPost(candidate),
        normalizedTags(candidate.tags),
      ),
      updatedAtTime: new Date(candidate.updatedAt).getTime(),
    }))
    .filter(({ score }) => score > 0)
    .sort(
      (left, right) =>
        right.score - left.score ||
        right.updatedAtTime - left.updatedAtTime,
    )
    .slice(0, Math.max(0, limit))
    .map(({ post: candidate }) => candidate);
}
