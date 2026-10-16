import { z } from 'zod';

import {
  AdminValidationError,
  postInputSchema,
  profileInputSchema,
  projectInputSchema,
  settingsInputSchema,
  type PostInput,
  type ProfileInput,
  type ProjectInput,
  type SettingsInput,
} from '@/lib/admin/validation';

/** Reject metadata writes and never coerce unknown JSON fields silently. */
function parseAgentContent<T extends object>(
  schema: z.ZodType<T>,
  fields: readonly string[],
  input: unknown,
  current?: T,
): T {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    throw new AdminValidationError('Payload must be a JSON object.');
  }
  const payload = input as Record<string, unknown>;
  const allowed = new Set(fields);
  for (const field of Object.keys(payload)) {
    if (!allowed.has(field)) {
      throw new AdminValidationError(`Unsupported content field: ${field}.`);
    }
  }
  if (Object.keys(payload).length === 0) {
    throw new AdminValidationError('Payload must contain at least one content field.');
  }

  const existing = current as Record<string, unknown> | undefined;
  const base = existing
    ? Object.fromEntries(fields.map((field) => [field, existing[field]]))
    : {};
  const result = schema.safeParse({ ...base, ...payload });
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new AdminValidationError(
      `${issue.path.join('.') || 'Payload'}: ${issue.message}.`,
    );
  }
  return result.data;
}

export function parseAgentProfileInput(input: unknown, current?: ProfileInput): ProfileInput {
  return parseAgentContent(profileInputSchema, Object.keys(profileInputSchema.shape), input, current);
}

export function parseAgentSettingsInput(input: unknown, current?: SettingsInput): SettingsInput {
  return parseAgentContent(settingsInputSchema, Object.keys(settingsInputSchema.shape), input, current);
}

export function parseAgentProjectInput(input: unknown, current?: ProjectInput): ProjectInput {
  return parseAgentContent(projectInputSchema, Object.keys(projectInputSchema.shape), input, current);
}

export function parseAgentPostInput(input: unknown, current?: PostInput): PostInput {
  if (input !== null && typeof input === 'object' && !Array.isArray(input)) {
    const body = input as Record<string, unknown>;
    if (Object.hasOwn(body, 'publishedAt')) {
      const value = body.publishedAt;
      if (typeof value !== 'string' || value.length > 40 || !value.endsWith('Z')) {
        throw new AdminValidationError('publishedAt must be a UTC ISO 8601 string.');
      }
      const date = new Date(value);
      if (!Number.isFinite(date.getTime())) {
        throw new AdminValidationError('publishedAt must be a valid date.');
      }
      return parseAgentContent(
        postInputSchema,
        Object.keys(postInputSchema.shape),
        { ...body, publishedAt: date },
        current,
      );
    }
  }
  return parseAgentContent(postInputSchema, Object.keys(postInputSchema.shape), input, current);
}
