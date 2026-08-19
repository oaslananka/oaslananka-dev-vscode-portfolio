export const ALLOWED_REMOTE_IMAGE_HOSTNAMES = [
  'avatars.githubusercontent.com',
] as const;

const ALLOWED_REMOTE_IMAGE_HOSTNAME_SET = new Set<string>(
  ALLOWED_REMOTE_IMAGE_HOSTNAMES,
);

export function isAllowedImageSource(value: string): boolean {
  const source = value.trim();

  if (!source) return true;

  // Local public assets are allowed, but protocol-relative URLs are not.
  if (source.startsWith('/')) {
    return !source.startsWith('//') && !source.includes('\\');
  }

  try {
    const url = new URL(source);
    return (
      url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      ALLOWED_REMOTE_IMAGE_HOSTNAME_SET.has(url.hostname)
    );
  } catch {
    return false;
  }
}

export function assertAllowedImageSource(value: string, fieldName: string): void {
  if (!isAllowedImageSource(value)) {
    throw new Error(
      `${fieldName} must be a local /public path or an HTTPS image from: ${ALLOWED_REMOTE_IMAGE_HOSTNAMES.join(', ')}.`,
    );
  }
}
