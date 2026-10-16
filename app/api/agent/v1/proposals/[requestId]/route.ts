import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { agentContentProposals } from '@/lib/db/schema';
import { issueAgentApproval } from '@/lib/agent-api/approval';
import { verifyAgentBearer } from '@/lib/agent-api/auth';
import { agentJson } from '@/lib/agent-api/response';
import { isAgentWriteConfigured, parseAgentIdempotencyKey } from '@/lib/agent-api/write-policy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ requestId: string }> },
): Promise<Response> {
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
    const { requestId: rawId } = await params;
    const requestId = parseAgentIdempotencyKey(rawId);
    const [proposal] = await db.select().from(agentContentProposals)
      .where(eq(agentContentProposals.requestId, requestId)).limit(1);
    if (!proposal || proposal.actorId !== process.env.AGENT_WRITE_ACTOR_ID) {
      return agentJson({ error: 'Not found' }, 404);
    }
    if (proposal.expiresAt <= new Date()) {
      return agentJson({ requestId, status: 'expired' });
    }
    if (proposal.status !== 'approved') {
      return agentJson({ requestId, status: proposal.status });
    }
    // This signed token is returned only to an authenticated agent and is
    // valid for this exact, previously administrator-approved content change.
    const approval = await issueAgentApproval({
      actorId: proposal.actorId,
      requestId,
      resource: proposal.resource,
      revision: proposal.expectedRevision,
      patch: proposal.patch,
    });
    return agentJson({ requestId, status: 'approved', approval, expiresInSeconds: 180 });
  } catch {
    return agentJson({ error: 'Not found' }, 404);
  }
}
