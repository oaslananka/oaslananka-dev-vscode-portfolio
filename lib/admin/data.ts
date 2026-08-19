import 'server-only';

import { and, asc, desc, eq, gt, lt } from 'drizzle-orm';

import { db } from '@/lib/db';
import {
  defaultProfile,
  defaultSettings,
} from '@/lib/db/defaults';
import {
  contactMessages as contactMessagesTable,
  posts as postsTable,
  profile as profileTable,
  projects as projectsTable,
  siteSettings as settingsTable,
  type ContactMessage,
  type Post,
  type Profile,
  type Project,
  type SiteSettings,
} from '@/lib/db/schema';

/**
 * Uncached reads for the admin panel. Unlike lib/content.ts these are never
 * cached and include unpublished/draft rows, so editors always see live state.
 */

export function dbReady(): boolean {
  return db !== null;
}

export async function getAdminProfile(): Promise<Profile | null> {
  if (!db) return { id: 1, updatedAt: new Date(), ...defaultProfile };
  const rows = await db
    .select()
    .from(profileTable)
    .where(eq(profileTable.id, 1))
    .limit(1);
  return rows[0] ?? null;
}

export async function getAdminSettings(): Promise<SiteSettings | null> {
  if (!db) return { id: 1, updatedAt: new Date(), ...defaultSettings };
  const rows = await db
    .select()
    .from(settingsTable)
    .where(eq(settingsTable.id, 1))
    .limit(1);
  return rows[0] ?? null;
}

export async function getAdminProjects(): Promise<Project[]> {
  if (!db) return [];
  return db
    .select()
    .from(projectsTable)
    .orderBy(asc(projectsTable.sortOrder), asc(projectsTable.id));
}

export async function getAdminProject(id: number): Promise<Project | null> {
  if (!db) return null;
  const rows = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function getAdminPosts(): Promise<Post[]> {
  if (!db) return [];
  return db.select().from(postsTable).orderBy(desc(postsTable.updatedAt));
}

export async function getAdminPost(id: number): Promise<Post | null> {
  if (!db) return null;
  const rows = await db
    .select()
    .from(postsTable)
    .where(eq(postsTable.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function getContactMessages(): Promise<ContactMessage[]> {
  if (!db) return [];
  await db
    .delete(contactMessagesTable)
    .where(lt(contactMessagesTable.retentionExpiresAt, new Date()));
  return db
    .select()
    .from(contactMessagesTable)
    .orderBy(desc(contactMessagesTable.createdAt));
}

export async function getUnreadMessageCount(): Promise<number> {
  if (!db) return 0;
  const rows = await db
    .select()
    .from(contactMessagesTable)
    .where(
      and(
        eq(contactMessagesTable.read, false),
        gt(contactMessagesTable.retentionExpiresAt, new Date()),
      ),
    );
  return rows.length;
}
