import { ImageResponse } from 'next/og';

import SocialCard from '@/components/SocialCard';
import { getProfile, getProjectBySlug } from '@/lib/content';
import { SITE_URL } from '@/lib/site-config';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Project case study';

export default async function ProjectOgImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [project, profile] = await Promise.all([
    getProjectBySlug(slug),
    getProfile(),
  ]);

  if (!project) return new Response(null, { status: 404 });

  const host = SITE_URL.replace(/^https?:\/\//, '');

  return new ImageResponse(
    <SocialCard
      eyebrow="~/projects"
      title={project.title}
      subtitle={project.description}
      owner={profile.name}
      host={host}
      labels={project.tags}
    />,
    { ...size },
  );
}
