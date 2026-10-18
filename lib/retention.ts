import 'server-only';

import { lt } from 'drizzle-orm';

import { db } from './db';
import { agentContentProposals, contactMessages, loginAttempts } from './db/schema';

const RATE_LIMIT_RETENTION_MS = 24 * 60 * 60 * 1000;

export interface RetentionCleanupResult {
  contactMessages: number;
  rateLimitAttempts: number;
  agentProposals: number;
}

export async function purgeExpiredRecords(
  now = new Date(),
): Promise<RetentionCleanupResult | null> {
  if (!db) return null;

  const expiredMessages = await db
    .delete(contactMessages)
    .where(lt(contactMessages.retentionExpiresAt, now))
    .returning();

  const rateLimitCutoff = new Date(now.getTime() - RATE_LIMIT_RETENTION_MS);
  const expiredAttempts = await db
    .delete(loginAttempts)
    .where(lt(loginAttempts.createdAt, rateLimitCutoff))
    .returning();

  // Proposal bodies can contain private draft content. Keep them only for a
  // short operational review window; completed audit writes remain immutable.
  const proposalCutoff = new Date(now.getTime() - RATE_LIMIT_RETENTION_MS);
  const expiredProposals = await db.delete(agentContentProposals)
    .where(lt(agentContentProposals.expiresAt, proposalCutoff))
    .returning();

  return {
    contactMessages: expiredMessages.length,
    rateLimitAttempts: expiredAttempts.length,
    agentProposals: expiredProposals.length,
  };
}
