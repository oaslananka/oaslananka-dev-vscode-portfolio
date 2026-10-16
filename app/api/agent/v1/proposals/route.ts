import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { agentContentProposals } from '@/lib/db/schema';
import { approvalFingerprint } from '@/lib/agent-api/approval';
import { verifyAgentBearer } from '@/lib/agent-api/auth';
import { AgentNotFoundError, agentJson } from '@/lib/agent-api/response';
import {
  AgentWriteInputError, isAgentWriteConfigured,
  parseAgentIdempotencyKey, parseIfMatchRevision, readAgentJsonPatch,
} from '@/lib/agent-api/write-policy';
import { validateProposal } from '@/lib/agent-api/proposals';
import { consumeRateLimitAttempt, type RateLimitPolicy } from '@/lib/rate-limit';
import { AdminValidationError } from '@/lib/admin/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const proposalPolicy: RateLimitPolicy = {
  scope: 'agent-proposal', windowMs: 60 * 60 * 1000, maxAttempts: 30,
};
const LIFETIME_MS = 15 * 60 * 1000;

export async function POST(request: Request): Promise<Response> {
  if (!isAgentWriteConfigured({
    AGENT_CONTENT_WRITE_ENABLED: process.env.AGENT_CONTENT_WRITE_ENABLED,
    AGENT_API_SECRET_KEY: process.env.AGENT_API_SECRET_KEY,
    AGENT_API_WRITE_KEY: process.env.AGENT_API_WRITE_KEY,
    AGENT_WRITE_ACTOR_ID: process.env.AGENT_WRITE_ACTOR_ID,
  })) return agentJson({ error: 'Proposal API disabled' }, 503);
  if (!verifyAgentBearer(request.headers.get('authorization'), process.env.AGENT_API_WRITE_KEY)) {
    return agentJson({ error: 'Unauthorized' }, 401);
  }
  if (!db) return agentJson({ error: 'Content unavailable' }, 503);
  try {
    const requestId = parseAgentIdempotencyKey(request.headers.get('idempotency-key'));
    const revision = parseIfMatchRevision(request.headers.get('if-match'));
    if (!await consumeRateLimitAttempt('agent-proposal', proposalPolicy)) {
      return agentJson({ error: 'Proposal rate limit reached' }, 429);
    }

    const json = await readAgentJsonPatch(request);
    if (Object.keys(json).sort().join(',') !== 'patch,resource' ||
        typeof json.resource !== 'string' || !json.patch ||
        typeof json.patch !== 'object' || Array.isArray(json.patch)) {
      throw new AgentWriteInputError(400, 'Expected resource and patch fields.');
    }
    const resource = json.resource;
    const patch = json.patch as Record<string, unknown>;
    if (Object.keys(patch).length === 0) throw new AgentWriteInputError(400, 'An edit is required.');

    const actorId = process.env.AGENT_WRITE_ACTOR_ID!;
    const subject = { actorId, requestId, resource, revision, patch };
    const fingerprint = approvalFingerprint(subject);
    const [prior] = await db.select().from(agentContentProposals)
      .where(eq(agentContentProposals.requestId, requestId)).limit(1);
    if (prior) {
      if (prior.actorId !== actorId || prior.fingerprint !== fingerprint) {
        return agentJson({ error: 'Request key already used for different content' }, 409);
      }
      return agentJson({ requestId, status: prior.status }, 200);
    }

    await validateProposal(resource, revision, patch);
    await db.insert(agentContentProposals).values({
      requestId, actorId, resource, expectedRevision: revision, patch, fingerprint,
      expiresAt: new Date(Date.now() + LIFETIME_MS),
    }).onConflictDoNothing();

    const [saved] = await db.select().from(agentContentProposals)
      .where(eq(agentContentProposals.requestId, requestId)).limit(1);
    if (!saved || saved.actorId !== actorId || saved.fingerprint !== fingerprint) {
      return agentJson({ error: 'Request key already used for different content' }, 409);
    }
    return agentJson({ requestId, status: saved.status }, 202);
  } catch (error) {
    if (error instanceof AgentWriteInputError) return agentJson({ error: error.message }, error.status);
    if (error instanceof AdminValidationError) return agentJson({ error: error.message }, 422);
    if (error instanceof AgentNotFoundError) return agentJson({ error: 'Content not found' }, 404);
    return agentJson({ error: 'Proposal unavailable' }, 503);
  }
}
