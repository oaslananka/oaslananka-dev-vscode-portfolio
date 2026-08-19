import { ImageResponse } from 'next/og';

import SocialCard from '@/components/SocialCard';
import { getPostBySlug, getProfile } from '@/lib/content';
import { SITE_URL } from '@/lib/site-config';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Article';

export default async function ArticleOgImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [post, profile] = await Promise.all([
    getPostBySlug(slug),
    getProfile(),
  ]);

  if (!post) return new Response(null, { status: 404 });

  const host = SITE_URL.replace(/^https?:\/\//, '');

  return new ImageResponse(
    <SocialCard
      eyebrow="~/articles"
      title={post.title}
      subtitle={post.excerpt}
      owner={profile.name}
      host={host}
      labels={post.tags}
    />,
    { ...size },
  );
}
