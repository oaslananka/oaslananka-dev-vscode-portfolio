import 'server-only';

import { and, eq } from 'drizzle-orm';

import { requireDb } from '@/lib/admin/actions/shared';
import { contentChanges } from '@/lib/db/schema';
import {
  restorePostInput,
  restoreProfileInput,
  restoreProjectInput,
  restoreSettingsInput,
} from './history-input';
import {
  savePostContent,
  saveProfileContent,
  saveProjectContent,
  saveSettingsContent,
} from './mutations';
import { assertExpectedRevision } from './revision';

export type ContentHistoryEntity = 'profile' | 'site_settings' | 'projects' | 'posts';

/** Authenticated callers only. Restores are new conditional writes, never log rewinds.
 * Caller MUST authenticate and authorize publication/restoration before calling.
 * Deletion resurrection is intentionally unsupported until its own safety tests exist.
 */
export async function restoreContentRevision(
  entity: ContentHistoryEntity,
  id: number,
  targetRevision: number,
  expectedRevision: number,
): Promise<void> {
  assertExpectedRevision(targetRevision);
  assertExpectedRevision(expectedRevision);
  if (!Number.isSafeInteger(id) || id < 1 || targetRevision >= expectedRevision) {
    throw new RangeError('Invalid content id or target revision.');
  }
  if ((entity === 'profile' || entity === 'site_settings') && id !== 1) {
    throw new RangeError('Singleton content can only have id 1.');
  }
  const database = requireDb();
  const [history] = await database.select({ after: contentChanges.after })
    .from(contentChanges)
    .where(and(
      eq(contentChanges.entityType, entity),
      eq(contentChanges.entityId, id),
      eq(contentChanges.revision, targetRevision),
    ))
    .limit(1);
  if (!history?.after) throw new Error('Historical content is missing or deleted.');

  switch (entity) {
    case 'profile':
      await saveProfileContent(restoreProfileInput(history.after), expectedRevision);
      break;
    case 'site_settings':
      await saveSettingsContent(restoreSettingsInput(history.after), expectedRevision);
      break;
    case 'projects':
      await saveProjectContent(restoreProjectInput(history.after), id, expectedRevision);
      break;
    case 'posts':
      await savePostContent(restorePostInput(history.after), id, expectedRevision);
      break;
    default:
      throw new TypeError('Unsupported content type.');
  }
}
