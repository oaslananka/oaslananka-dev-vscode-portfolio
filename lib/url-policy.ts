function parseUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

export function isSafeHttpsUrl(value: string): boolean {
  const url = parseUrl(value.trim());
  return Boolean(
    url &&
      url.protocol === 'https:' &&
      url.hostname &&
      !url.username &&
      !url.password,
  );
}

export function isSafeResourceUrl(value: string): boolean {
  const resource = value.trim();
  if (!resource) return true;

  if (resource.startsWith('/')) {
    return !resource.startsWith('//') && !resource.includes('\\');
  }

  return isSafeHttpsUrl(resource);
}

export function isSafeSocialUrl(value: string): boolean {
  const socialUrl = value.trim();
  if (isSafeHttpsUrl(socialUrl)) return true;
  if (!socialUrl.startsWith('mailto:') || /[\r\n]/.test(socialUrl)) return false;

  const address = socialUrl.slice('mailto:'.length).split('?')[0];
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(address);
}

export function assertSafeHttpsUrl(value: string, fieldName: string): void {
  if (value.trim() && !isSafeHttpsUrl(value)) {
    throw new Error(`${fieldName} must be an HTTPS URL without credentials.`);
  }
}

export function assertSafeResourceUrl(value: string, fieldName: string): void {
  if (!isSafeResourceUrl(value)) {
    throw new Error(`${fieldName} must be a local path or an HTTPS URL.`);
  }
}
