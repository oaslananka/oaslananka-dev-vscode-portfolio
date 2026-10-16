import { createHash, timingSafeEqual } from 'node:crypto';

/** Exact, bounded bearer token comparison, without leaking the token length. */
export function verifyAgentBearer(
  header: string | null,
  expected: string | undefined,
): boolean {
  if (!expected || Buffer.byteLength(expected, 'utf8') < 32) return false;
  if (!header || header.length > 8_200) return false;
  const match = /^Bearer ([\x21-\x7e]+)$/.exec(header);
  if (!match) return false;
  const actualDigest = createHash('sha256').update(match[1]).digest();
  const expectedDigest = createHash('sha256').update(expected).digest();
  return timingSafeEqual(actualDigest, expectedDigest);
}
