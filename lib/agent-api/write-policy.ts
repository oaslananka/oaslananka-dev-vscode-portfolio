import { timingSafeEqual, createHash } from 'node:crypto';

const MAX_JSON_BYTES = 256 * 1024;

export class AgentWriteInputError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'AgentWriteInputError';
  }
}

/** Independent write key and explicit opt-in; production is disabled by default. */
export function isAgentWriteConfigured(env: {
  AGENT_CONTENT_WRITE_ENABLED?: string;
  AGENT_API_SECRET_KEY?: string;
  AGENT_API_WRITE_KEY?: string;
}): boolean {
  const writeKey = env.AGENT_API_WRITE_KEY;
  const readKey = env.AGENT_API_SECRET_KEY;
  if (env.AGENT_CONTENT_WRITE_ENABLED !== 'true' || !writeKey || !readKey) return false;
  if (Buffer.byteLength(writeKey, 'utf8') < 32 || Buffer.byteLength(readKey, 'utf8') < 32) return false;
  const a = createHash('sha256').update(writeKey).digest();
  const b = createHash('sha256').update(readKey).digest();
  return !timingSafeEqual(a, b);
}

/** Require a single strong ETag from the agent's most recent read. */
export function parseIfMatchRevision(header: string | null): number {
  if (!header) throw new AgentWriteInputError(428, 'If-Match revision is required.');
  if (header.length > 25 || header.charCodeAt(0) !== 34 || header.charCodeAt(header.length - 1) !== 34) {
    throw new AgentWriteInputError(400, 'Expected a quoted integer revision in If-Match.');
  }
  const raw = header.slice(1, -1);
  if (!/^[1-9][0-9]*$/.test(raw)) throw new AgentWriteInputError(400, 'Invalid revision.');
  const revision = Number(raw);
  if (!Number.isSafeInteger(revision) || revision > 2_147_483_646) {
    throw new AgentWriteInputError(400, 'Invalid revision.');
  }
  return revision;
}

/** Stream with a hard byte limit; Content-Length is not trusted. */
export async function readAgentJsonPatch(request: Request): Promise<Record<string, unknown>> {
  const contentType = request.headers.get('content-type')?.toLowerCase() ?? '';
  if (contentType !== 'application/json') throw new AgentWriteInputError(415, 'Content-Type must be application/json.');
  const contentLength = request.headers.get('content-length');
  if (contentLength && (!/^[0-9]+$/.test(contentLength) || Number(contentLength) > MAX_JSON_BYTES)) {
    throw new AgentWriteInputError(413, 'JSON payload exceeds limit.');
  }
  if (!request.body) throw new AgentWriteInputError(400, 'JSON payload required.');
  const reader = request.body.getReader();
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_JSON_BYTES) throw new AgentWriteInputError(413, 'JSON payload exceeds limit.');
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  let input: unknown;
  try {
    input = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks)));
  } catch {
    throw new AgentWriteInputError(400, 'Malformed UTF-8 JSON.');
  }
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new AgentWriteInputError(400, 'Payload must be a JSON object.');
  }
  const obj = input as Record<string, unknown>;
  if (Object.keys(obj).length === 0) throw new AgentWriteInputError(400, 'At least one field is required.');
  return obj;
}

/** Publishing/unpublishing must be a separate explicitly authorized workflow. */
export function rejectImplicitPublication(input: Record<string, unknown>): void {
  if (Object.hasOwn(input, 'published') || Object.hasOwn(input, 'publishedAt')) {
    throw new AgentWriteInputError(403, 'Publishing requires a separate authorized operation.');
  }
}
