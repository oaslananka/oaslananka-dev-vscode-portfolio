import { ADMIN_CONTENT_LIMITS } from '@/lib/admin/limits';

/** Canonical slug validation shared by editor and agent routes; O(min(n, 120)). */
export function isCanonicalSlug(value: string): boolean {
  if (value.length === 0 || value.length > ADMIN_CONTENT_LIMITS.slugLength) {
    return false;
  }

  let lastWasHyphen = true;
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code === 45) {
      if (lastWasHyphen) return false;
      lastWasHyphen = true;
    } else if (
      (code >= 97 && code <= 122) ||
      (code >= 48 && code <= 57)
    ) {
      lastWasHyphen = false;
    } else {
      return false;
    }
  }
  return !lastWasHyphen;
}
