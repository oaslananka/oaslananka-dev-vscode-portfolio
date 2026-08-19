import { z } from 'zod';

import { isAllowedImageSource } from '@/lib/image-policy';
import {
  projectLinkListSchema,
  projectMediaListSchema,
  projectOutcomeListSchema,
} from '@/lib/project-content';
import { isThemeKey, type ThemeKey } from '@/lib/themes';
import {
  isSafeHttpsUrl,
  isSafeResourceUrl,
  isSafeSocialUrl,
} from '@/lib/url-policy';

export class AdminValidationError extends Error {
  override readonly name = 'AdminValidationError';
}

export { ADMIN_CONTENT_LIMITS } from '@/lib/admin/limits';
import { ADMIN_CONTENT_LIMITS } from '@/lib/admin/limits';

const limits = ADMIN_CONTENT_LIMITS;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const trimmedString = (maximum: number) => z.string().trim().max(maximum);
const requiredString = (maximum: number) => trimmedString(maximum).min(1);
const optionalHttpsUrl = trimmedString(2_048).refine(
  (value) => value === '' || isSafeHttpsUrl(value),
  'must be an HTTPS URL without credentials',
);
const optionalResourceUrl = trimmedString(2_048).refine(
  isSafeResourceUrl,
  'must be a local path or an HTTPS URL',
);
const optionalImageSource = trimmedString(2_048).refine(
  isAllowedImageSource,
  'must be a local public path or an allowed HTTPS image URL',
);
const tagSchema = requiredString(limits.tagLength);
const tagListSchema = z.array(tagSchema).max(limits.tagCount);

const socialSchema = z
  .array(
    z.object({
      platform: requiredString(40),
      label: requiredString(120),
      url: requiredString(2_048).refine(
        isSafeSocialUrl,
        'must use HTTPS or a valid mailto address',
      ),
    }),
  )
  .max(limits.socialCount);

const skillSchema = z
  .array(
    z.object({
      category: requiredString(80),
      items: z
        .array(requiredString(80))
        .min(1)
        .max(limits.skillItemCount),
    }),
  )
  .max(limits.skillGroupCount);

const experienceSchema = z
  .array(
    z.object({
      role: requiredString(limits.shortTextLength),
      company: trimmedString(limits.shortTextLength),
      period: requiredString(limits.shortTextLength),
      description: trimmedString(limits.longTextLength).optional(),
      points: z
        .array(requiredString(limits.mediumTextLength))
        .max(limits.experiencePointCount),
    }),
  )
  .max(limits.experienceCount);

const educationSchema = z
  .array(
    z
      .object({
        institution: requiredString(limits.shortTextLength),
        qualification: requiredString(limits.shortTextLength),
        details: trimmedString(limits.longTextLength),
      })
      .strict(),
  )
  .max(limits.educationCount);

const writingSchema = z
  .array(
    z.object({
      label: requiredString(limits.shortTextLength),
      url: requiredString(2_048).refine(
        isSafeHttpsUrl,
        'must use HTTPS without credentials',
      ),
    }),
  )
  .max(limits.writingCount);

const profileInputSchema = z.object({
  name: requiredString(limits.shortTextLength),
  role: requiredString(limits.shortTextLength),
  tagline: trimmedString(limits.mediumTextLength),
  greeting: requiredString(limits.shortTextLength),
  heroDescription: trimmedString(limits.longTextLength),
  location: trimmedString(limits.shortTextLength),
  email: z.union([z.literal(''), z.email().max(320)]),
  avatarUrl: optionalImageSource,
  resumeUrl: optionalResourceUrl,
  availableForWork: z.boolean(),
  bio: z
    .array(requiredString(limits.biographyParagraphLength))
    .max(limits.biographyParagraphCount),
  socials: socialSchema,
  skills: skillSchema,
  experience: experienceSchema,
  education: educationSchema,
  writing: writingSchema,
});

const settingsInputSchema = z.object({
  siteTitle: requiredString(limits.shortTextLength),
  siteDescription: trimmedString(limits.mediumTextLength),
  keywords: tagListSchema,
  defaultTheme: z.custom<ThemeKey>(isThemeKey, 'must be a supported theme'),
  ogHeading: trimmedString(limits.shortTextLength),
});

const projectInputSchema = z
  .object({
    title: requiredString(limits.shortTextLength),
    slug: requiredString(limits.slugLength).regex(
      slugPattern,
      'must contain lowercase letters, numbers, and single hyphens only',
    ),
    description: requiredString(limits.projectDescriptionLength),
    longDescription: z.string().max(limits.projectBodyLength),
    role: trimmedString(limits.shortTextLength),
    logo: optionalImageSource,
    coverImage: optionalImageSource,
    coverImageAlt: trimmedString(240),
    link: optionalHttpsUrl,
    repo: optionalHttpsUrl,
    tags: tagListSchema,
    outcomes: projectOutcomeListSchema,
    media: projectMediaListSchema,
    links: projectLinkListSchema,
    featured: z.boolean(),
    sortOrder: z
      .int()
      .min(limits.sortOrderMin)
      .max(limits.sortOrderMax),
  })
  .superRefine((value, context) => {
    if (value.coverImage && !value.coverImageAlt) {
      context.addIssue({
        code: 'custom',
        path: ['coverImageAlt'],
        message: 'is required when a cover image is set',
      });
    }

    value.media.forEach((media, index) => {
      if (!isAllowedImageSource(media.src)) {
        context.addIssue({
          code: 'custom',
          path: ['media', index, 'src'],
          message: 'must be an allowed image source',
        });
      }
      if (media.type === 'video' && !isAllowedImageSource(media.poster)) {
        context.addIssue({
          code: 'custom',
          path: ['media', index, 'poster'],
          message: 'must be an allowed image source',
        });
      }
    });
  });

const postInputSchema = z.object({
  title: requiredString(limits.shortTextLength),
  slug: requiredString(limits.slugLength).regex(
    slugPattern,
    'must contain lowercase letters, numbers, and single hyphens only',
  ),
  excerpt: trimmedString(limits.postExcerptLength),
  body: z.string().max(limits.postBodyLength),
  coverImage: optionalImageSource,
  tags: tagListSchema,
  published: z.boolean(),
  publishedAt: z.date().superRefine((value, context) => {
    const year = value.getUTCFullYear();
    if (
      !Number.isFinite(value.getTime()) ||
      year < limits.earliestContentYear ||
      year > limits.latestContentYear
    ) {
      context.addIssue({
        code: 'custom',
        message: `must be a valid date between ${limits.earliestContentYear} and ${limits.latestContentYear}`,
      });
    }
  }),
});

export type ProfileInput = z.infer<typeof profileInputSchema>;
export type SettingsInput = z.infer<typeof settingsInputSchema>;
export type ProjectInput = z.infer<typeof projectInputSchema>;
export type PostInput = z.infer<typeof postInputSchema>;

function entryString(value: FormDataEntryValue | null): string {
  return typeof value === 'string' ? value : '';
}

function formString(formData: FormData, key: string): string {
  return entryString(formData.get(key));
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function csv(value: FormDataEntryValue | null): string[] {
  return unique(
    entryString(value)
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  );
}

function paragraphs(value: FormDataEntryValue | null): string[] {
  return entryString(value)
    .split(/\n\s*\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .split('-')
    .filter(Boolean)
    .join('-');
}

function parseJsonField<T>(
  raw: FormDataEntryValue | null,
  schema: z.ZodType<T>,
  path: string,
): T {
  const value = entryString(raw).trim() || '[]';
  let parsed: unknown;

  try {
    parsed = JSON.parse(value);
  } catch {
    throw new AdminValidationError(`${path}: must be valid JSON.`);
  }

  const result = schema.safeParse(parsed);
  if (!result.success) throwValidation(result.error, path);
  return result.data;
}

const FIELD_LABELS: Record<string, string> = {
  publishedAt: 'Published date',
  sortOrder: 'Sort order',
};

function readablePath(path: PropertyKey[]): string {
  return path
    .map((part, index) => {
      const value = String(part);
      return index === 0 ? (FIELD_LABELS[value] ?? value) : value;
    })
    .join('.');
}

function throwValidation(error: z.ZodError, prefix?: string): never {
  const issue = error.issues[0];
  const issuePath = readablePath(issue.path);
  const path = [prefix, issuePath].filter(Boolean).join('.');
  throw new AdminValidationError(`${path || 'Form'}: ${issue.message}.`);
}

function parseSchema<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throwValidation(result.error);
  return result.data;
}

function parseInteger(raw: string, label: string): number {
  const normalized = raw.trim();
  if (!/^-?\d+$/.test(normalized)) {
    throw new AdminValidationError(`${label}: must be a whole number.`);
  }
  const value = Number(normalized);
  if (!Number.isSafeInteger(value)) {
    throw new AdminValidationError(`${label}: must be a safe integer.`);
  }
  return value;
}

export function parseSafeId(
  value: FormDataEntryValue | null,
  label = 'ID',
): number {
  const parsed = Number(entryString(value).trim());
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new AdminValidationError(`${label} must be a positive safe integer.`);
  }
  return parsed;
}

export function parseProfileForm(formData: FormData): ProfileInput {
  return parseSchema(profileInputSchema, {
    name: formString(formData, 'name'),
    role: formString(formData, 'role'),
    tagline: formString(formData, 'tagline'),
    greeting: formString(formData, 'greeting') || "Hello, I'm",
    heroDescription: formString(formData, 'heroDescription'),
    location: formString(formData, 'location'),
    email: formString(formData, 'email').trim(),
    avatarUrl: formString(formData, 'avatarUrl'),
    resumeUrl: formString(formData, 'resumeUrl'),
    availableForWork: formData.get('availableForWork') === 'on',
    bio: paragraphs(formData.get('bio')),
    socials: parseJsonField(formData.get('socials'), socialSchema, 'socials'),
    skills: parseJsonField(formData.get('skills'), skillSchema, 'skills'),
    experience: parseJsonField(
      formData.get('experience'),
      experienceSchema,
      'experience',
    ),
    education: parseJsonField(
      formData.get('education'),
      educationSchema,
      'education',
    ),
    writing: parseJsonField(formData.get('writing'), writingSchema, 'writing'),
  });
}

export function parseSettingsForm(formData: FormData): SettingsInput {
  return parseSchema(settingsInputSchema, {
    siteTitle: formString(formData, 'siteTitle'),
    siteDescription: formString(formData, 'siteDescription'),
    keywords: csv(formData.get('keywords')),
    defaultTheme: formString(formData, 'defaultTheme'),
    ogHeading: formString(formData, 'ogHeading'),
  });
}

export function parseProjectForm(formData: FormData): ProjectInput {
  const title = formString(formData, 'title').trim();
  const requestedSlug = formString(formData, 'slug');

  return parseSchema(projectInputSchema, {
    title,
    slug: slugify(requestedSlug) || slugify(title),
    description: formString(formData, 'description'),
    longDescription: formString(formData, 'longDescription'),
    role: formString(formData, 'role'),
    logo: formString(formData, 'logo'),
    coverImage: formString(formData, 'coverImage'),
    coverImageAlt: formString(formData, 'coverImageAlt'),
    link: formString(formData, 'link'),
    repo: formString(formData, 'repo'),
    tags: csv(formData.get('tags')),
    outcomes: parseJsonField(
      formData.get('outcomes'),
      projectOutcomeListSchema,
      'outcomes',
    ),
    media: parseJsonField(
      formData.get('media'),
      projectMediaListSchema,
      'media',
    ),
    links: parseJsonField(
      formData.get('links'),
      projectLinkListSchema,
      'links',
    ),
    featured: formData.get('featured') === 'on',
    sortOrder: parseInteger(formString(formData, 'sortOrder') || '0', 'Sort order'),
  });
}

export function parsePostForm(formData: FormData): PostInput {
  const title = formString(formData, 'title').trim();
  const requestedSlug = formString(formData, 'slug');
  const publishedAtRaw = formString(formData, 'publishedAt').trim();
  const publishedAt = publishedAtRaw ? new Date(publishedAtRaw) : new Date();

  return parseSchema(postInputSchema, {
    title,
    slug: slugify(requestedSlug) || slugify(title),
    excerpt: formString(formData, 'excerpt'),
    body: formString(formData, 'body'),
    coverImage: formString(formData, 'coverImage'),
    tags: csv(formData.get('tags')),
    published: formData.get('published') === 'on',
    publishedAt,
  });
}
