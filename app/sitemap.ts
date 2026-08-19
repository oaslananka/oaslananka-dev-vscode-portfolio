import type { MetadataRoute } from 'next';

import {
  getProfile,
  getProjects,
  getPublishedPosts,
  getSettings,
} from '@/lib/content';
import { absoluteUrl } from '@/lib/site-config';

function latestDate(dates: Date[]): Date | undefined {
  const timestamp = Math.max(
    ...dates.map((date) => date.getTime()).filter(Number.isFinite),
  );
  return Number.isFinite(timestamp) ? new Date(timestamp) : undefined;
}

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, projects, profile, settings] = await Promise.all([
    getPublishedPosts(),
    getProjects(),
    getProfile(),
    getSettings(),
  ]);

  const latestProject = latestDate(projects.map((project) => project.updatedAt));
  const latestPost = latestDate(posts.map((post) => post.updatedAt));
  const homeUpdated = latestDate([
    profile.updatedAt,
    settings.updatedAt,
    ...projects.map((project) => project.updatedAt),
    ...posts.map((post) => post.updatedAt),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: absoluteUrl('/'), lastModified: homeUpdated, changeFrequency: 'weekly', priority: 1 },
    { url: absoluteUrl('/about'), lastModified: profile.updatedAt, changeFrequency: 'monthly', priority: 0.9 },
    { url: absoluteUrl('/projects'), lastModified: latestProject, changeFrequency: 'weekly', priority: 0.9 },
    { url: absoluteUrl('/articles'), lastModified: latestPost, changeFrequency: 'weekly', priority: 0.8 },
    { url: absoluteUrl('/github'), lastModified: homeUpdated, changeFrequency: 'weekly', priority: 0.6 },
    { url: absoluteUrl('/glossary'), lastModified: settings.updatedAt, changeFrequency: 'monthly', priority: 0.5 },
    { url: absoluteUrl('/contact'), lastModified: profile.updatedAt, changeFrequency: 'yearly', priority: 0.5 },
    { url: absoluteUrl('/privacy'), lastModified: settings.updatedAt, changeFrequency: 'yearly', priority: 0.3 },
  ];

  const postRoutes: MetadataRoute.Sitemap = posts.map((post) => ({
    url: absoluteUrl(`/articles/${post.slug}`),
    lastModified: new Date(post.updatedAt),
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  const projectRoutes: MetadataRoute.Sitemap = projects.map((project) => ({
    url: absoluteUrl(`/projects/${project.slug}`),
    lastModified: new Date(project.updatedAt),
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  return [...staticRoutes, ...postRoutes, ...projectRoutes];
}
