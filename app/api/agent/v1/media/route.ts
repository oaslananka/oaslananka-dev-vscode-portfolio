import { verifyAgentBearer } from '@/lib/agent-api/auth';
import { agentJson } from '@/lib/agent-api/response';
import { isAgentWriteConfigured } from '@/lib/agent-api/write-policy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_REQUEST_BYTES = 2_900_000;
const MAX_BASE64_LENGTH = Math.ceil((2 * 1024 * 1024) / 3) * 4 + 4;
const MEDIA_URL = 'https://media.oaslananka.dev/v1/media';

interface MediaUpload {
  mimeType: 'image/png' | 'image/jpeg' | 'image/webp';
  contentBase64: string;
}

function validBase64(value: string): boolean {
  if (value.length === 0 || value.length > MAX_BASE64_LENGTH || value.length % 4 !== 0) {
    return false;
  }
  let padding = false;
  let paddingCount = 0;
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code === 61) {
      padding = true;
      if (++paddingCount > 2) return false;
      continue;
    }
    if (padding || !((code >= 65 && code <= 90)
      || (code >= 97 && code <= 122)
      || (code >= 48 && code <= 57)
      || code === 43 || code === 47)) return false;
  }
  return true;
}

function validDigest(value: unknown): value is string {
  if (typeof value !== 'string' || value.length !== 64) return false;
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (!((code >= 48 && code <= 57) || (code >= 97 && code <= 102))) return false;
  }
  return true;
}

function isMediaUpload(value: unknown): value is MediaUpload {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  if (Object.keys(record).length !== 2 || !Object.hasOwn(record, 'mimeType')
    || !Object.hasOwn(record, 'contentBase64')) return false;
  return (record.mimeType === 'image/png'
    || record.mimeType === 'image/jpeg' || record.mimeType === 'image/webp')
    && typeof record.contentBase64 === 'string'
    && validBase64(record.contentBase64);
}

async function readMediaBody(body: ReadableStream<Uint8Array> | null): Promise<MediaUpload | null> {
  if (!body) return null;
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  const reader = body.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_REQUEST_BYTES) return null;
      chunks.push(value);
    }
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }

  try {
    const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    return isMediaUpload(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function validMediaResult(value: unknown, input: MediaUpload): value is {
  url: string; sha256: string; mimeType: string; bytes: number; created: boolean;
} {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const media = value as Record<string, unknown>;
  const extension = input.mimeType === 'image/jpeg' ? 'jpg'
    : input.mimeType === 'image/png' ? 'png' : 'webp';
  return validDigest(media.sha256)
    && media.url === `https://media.oaslananka.dev/files/${media.sha256}.${extension}`
    && media.mimeType === input.mimeType
    && typeof media.bytes === 'number' && Number.isSafeInteger(media.bytes)
    && media.bytes > 0 && media.bytes <= 2 * 1024 * 1024
    && typeof media.created === 'boolean';
}

async function uploadToMediaService(input: MediaUpload, token: string): Promise<Response> {
  try {
    const response = await fetch(MEDIA_URL, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify(input),
      redirect: 'error',
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      const rejection = [413, 415, 422, 429, 507].includes(response.status);
      return agentJson({ error: rejection ? 'Media rejected by upload service' : 'Media unavailable' },
        rejection ? response.status : 502);
    }
    const result: unknown = await response.json();
    if (!validMediaResult(result, input)) return agentJson({ error: 'Unexpected media response' }, 502);
    return agentJson(result, response.status);
  } catch {
    return agentJson({ error: 'Media unavailable' }, 502);
  }
}

/**
 * A single owner-facing API proxies image bytes to the existing independent
 * media origin. The origin's secret remains server-only and separate from the
 * writer credential. CMS/publication changes still require admin approval.
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
  const length = request.headers.get('content-length');
  if (length && (!/^\d+$/.test(length) || Number(length) > MAX_REQUEST_BYTES)) {
    return agentJson({ error: 'Media exceeds upload limit' }, 413);
  }
  const input = await readMediaBody(request.body);
  if (!input) return agentJson({ error: 'Invalid media input or upload size' }, 422);
  return uploadToMediaService(input, upstreamToken);
}
