/**
 * Existing database schema requires a non-null expires_at value.
 * New owner-review proposals use this effectively unbounded sentinel;
 * older expired requests retain their original expiry (not resurrected).
 */
export const PERSISTENT_PROPOSAL_EXPIRY = new Date('9999-12-31T23:59:59.000Z');

export function isPersistentProposalExpiry(value: Date): boolean {
  return value.getTime() === PERSISTENT_PROPOSAL_EXPIRY.getTime();
}
