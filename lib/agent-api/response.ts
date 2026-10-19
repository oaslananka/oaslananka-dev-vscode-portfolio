import { db } from '@/lib/db';
import { verifyAgentContentReader } from './auth';
import { isAgentWriteConfigured } from './write-policy';

const privateHeaders = {
  'Cache-Control': 'private, no-store',
  'X-Robots-Tag': 'noindex, nofollow',
  Vary: 'Authorization',
};

export function agentJson(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: privateHeaders });
}

export class AgentNotFoundError extends Error {}

/** Authentication and database readiness precede every private content read. */
export async function agentRead(
  request: Request,
  read: () => Promise<unknown>,
): Promise<Response> {
  const token = process.env.AGENT_API_SECRET_KEY;
  if (!token || Buffer.byteLength(token, 'utf8') < 32) {
    return agentJson({ error: 'Service unavailable' }, 503);
  }
  const writeEnabled = isAgentWriteConfigured({
    AGENT_CONTENT_WRITE_ENABLED: process.env.AGENT_CONTENT_WRITE_ENABLED,
    AGENT_API_SECRET_KEY: process.env.AGENT_API_SECRET_KEY,
    AGENT_API_WRITE_KEY: process.env.AGENT_API_WRITE_KEY,
    AGENT_WRITE_ACTOR_ID: process.env.AGENT_WRITE_ACTOR_ID,
  });
  if (!verifyAgentContentReader(
    request.headers.get('authorization'), token, process.env.AGENT_API_WRITE_KEY, writeEnabled,
  )) {
    return Response.json({ error: 'Unauthorized' }, {
      status: 401,
      headers: { ...privateHeaders, 'WWW-Authenticate': 'Bearer' },
    });
  }
  if (!db) return agentJson({ error: 'Content unavailable' }, 503);
  try {
    return agentJson(await read());
  } catch (error) {
    if (error instanceof AgentNotFoundError) {
      return agentJson({ error: 'Not found' }, 404);
    }
    return agentJson({ error: 'Content unavailable' }, 503);
  }
}
