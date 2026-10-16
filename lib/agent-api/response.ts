import { db } from '@/lib/db';
import { verifyAgentBearer } from './auth';

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
  if (!verifyAgentBearer(request.headers.get('authorization'), token)) {
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
