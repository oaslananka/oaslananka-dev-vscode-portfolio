import { ImageResponse } from 'next/og';

import SocialCard from '@/components/SocialCard';
import { getProfile, getSettings } from '@/lib/content';
import { SITE_URL } from '@/lib/site-config';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Portfolio';

export default async function OpengraphImage() {
  const [profile, settings] = await Promise.all([getProfile(), getSettings()]);
  const heading = settings.ogHeading || profile.name;
  const host = SITE_URL.replace(/^https?:\/\//, '');

  return new ImageResponse(
    <SocialCard
      eyebrow={`~/${profile.role.toLowerCase().replace(/\s+/g, '-')}`}
      title={heading}
      subtitle={profile.tagline}
      owner={profile.name}
      host={host}
    />,
    { ...size }
  );
}
