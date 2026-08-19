import type { Profile } from '@/lib/db/schema';
import { isSafeHttpsUrl } from '@/lib/url-policy';

export interface SiteShellSkill {
  category: string;
  items: string[];
}

export interface SiteShellSocial {
  platform: string;
  label: string;
}

export interface SiteShellData {
  name: string;
  tagline: string;
  bioIntroduction: string;
  skills: SiteShellSkill[];
  socials: SiteShellSocial[];
  githubUrl: string;
}

export function buildSiteShellData(profile: Profile): SiteShellData {
  const githubUrl =
    profile.socials.find(
      (social) =>
        social.platform.toLowerCase() === 'github' &&
        isSafeHttpsUrl(social.url),
    )?.url ?? 'https://github.com';

  return {
    name: profile.name,
    tagline: profile.tagline,
    bioIntroduction: profile.bio[0] ?? '',
    skills: profile.skills.map(({ category, items }) => ({
      category,
      items: [...items],
    })),
    socials: profile.socials.map(({ platform, label }) => ({ platform, label })),
    githubUrl,
  };
}
