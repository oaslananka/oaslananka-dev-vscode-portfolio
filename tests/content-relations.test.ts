import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CONTENT_CLUSTERS,
  relatedPostsForPost,
  relatedPostsForProject,
  relatedProjectsForPost,
} from '../lib/content-relations';
import type { Post, Project } from '../lib/db/schema';

const now = new Date('2026-07-21T00:00:00.000Z');

function project(
  slug: string,
  tags: string[],
  sortOrder: number,
  featured = false,
): Project {
  return {
    id: sortOrder + 1,
    slug,
    title: slug,
    description: slug,
    longDescription: '',
    role: '',
    logo: '',
    coverImage: '',
    coverImageAlt: '',
    link: '',
    repo: '',
    tags,
    outcomes: [],
    media: [],
    links: [],
    featured,
    sortOrder,
    createdAt: now,
    updatedAt: now,
  };
}

function post(slug: string, tags: string[], updatedAt = now): Post {
  return {
    id: slug.length,
    slug,
    title: slug,
    excerpt: slug,
    body: '',
    coverImage: '',
    tags,
    published: true,
    publishedAt: now,
    createdAt: now,
    updatedAt,
  };
}

test('content clusters cover every canonical project and article topic', () => {
  const projects = new Set(CONTENT_CLUSTERS.flatMap((cluster) => cluster.projectSlugs));
  const articles = new Set(CONTENT_CLUSTERS.flatMap((cluster) => cluster.articleSlugs));

  assert.deepEqual(
    [...projects].sort(),
    [
      'adxl355',
      'easyeda-mcp-pro',
      'iot-cloud-monitor',
      'kicad-mcp-pro',
      'kicad-studio-kit',
      'sismo-smart',
      'sky-track-vision',
    ],
  );
  assert.deepEqual(
    [...articles].sort(),
    [
      'ai-ready-mcp-server-for-kicad',
      'cross-language-sensor-driver-design',
      'edge-vision-tracking-control-pipeline',
      'production-first-edge-ai',
      'safe-ai-assisted-kicad-workflows',
    ],
  );
});

test('Sismo Smart belongs only to embedded sensing and relates to production-first guidance', () => {
  const memberships = CONTENT_CLUSTERS.filter((cluster) =>
    cluster.projectSlugs.includes('sismo-smart'),
  );
  assert.deepEqual(memberships.map((cluster) => cluster.id), [
    'embedded-sensing-iot',
  ]);
  assert.equal(
    memberships[0]?.articleSlugs.includes('production-first-edge-ai'),
    true,
  );

  const source = project(
    'sismo-smart',
    ['Embedded Systems', 'IoT', 'Structural Health Monitoring', 'Edge AI'],
    -1,
    true,
  );
  const related = relatedPostsForProject(source, [
    post('production-first-edge-ai', ['Edge AI', 'IoT']),
    post('safe-ai-assisted-kicad-workflows', ['Safety']),
  ]);
  assert.equal(related[0]?.slug, 'production-first-edge-ai');
});

test('curated topic membership outranks incidental shared tags', () => {
  const source = project('kicad-mcp-pro', ['Python', 'MCP'], 0, true);
  const curated = post('safe-ai-assisted-kicad-workflows', ['Safety']);
  const tagOnly = post('unrelated-python-note', ['Python', 'MCP']);

  assert.deepEqual(
    relatedPostsForProject(source, [tagOnly, curated]).map((item) => item.slug),
    ['safe-ai-assisted-kicad-workflows', 'unrelated-python-note'],
  );
});

test('article relations return related projects and exclude the current article', () => {
  const source = post('production-first-edge-ai', ['Edge AI', 'IoT']);
  const projects = [
    project('iot-cloud-monitor', ['IoT'], 2),
    project('sky-track-vision', ['Edge AI'], 1, true),
    project('kicad-mcp-pro', ['MCP'], 0, true),
  ];
  const posts = [
    source,
    post('edge-vision-tracking-control-pipeline', ['Control']),
    post('cross-language-sensor-driver-design', ['Testing']),
  ];

  assert.deepEqual(
    relatedProjectsForPost(source, projects).map((item) => item.slug),
    ['sky-track-vision', 'iot-cloud-monitor'],
  );
  assert.deepEqual(
    relatedPostsForPost(source, posts).map((item) => item.slug),
    ['edge-vision-tracking-control-pipeline', 'cross-language-sensor-driver-design'],
  );
});
