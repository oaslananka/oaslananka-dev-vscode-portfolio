export const AVAILABLE_FOR_WORK_COPY =
  'Open to senior software, edge AI, embedded systems and technical leadership roles; selected consulting engagements considered.';

export const NOT_AVAILABLE_FOR_WORK_COPY =
  'Not currently available for new work.';

export function profileAvailabilityCopy(availableForWork: boolean): string {
  return availableForWork
    ? AVAILABLE_FOR_WORK_COPY
    : NOT_AVAILABLE_FOR_WORK_COPY;
}
