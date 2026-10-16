import 'server-only';

import { applyAgentMutation, type AgentMutationContext } from './transaction';
import { verifyAgentApproval } from './approval';

import { verifyAgentBearer } from './auth';
import { agentJson, AgentNotFoundError } from './response';
import { readAgentJsonPatch, parseIfMatchRevision, parseAgentIdempotencyKey, isAgentWriteConfigured, AgentWriteInputError } from './write-policy';
import { db } from '@/lib/db';
import { consumeRateLimitAttempt, type RateLimitPolicy } from '@/lib/rate-limit';
import { AdminValidationError } from '@/lib/admin/validation';
import { ContentRevisionConflictError } from '@/lib/content-management/revision';

const writePolicy: RateLimitPolicy = { scope: 'agent-write', windowMs: 60 * 60 * 1000, maxAttempts: 30 };

/** Mutations are entirely disabled unless both an independent key and flag are configured. */
export async function agentWrite(
  request: Request,
  change: (body: Record<string, unknown>, revision: number, scope: AgentMutationContext) => Promise<void>,
): Promise<Response> {
  if (!isAgentWriteConfigured({
    AGENT_CONTENT_WRITE_ENABLED: process.env.AGENT_CONTENT_WRITE_ENABLED,
    AGENT_API_SECRET_KEY: process.env.AGENT_API_SECRET_KEY,
    AGENT_API_WRITE_KEY: process.env.AGENT_API_WRITE_KEY,
    AGENT_WRITE_ACTOR_ID: process.env.AGENT_WRITE_ACTOR_ID,
  })) return agentJson({ error: 'Write API disabled' }, 503);
  if (!verifyAgentBearer(request.headers.get('authorization'), process.env.AGENT_API_WRITE_KEY)) {
    return agentJson({ error: 'Unauthorized' }, 401);
  }
  if (!db) return agentJson({ error: 'Content unavailable' }, 503);

  try {
    const expectedRevision = parseIfMatchRevision(request.headers.get('if-match'));
    const idempotencyKey = parseAgentIdempotencyKey(request.headers.get('idempotency-key'));
    if (!await consumeRateLimitAttempt('agent-editor', writePolicy)) {
      return agentJson({ error: 'Too many requests or rate-limit unavailable' }, 429);
    }
    const body = await readAgentJsonPatch(request);
    const approvalId = await verifyAgentApproval(request.headers.get('x-agent-approval'), {
      actorId: process.env.AGENT_WRITE_ACTOR_ID!,
      requestId: idempotencyKey,
      resource: new URL(request.url).pathname,
      revision: expectedRevision,
      patch: body,
    });
    const connectionString = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
    if (!connectionString) return agentJson({ error: 'Content unavailable' }, 503);
    await applyAgentMutation({
      actorId: process.env.AGENT_WRITE_ACTOR_ID!,
      requestId: idempotencyKey,
      resource: new URL(request.url).pathname,
      revision: expectedRevision,
      patch: body,
      approvalId,
    }, async (scope) => change(body, expectedRevision, scope), connectionString);
    return new Response(null, { status: 204, headers: { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow' } });
  } catch (error) {
    if (error instanceof AgentWriteInputError) return agentJson({ error: error.message }, error.status);
    if (error instanceof AdminValidationError) return agentJson({ error: error.message }, 422);
    if (error instanceof AgentNotFoundError) return agentJson({ error: 'Not found' }, 404);
    if (error instanceof ContentRevisionConflictError) return agentJson({ error: 'Revision conflict; read the latest version.' }, 409);
    return agentJson({ error: 'Content unavailable' }, 503);
  }
}
