import {
  postInputSchema,
  profileInputSchema,
  projectInputSchema,
  settingsInputSchema,
  type PostInput,
  type ProfileInput,
  type ProjectInput,
  type SettingsInput,
} from '@/lib/admin/validation';
import {
  parseAgentPostInput,
  parseAgentProfileInput,
  parseAgentProjectInput,
  parseAgentSettingsInput,
} from './json-input';

/** DB-trigger snapshots use snake_case; project only schema-defined editable fields. */
function selectSnapshotFields(snapshot: unknown, fields: readonly string[]): Record<string, unknown> {
  if (snapshot === null || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
    throw new TypeError('History entry has no restorable content.');
  }
  const row = snapshot as Record<string, unknown>;
  return Object.fromEntries(fields.map((field) => [
    field,
    row[field.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)],
  ]));
}

export function restoreProfileInput(snapshot: unknown): ProfileInput {
  return parseAgentProfileInput(selectSnapshotFields(snapshot, Object.keys(profileInputSchema.shape)));
}

export function restoreSettingsInput(snapshot: unknown): SettingsInput {
  return parseAgentSettingsInput(selectSnapshotFields(snapshot, Object.keys(settingsInputSchema.shape)));
}

export function restoreProjectInput(snapshot: unknown): ProjectInput {
  return parseAgentProjectInput(selectSnapshotFields(snapshot, Object.keys(projectInputSchema.shape)));
}

export function restorePostInput(snapshot: unknown): PostInput {
  const fields = selectSnapshotFields(snapshot, Object.keys(postInputSchema.shape));
  if (typeof fields.publishedAt === 'string') {
    const date = new Date(fields.publishedAt);
    if (Number.isFinite(date.getTime())) fields.publishedAt = date.toISOString();
  }
  return parseAgentPostInput(fields);
}
