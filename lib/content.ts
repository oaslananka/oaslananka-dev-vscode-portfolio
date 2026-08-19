import 'server-only';

import * as Sentry from '@sentry/nextjs';
import { cache } from 'react';
import { and, asc, desc, eq } from 'drizzle-orm';

import { db } from './db';
import { allowsBundledDefaultContent } from './deployment-environment';
import {
  defaultPosts,
  defaultProfile,
  defaultProjects,
  defaultSettings,
} from './db/defaults';
import {
  posts as postsTable,
  profile as profileTable,
  projects as projectsTable,
  siteSettings as settingsTable,
  type Post,
  type Profile,
  type Project,
  type SiteSettings,
} from './db/schema';

/**
 * Public content reads.
 *
 * Wrapped in React's `cache()` so a single render never hits the database
 * twice. Cross-request freshness is handled by ISR (`export const revalidate`
 * on pages) plus on-demand `revalidatePath` calls from the admin actions.
 *
 * Bundled content is available only for an explicitly configured local
 * development environment. Production reads fail closed so a database outage
 * cannot silently publish stale placeholder content.
 */

const now = () => new Date();
const allowDefaultContent = allowsBundledDefaultContent();

type ContentDatabase = NonNullable<typeof db>;

async function readContent<T>(
  operation: string,
  fallback: () => T,
  query: (database: ContentDatabase) => Promise<T>,
): Promise<T> {
  if (!db) {
    if (allowDefaultContent) return fallback();
    const error = new Error(
      `Content database is unavailable during ${operation}. Set DATABASE_URL.`,
    );
    Sentry.captureException(error, {
      tags: { component: 'content', operation },
    });
    throw error;
  }

  try {
    return await query(db);
  } catch (error) {
    Sentry.captureException(error, {
      tags: { component: 'content', operation },
    });
    console.error(`[content] ${operation} failed`, error);

    if (allowDefaultContent) return fallback();
    throw error;
  }
}

function fallbackProfile(): Profile {
  return { id: 1, updatedAt: now(), ...defaultProfile };
}

function fallbackProjects(): Project[] {
  return defaultProjects.map((p, i) => ({
    id: i + 1,
    createdAt: now(),
    updatedAt: now(),
    ...p,
  }));
}

function fallbackPosts(): Post[] {
  return defaultPosts.map((p, i) => ({
    id: i + 1,
    publishedAt: now(),
    createdAt: now(),
    updatedAt: now(),
    ...p,
  }));
}

function fallbackSettings(): SiteSettings {
  return { id: 1, updatedAt: now(), ...defaultSettings };
}

export const getProfile = cache(async (): Promise<Profile> => {
  return readContent('getProfile', fallbackProfile, async (database) => {
    const rows = await database
      .select()
      .from(profileTable)
      .where(eq(profileTable.id, 1))
      .limit(1);
    if (!rows[0]) throw new Error('The canonical profile row (id=1) is missing.');
    return rows[0];
  });
});

export const getProjects = cache(async (): Promise<Project[]> => {
  return readContent('getProjects', fallbackProjects, (database) =>
    database
      .select()
      .from(projectsTable)
      .orderBy(asc(projectsTable.sortOrder), asc(projectsTable.id)),
  );
});

export const getProjectBySlug = cache(
  async (slug: string): Promise<Project | null> => {
    return readContent(
      'getProjectBySlug',
      () => fallbackProjects().find((project) => project.slug === slug) ?? null,
      async (database) => {
        const rows = await database
          .select()
          .from(projectsTable)
          .where(eq(projectsTable.slug, slug))
          .limit(1);
        return rows[0] ?? null;
      },
    );
  }
);

export const getPublishedPosts = cache(async (): Promise<Post[]> => {
  return readContent(
    'getPublishedPosts',
    () => fallbackPosts().filter((post) => post.published),
    (database) =>
      database
      .select()
      .from(postsTable)
      .where(eq(postsTable.published, true))
      .orderBy(desc(postsTable.publishedAt)),
  );
});

export const getPostBySlug = cache(
  async (slug: string): Promise<Post | null> => {
    return readContent(
      'getPostBySlug',
      () =>
        fallbackPosts().find(
          (post) => post.slug === slug && post.published,
        ) ?? null,
      async (database) => {
        const rows = await database
          .select()
          .from(postsTable)
          .where(and(eq(postsTable.slug, slug), eq(postsTable.published, true)))
          .limit(1);
        return rows[0] ?? null;
      },
    );
  }
);

export const getSettings = cache(async (): Promise<SiteSettings> => {
  return readContent('getSettings', fallbackSettings, async (database) => {
    const rows = await database
      .select()
      .from(settingsTable)
      .where(eq(settingsTable.id, 1))
      .limit(1);
    if (!rows[0]) {
      throw new Error('The canonical site settings row (id=1) is missing.');
    }
    return rows[0];
  });
});
