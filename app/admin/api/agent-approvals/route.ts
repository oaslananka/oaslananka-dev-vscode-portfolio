import { isAuthenticated } from '@/lib/auth';
import { AgentWriteInputError, isAgentWriteConfigured, parseAgentIdempotencyKey, parseIfMatchRevision, readAgentJsonPatch } from '@/lib/agent-api/write-policy';
import { issueAgentApproval } from '@/lib/agent-api/approval';
import { isCanonicalSlug } from '@/lib/slug-policy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isEditableResource(path: string): boolean {
  if (path === '/api/agent/v1/profile' || path === '/api/agent/v1/settings') return true;
  const match = /^\/api\/agent\/v1\/(projects|posts)\/([^/]+)$/.exec(path);
  return Boolean(match && isCanonicalSlug(match[2]));
}

/** Requires verified admin session + same-origin explicit POST. It never edits content. */
export async function POST(request: Request): Promise<Response> {
  const headers = { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow' };
  if (!(await isAuthenticated())) return Response.json({ error: 'Unauthorized' }, { status: 401, headers });
  // Next.js may use an internal URL during proxying; the browser's Origin
  // must match the HTTP Host that actually received the request. A foreign
  // website cannot override Host in a browser request.
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  let fromSameOrigin = false;
  try {
    if (origin && host) {
      const parsed = new URL(origin);
      fromSameOrigin = parsed.host === host &&
        (parsed.protocol === 'https:' ||
          (parsed.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname)));
    }
  } catch {
    // Invalid Origin fails closed.
  }
  if (!fromSameOrigin) {
    return Response.json({ error: 'Same-origin administrator action required' }, { status: 403, headers });
  }
  if (!isAgentWriteConfigured({
    AGENT_CONTENT_WRITE_ENABLED: process.env.AGENT_CONTENT_WRITE_ENABLED,
    AGENT_API_SECRET_KEY: process.env.AGENT_API_SECRET_KEY,
    AGENT_API_WRITE_KEY: process.env.AGENT_API_WRITE_KEY,
    AGENT_WRITE_ACTOR_ID: process.env.AGENT_WRITE_ACTOR_ID,
  })) return Response.json({ error: 'Write API disabled' }, { status: 503, headers });

  try {
    const resource = request.headers.get('x-agent-resource');
    if (!resource || !isEditableResource(resource)) {
      throw new AgentWriteInputError(400, 'Unsupported resource for approval.');
    }
    const revision = parseIfMatchRevision(request.headers.get('if-match'));
    const requestId = parseAgentIdempotencyKey(request.headers.get('idempotency-key'));
    const patch = await readAgentJsonPatch(request);
    // The approval must match exactly the proposed JSON change, not a generic
    // one-time right to update any content in this authenticated session.
    const approval = await issueAgentApproval({
      actorId: process.env.AGENT_WRITE_ACTOR_ID!, requestId, resource, revision, patch,
    });
    return Response.json({ approval, expiresInSeconds: 180 }, { status: 201, headers });
  } catch (error) {
    if (error instanceof AgentWriteInputError) {
      return Response.json({ error: error.message }, { status: error.status, headers });
    }
    return Response.json({ error: 'Approval unavailable' }, { status: 503, headers });
  }
}
