export class ContentRevisionConflictError extends Error {
  override readonly name = 'ContentRevisionConflictError';
  constructor() {
    super('Content was changed or removed after the revision you read.');
  }
}

export function assertExpectedRevision(value: number): void {
  if (!Number.isSafeInteger(value) || value < 1 || value > 2_147_483_646) {
    throw new RangeError('expectedRevision must be a positive bounded integer.');
  }
}
