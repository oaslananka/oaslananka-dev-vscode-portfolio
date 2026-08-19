import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

import type { ProjectLink, ProjectMedia } from '../project-content';
import { ADMIN_CONTENT_LIMITS } from '../admin/limits';

// ── JSON field shapes ──────────────────────────────────────────────────────

export interface SocialLink {
  platform: string; // e.g. "github", "linkedin", "email", "website"
  label: string; // what to display
  url: string;
}

export interface SkillGroup {
  category: string; // e.g. "Languages"
  items: string[];
}

export interface ExperienceItem {
  role: string;
  company: string;
  period: string; // e.g. "Present", "2023 — 2024"
  description?: string;
  points: string[];
}

export interface EducationItem {
  institution: string;
  qualification: string;
  details: string;
}

export interface WritingLink {
  label: string;
  url: string;
}

export const CONTACT_INQUIRY_TYPES = [
  'project',
  'role',
  'collaboration',
  'other',
] as const;

export type ContactInquiryType = (typeof CONTACT_INQUIRY_TYPES)[number];

export const CONTACT_NOTIFICATION_STATUSES = [
  'pending',
  'sent',
  'failed',
  'disabled',
] as const;

export type ContactNotificationStatus =
  (typeof CONTACT_NOTIFICATION_STATUSES)[number];

// ── profile (single row) ───────────────────────────────────────────────────

export const profile = pgTable(
  'profile',
  {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    role: text('role').notNull(),
    tagline: text('tagline').notNull(), // short one-liner under the name
    greeting: text('greeting').notNull().default("Hello, I'm"),
    heroDescription: text('hero_description').notNull(),
    location: text('location').notNull().default(''),
    email: text('email').notNull().default(''),
    avatarUrl: text('avatar_url').notNull().default(''),
    resumeUrl: text('resume_url').notNull().default(''),
    availableForWork: boolean('available_for_work').notNull().default(true),
    bio: jsonb('bio').$type<string[]>().notNull().default([]),
    socials: jsonb('socials').$type<SocialLink[]>().notNull().default([]),
    skills: jsonb('skills').$type<SkillGroup[]>().notNull().default([]),
    experience: jsonb('experience')
      .$type<ExperienceItem[]>()
      .notNull()
      .default([]),
    education: jsonb('education')
      .$type<EducationItem[]>()
      .notNull()
      .default([]),
    writing: jsonb('writing').$type<WritingLink[]>().notNull().default([]),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check('profile_singleton_id_check', sql`${table.id} = 1`),
    check(
      'profile_bio_shape_check',
      sql`jsonb_typeof(${table.bio}) = 'array' and jsonb_array_length(${table.bio}) <= ${sql.raw(String(ADMIN_CONTENT_LIMITS.biographyParagraphCount))}`,
    ),
    check(
      'profile_socials_shape_check',
      sql`jsonb_typeof(${table.socials}) = 'array' and jsonb_array_length(${table.socials}) <= ${sql.raw(String(ADMIN_CONTENT_LIMITS.socialCount))}`,
    ),
    check(
      'profile_skills_shape_check',
      sql`jsonb_typeof(${table.skills}) = 'array' and jsonb_array_length(${table.skills}) <= ${sql.raw(String(ADMIN_CONTENT_LIMITS.skillGroupCount))}`,
    ),
    check(
      'profile_experience_shape_check',
      sql`jsonb_typeof(${table.experience}) = 'array' and jsonb_array_length(${table.experience}) <= ${sql.raw(String(ADMIN_CONTENT_LIMITS.experienceCount))}`,
    ),
    check(
      'profile_education_shape_check',
      sql`jsonb_typeof(${table.education}) = 'array' and jsonb_array_length(${table.education}) <= ${sql.raw(String(ADMIN_CONTENT_LIMITS.educationCount))}`,
    ),
    check(
      'profile_writing_shape_check',
      sql`jsonb_typeof(${table.writing}) = 'array' and jsonb_array_length(${table.writing}) <= ${sql.raw(String(ADMIN_CONTENT_LIMITS.writingCount))}`,
    ),
  ],
);

// ── projects ───────────────────────────────────────────────────────────────

export const projects = pgTable(
  'projects',
  {
    id: serial('id').primaryKey(),
    slug: text('slug').notNull().unique(),
    title: text('title').notNull(),
    description: text('description').notNull(),
    longDescription: text('long_description').notNull().default(''),
    role: text('role').notNull().default(''),
    logo: text('logo').notNull().default(''),
    coverImage: text('cover_image').notNull().default(''),
    coverImageAlt: text('cover_image_alt').notNull().default(''),
    link: text('link').notNull().default(''),
    repo: text('repo').notNull().default(''),
    tags: jsonb('tags').$type<string[]>().notNull().default([]),
    outcomes: jsonb('outcomes').$type<string[]>().notNull().default([]),
    media: jsonb('media').$type<ProjectMedia[]>().notNull().default([]),
    links: jsonb('links').$type<ProjectLink[]>().notNull().default([]),
    featured: boolean('featured').notNull().default(false),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      'projects_sort_order_check',
      sql`${table.sortOrder} between ${sql.raw(String(ADMIN_CONTENT_LIMITS.sortOrderMin))} and ${sql.raw(String(ADMIN_CONTENT_LIMITS.sortOrderMax))}`,
    ),
    check(
      'projects_tags_shape_check',
      sql`jsonb_typeof(${table.tags}) = 'array' and jsonb_array_length(${table.tags}) <= ${sql.raw(String(ADMIN_CONTENT_LIMITS.tagCount))}`,
    ),
    check(
      'projects_outcomes_shape_check',
      sql`jsonb_typeof(${table.outcomes}) = 'array' and jsonb_array_length(${table.outcomes}) <= 8`,
    ),
    check(
      'projects_media_shape_check',
      sql`jsonb_typeof(${table.media}) = 'array' and jsonb_array_length(${table.media}) <= 12`,
    ),
    check(
      'projects_links_shape_check',
      sql`jsonb_typeof(${table.links}) = 'array' and jsonb_array_length(${table.links}) <= 12`,
    ),
  ],
);

// ── posts (blog) ───────────────────────────────────────────────────────────

export const posts = pgTable(
  'posts',
  {
    id: serial('id').primaryKey(),
    slug: text('slug').notNull().unique(),
    title: text('title').notNull(),
    excerpt: text('excerpt').notNull().default(''),
    body: text('body').notNull().default(''), // markdown
    coverImage: text('cover_image').notNull().default(''),
    tags: jsonb('tags').$type<string[]>().notNull().default([]),
    published: boolean('published').notNull().default(false),
    publishedAt: timestamp('published_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check('posts_published_at_finite_check', sql`isfinite(${table.publishedAt})`),
    check(
      'posts_tags_shape_check',
      sql`jsonb_typeof(${table.tags}) = 'array' and jsonb_array_length(${table.tags}) <= ${sql.raw(String(ADMIN_CONTENT_LIMITS.tagCount))}`,
    ),
  ],
);

// ── site settings (single row) ─────────────────────────────────────────────

export const siteSettings = pgTable(
  'site_settings',
  {
    id: serial('id').primaryKey(),
    siteTitle: text('site_title').notNull(),
    siteDescription: text('site_description').notNull(),
    keywords: jsonb('keywords').$type<string[]>().notNull().default([]),
    defaultTheme: text('default_theme').notNull().default('github-dark'),
    ogHeading: text('og_heading').notNull().default(''),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check('site_settings_singleton_id_check', sql`${table.id} = 1`),
    check(
      'site_settings_keywords_shape_check',
      sql`jsonb_typeof(${table.keywords}) = 'array' and jsonb_array_length(${table.keywords}) <= ${sql.raw(String(ADMIN_CONTENT_LIMITS.tagCount))}`,
    ),
    check(
      'site_settings_theme_check',
      sql`${table.defaultTheme} in ('github-dark', 'dracula', 'ayu-dark', 'ayu-mirage', 'nord', 'night-owl')`,
    ),
  ],
);

// ── contact messages ───────────────────────────────────────────────────────

export const contactMessages = pgTable(
  'contact_messages',
  {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull(),
    inquiryType: text('inquiry_type')
      .$type<ContactInquiryType>()
      .notNull()
      .default('other'),
    organization: text('organization').notNull().default(''),
    message: text('message').notNull(),
    read: boolean('read').notNull().default(false),
    notificationStatus: text('notification_status')
      .$type<ContactNotificationStatus>()
      .notNull()
      .default('disabled'),
    notificationProviderId: text('notification_provider_id')
      .notNull()
      .default(''),
    notificationAttempts: integer('notification_attempts').notNull().default(0),
    notificationLastError: text('notification_last_error')
      .notNull()
      .default(''),
    notificationLastAttemptAt: timestamp('notification_last_attempt_at', {
      withTimezone: true,
    }),
    notificationNextAttemptAt: timestamp('notification_next_attempt_at', {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
    notificationClaimToken: text('notification_claim_token').notNull().default(''),
    notificationClaimExpiresAt: timestamp('notification_claim_expires_at', {
      withTimezone: true,
    }),
    retentionExpiresAt: timestamp('retention_expires_at', {
      withTimezone: true,
    })
      .notNull()
      .default(sql`now() + interval '12 months'`),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      'contact_messages_inquiry_type_check',
      sql`${table.inquiryType} in ('project', 'role', 'collaboration', 'other')`,
    ),
    check(
      'contact_messages_notification_status_check',
      sql`${table.notificationStatus} in ('pending', 'sent', 'failed', 'disabled')`,
    ),
    check(
      'contact_messages_notification_attempts_check',
      sql`${table.notificationAttempts} between 0 and ${sql.raw(String(ADMIN_CONTENT_LIMITS.notificationAttemptsMax))}`,
    ),
    check(
      'contact_messages_retention_window_check',
      sql`${table.retentionExpiresAt} > ${table.createdAt}`,
    ),
    index('contact_messages_retention_expires_at_idx').on(
      table.retentionExpiresAt,
    ),
    index('contact_messages_notification_delivery_idx').on(
      table.notificationStatus,
      table.notificationNextAttemptAt,
      table.notificationClaimExpiresAt,
    ),
  ],
);

// ── login attempts (brute-force protection) ────────────────────────────────

export const loginAttempts = pgTable(
  'login_attempts',
  {
    id: serial('id').primaryKey(),
    // Kept on the existing `ip` column for a non-destructive migration. Only
    // an HMAC digest is written after migration 0003.
    identityHash: text('ip').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('login_attempts_identity_created_at_idx').on(
      table.identityHash,
      table.createdAt,
    ),
    index('login_attempts_created_at_idx').on(table.createdAt),
  ],
);

// ── inferred types ─────────────────────────────────────────────────────────

export type Profile = typeof profile.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
export type SiteSettings = typeof siteSettings.$inferSelect;
export type ContactMessage = typeof contactMessages.$inferSelect;
