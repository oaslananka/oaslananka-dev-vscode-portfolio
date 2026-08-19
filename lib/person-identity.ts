import type { SocialLink } from './db/schema';
import { SITE_URL } from './site-config';

export const PERSON_ALTERNATE_NAME = 'oaslananka' as const;

export const CANONICAL_IDENTITY_PROFILES: readonly SocialLink[] = [
  { platform: 'github', label: 'GitHub', url: 'https://github.com/oaslananka' },
  { platform: 'linkedin', label: 'LinkedIn', url: 'https://www.linkedin.com/in/oaslananka' },
  { platform: 'pypi', label: 'PyPI', url: 'https://pypi.org/user/oaslananka/' },
  { platform: 'npm', label: 'npm', url: 'https://www.npmjs.com/~oaslananka' },
  { platform: 'peerlist', label: 'Peerlist', url: 'https://peerlist.io/oaslananka' },
];

export function mergeCanonicalIdentityProfiles(
  socials: readonly SocialLink[],
): SocialLink[] {
  const canonicalPlatforms = new Set(
    CANONICAL_IDENTITY_PROFILES.map((social) => social.platform.toLowerCase()),
  );
  const additionalProfiles = socials.filter(
    (social) => !canonicalPlatforms.has(social.platform.toLowerCase()),
  );

  return [
    ...CANONICAL_IDENTITY_PROFILES.map((social) => ({ ...social })),
    ...additionalProfiles,
  ];
}

export function personIdentityStatement(name: string, role: string): string {
  const article = /^[aeiou]/i.test(role.trim()) ? 'an' : 'a';
  return `${name}, known online as ${PERSON_ALTERNATE_NAME}, is ${article} ${role}.`;
}

const CANONICAL_HOSTNAME = new URL(SITE_URL).hostname
  .toLowerCase()
  .replace(/^www\./, '');

export function isCanonicalSiteIdentityUrl(value: URL): boolean {
  const hostname = value.hostname.toLowerCase().replace(/^www\./, '');
  return hostname === CANONICAL_HOSTNAME;
}

export function publicIdentityProfiles(
  socials: readonly SocialLink[],
): SocialLink[] {
  const seen = new Set<string>();

  return mergeCanonicalIdentityProfiles(socials).flatMap((social) => {
    const platform = social.platform.toLowerCase();
    if (['dev', 'email', 'website'].includes(platform)) return [];

    try {
      const url = new URL(social.url);
      const normalized = url.toString();
      const dedupeKey = normalized.replace(/\/$/, '');
      const valid =
        url.protocol === 'https:' &&
        !url.username &&
        !url.password &&
        !isCanonicalSiteIdentityUrl(url) &&
        !seen.has(dedupeKey);
      if (!valid) return [];

      seen.add(dedupeKey);
      return [{ ...social, url: normalized }];
    } catch {
      return [];
    }
  });
}


export function publicContactChannels(profile: {
  email: string;
  socials: readonly SocialLink[];
}): SocialLink[] {
  const identities = mergeCanonicalIdentityProfiles(profile.socials);
  const byPlatform = new Map(
    identities.map((social) => [social.platform.toLowerCase(), social]),
  );
  const channels: SocialLink[] = [];
  const email = profile.email.trim();

  if (email) {
    channels.push({
      platform: 'email',
      label: 'Email',
      url: `mailto:${email}`,
    });
  }

  for (const platform of ['linkedin', 'github'] as const) {
    const social = byPlatform.get(platform);
    if (social) {
      channels.push({
        ...social,
        label: platform === 'linkedin' ? 'LinkedIn' : 'GitHub',
      });
    }
  }

  return channels;
}
