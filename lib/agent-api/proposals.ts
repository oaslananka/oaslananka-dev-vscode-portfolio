import 'server-only';

import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { profile, siteSettings, projects, posts } from '@/lib/db/schema';
import {
  parseAgentPostInput, parseAgentProfileInput,
  parseAgentProjectInput, parseAgentSettingsInput,
} from '@/lib/content-management/json-input';
import { isCanonicalSlug } from '@/lib/slug-policy';
import { isThemeKey, type ThemeKey } from '@/lib/themes';
import { AdminValidationError } from '@/lib/admin/validation';
import { AgentNotFoundError } from './response';
import { AgentWriteInputError } from './write-policy';

export type EditableResource =
  | { kind: 'profile' | 'settings' }
  | { kind: 'project' | 'post'; slug: string };

export function parseEditableResource(value: string): EditableResource {
  if (value === '/api/agent/v1/profile') return { kind: 'profile' };
  if (value === '/api/agent/v1/settings') return { kind: 'settings' };
  if (value.length > 320) throw new AgentWriteInputError(400, 'Resource too long.');
  const match = /^\/api\/agent\/v1\/(projects|posts)\/([^/]+)$/.exec(value);
  if (match && isCanonicalSlug(match[2]) && value.length <= 320) {
    return { kind: match[1] === 'projects' ? 'project' : 'post', slug: match[2] };
  }
  throw new AgentWriteInputError(400, 'Unsupported content resource.');
}

function validateStoredTheme(theme: string): ThemeKey {
  if (!isThemeKey(theme)) throw new AdminValidationError('Invalid stored theme.');
  return theme;
}

function preventPublishedPostEdit(
  published: boolean,
  patch: Record<string, unknown>,
): void {
  if (published || Object.hasOwn(patch, 'published') || Object.hasOwn(patch, 'publishedAt')) {
    throw new AgentWriteInputError(403, 'Published content needs a separate publication workflow.');
  }
}

/** Validate against current stored content without modifying it. */
export async function validateProposal(
  resource: string,
  revision: number,
  patch: Record<string, unknown>,
): Promise<{ current: Record<string, unknown> }> {
  if (!db) throw new AgentWriteInputError(503, 'Content unavailable.');
  const parsed = parseEditableResource(resource);
  let current: Record<string, unknown> | undefined;
  switch (parsed.kind) {
    case 'profile': {
      const [row] = await db.select().from(profile).limit(1);
      if (row) {
        parseAgentProfileInput(patch, row);
        current = row;
      }
      break;
    }
    case 'settings': {
      const [row] = await db.select().from(siteSettings).limit(1);
      if (row) {
        const validatedTheme = validateStoredTheme(row.defaultTheme);
        parseAgentSettingsInput(patch, { ...row, defaultTheme: validatedTheme });
        current = row;
      }
      break;
    }
    case 'project': {
      const [row] = await db.select().from(projects).where(eq(projects.slug, parsed.slug)).limit(1);
      if (row) {
        parseAgentProjectInput(patch, row);
        current = row;
      }
      break;
    }
    case 'post': {
      const [row] = await db.select().from(posts).where(eq(posts.slug, parsed.slug)).limit(1);
      if (row) {
        preventPublishedPostEdit(row.published, patch);
        parseAgentPostInput(patch, row);
        current = row;
      }
      break;
    }
  }

  if (!current) throw new AgentNotFoundError();
  if (current.revision !== revision) {
    throw new AgentWriteInputError(409, 'Content changed: obtain its latest revision.');
  }
  return { current };
}
