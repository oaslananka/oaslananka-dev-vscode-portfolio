import { z } from 'zod';

const assetSourceSchema = z
  .string()
  .trim()
  .min(1)
  .max(2048)
  .refine(
    (value) => value.startsWith('/') || value.startsWith('https://'),
    'Asset sources must be local paths or HTTPS URLs.',
  );

const mediaTrackSchema = z.object({
  kind: z.enum(['captions', 'descriptions']),
  src: assetSourceSchema,
  srcLang: z.string().trim().min(2).max(16),
  label: z.string().trim().min(1).max(80),
});

const mediaBaseSchema = z.object({
  src: assetSourceSchema,
  alt: z.string().trim().min(1).max(240),
  caption: z.string().trim().max(320).optional(),
  width: z.int().positive().max(8000),
  height: z.int().positive().max(8000),
});

export const projectMediaSchema = z.discriminatedUnion('type', [
  mediaBaseSchema.extend({ type: z.literal('image') }),
  mediaBaseSchema.extend({
    type: z.literal('video'),
    poster: assetSourceSchema,
    audio: z.enum(['none', 'captions']).optional(),
    track: mediaTrackSchema.optional(),
  }),
]);

export const projectLinkSchema = z.object({
  type: z.enum(['source', 'demo', 'docs', 'package', 'marketplace']),
  label: z.string().trim().min(1).max(80),
  url: z.url().refine((value) => value.startsWith('https://'), {
    message: 'Project links must use HTTPS.',
  }),
});

export const projectMediaListSchema = z.array(projectMediaSchema).max(12);
export const projectLinkListSchema = z.array(projectLinkSchema).max(12);
export const projectOutcomeListSchema = z
  .array(z.string().trim().min(1).max(240))
  .max(8);

export type ProjectMedia = z.infer<typeof projectMediaSchema>;
export type ProjectLink = z.infer<typeof projectLinkSchema>;

type VideoMedia = Extract<ProjectMedia, { type: 'video' }>;
type VideoTrack = NonNullable<VideoMedia['track']>;

export interface VideoAccessibility {
  readonly audio: 'none' | 'captions';
  readonly track?: VideoTrack;
}

const legacyVideoAccessibility = new Map<string, VideoAccessibility>([
  [
    '/projects/sky-track-vision/demo.mp4',
    {
      audio: 'none',
      track: {
        kind: 'descriptions',
        src: '/projects/sky-track-vision/demo.en.vtt',
        srcLang: 'en',
        label: 'English visual descriptions',
      },
    },
  ],
]);

/** Keep already-published media accessible while older DB rows lack metadata. */
export function resolveVideoAccessibility(
  media: VideoMedia,
): VideoAccessibility {
  const legacy = legacyVideoAccessibility.get(media.src);
  return {
    audio: media.audio ?? legacy?.audio ?? 'none',
    track: media.track ?? legacy?.track,
  };
}

export function parseProjectJson<T>(
  raw: FormDataEntryValue | null,
  schema: z.ZodType<T>,
  label: string,
): T {
  const value = String(raw ?? '').trim();
  if (!value) return schema.parse([]);

  try {
    return schema.parse(JSON.parse(value));
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`${label} must be valid JSON.`);
    }
    if (error instanceof z.ZodError) {
      const issue = error.issues[0];
      const location = issue.path.length ? ` at ${issue.path.join('.')}` : '';
      throw new Error(`${label}${location}: ${issue.message}`);
    }
    throw error;
  }
}
