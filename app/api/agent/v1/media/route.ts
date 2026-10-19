import { verifyAgentBearer } from '@/lib/agent-api/auth';
import { agentJson } from '@/lib/agent-api/response';
import { isAgentWriteConfigured } from '@/lib/agent-api/write-policy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_REQUEST_BYTES = 2_900_000;
const MEDIA_URL = 'https://media.oaslananka.dev/v1/media';
const MAX_BASE64_LENGTH = Math.ceil((2 * 1024 * 1024) / 3) * 4 + 4;

/**
 * One external owner API: proxy only small image bytes to the independent,
 * quota-controlled media origin. Project edits still require signed approval.
 * The upstream MEDIA_UPLOAD_TOKEN remains server-side and is not the agent key.
 */
export async function POST(request: Request): Promise<Response> {
  const env = {
    AGENT_CONTENT_WRITE_ENABLED: process.env.AGENT_CONTENT_WRITE_ENABLED,
    AGENT_API_SECRET_KEY: process.env.AGENT_API_SECRET_KEY,
    AGENT_API_WRITE_KEY: process.env.AGENT_API_WRITE_KEY,
    AGENT_WRITE_ACTOR_ID: process.env.AGENT_WRITE_ACTOR_ID,
  };
  if (!isAgentWriteConfigured(env)) return agentJson({ error: 'Write API disabled' }, 503);
  if (!verifyAgentBearer(request.headers.get('authorization'), env.AGENT_API_WRITE_KEY)) {
    return agentJson({ error: 'Unauthorized' }, 401);
  }
  const upstreamToken = process.env.MEDIA_UPLOAD_TOKEN;
  if (!upstreamToken || Buffer.byteLength(upstreamToken, 'utf8') < 32) {
    return agentJson({ error: 'Media unavailable' }, 503);
  }
  if (request.headers.get('content-type')?.toLowerCase() !== 'application/json') {
    return agentJson({ error: 'Content-Type must be application/json' }, 415);
  }
  const declared = request.headers.get('content-length');
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > MAX_REQUEST_BYTES)) {
    return agentJson({ error: 'Media exceeds upload limit' }, 413);
  }
  if (!request.body) return agentJson({ error: 'JSON body required' }, 400);

  const chunks: Uint8Array[] = [];
  let bytes = 0;
  const reader = request.body.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_REQUEST_BYTES) return agentJson({ error: 'Media exceeds upload limit' }, 413);
      chunks.push(value);
    }
  } catch {
    return agentJson({ error: 'Invalid request body' }, 400);
  } finally {
    reader.releaseLock();
  }

  let body: unknown;
  try {
    body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return agentJson({ error: 'Invalid JSON body' }, 400);
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return agentJson({ error: 'Invalid media input' }, 422);
  }
  const input = body as Record<string, unknown>;
  if (Object.keys(input).sort().join(',') !== 'contentBase64,mimeType'
    || !['image/png', 'image/jpeg', 'image/webp'].includes(String(input.mimeType))
    || typeof input.contentBase64 !== 'string'
    || input.contentBase64.length > MAX_BASE64_LENGTH
    || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(input.contentBase64)) {
    return agentJson({ error: 'Invalid media input' }, 422);
  }
  try {
    const response = await fetch(MEDIA_URL, {
      method: 'POST',
      headers: { authorization: `Bearer ${upstreamToken}`, 'content-type': 'application/json' },
      body: JSON.stringify(input),
      redirect: 'error',
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      if ([413, 415, 422, 429, 507].includes(response.status)) {
        return agentJson({ error: 'Media rejected by upload service' }, response.status);
      }
      return agentJson({ error: 'Media unavailable' }, 502);
    }
    const result: unknown = await response.json();
    if (!result || typeof result !== 'object' || Array.isArray(result)) {
      return agentJson({ error: 'Unexpected media response' }, 502);
    }
    const media = result as Record<string, unknown>;
    if (typeof media.url !== 'string'
      || !/^https:\/\/media\.oaslananka\.dev\/files\/[a-f0-9]{64}\.(png|jpg|webp)$/.test(media.url)
      || typeof media.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(media.sha256)
      || media.mimeType !== input.mimeType) {
      return agentJson({ error: 'Unexpected media response' }, 502);
    }
    return agentJson({
      url: media.url, sha256: media.sha256, mimeType: media.mimeType,
      bytes: media.bytes, created: media.created,
    }, response.status);
  } catch {
    return agentJson({ error: 'Media unavailable' }, 502);
  }
}
