/**
 * Only persisted contact messages are leads. Honeypot submissions are shown
 * a decoy success response and must not be counted.
 */
export const CONTACT_SAVED_EVENT = 'portfolio:contact-saved';

export function isRecordedContactSuccess(state: {
  ok: boolean;
  stored?: boolean;
}): boolean {
  return state.ok && state.stored === true;
}

export function reportContactLead({
  choice,
  gaId,
  isAdminRoute,
  gtag,
}: {
  choice: 'analytics' | 'essential' | null;
  gaId?: string;
  isAdminRoute: boolean;
  gtag?: (...args: unknown[]) => void;
}): boolean {
  if (choice !== 'analytics' || !gaId || isAdminRoute || !gtag) return false;

  // No name, email, message, organization, or other user-provided data.
  gtag('event', 'generate_lead', { send_to: gaId });
  return true;
}
