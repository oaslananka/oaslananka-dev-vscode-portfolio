import { timingSafeEqual } from 'node:crypto';

export function hasValidBearerToken(
  authorization: string | null,
  secret: string | undefined,
): boolean {
  if (!secret || !authorization?.startsWith('Bearer ')) return false;

  const supplied = Buffer.from(authorization.slice('Bearer '.length));
  const expected = Buffer.from(secret);

  return (
    supplied.length === expected.length && timingSafeEqual(supplied, expected)
  );
}
