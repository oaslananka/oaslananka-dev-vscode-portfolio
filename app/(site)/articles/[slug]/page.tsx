import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { VscArrowLeft, VscCalendar, VscEdit, VscPerson } from '@/components/UiIcons';

import ArticleCard from '@/components/ArticleCard';
import JsonLd from '@/components/JsonLd';
import MarkdownContent from '@/components/MarkdownContent';
import ProjectCard from '@/components/ProjectCard';
import {
  getProfile,
  getProjects,
  getPublishedPosts,
  getPostBySlug,
} from '@/lib/content';
import {
  relatedPostsForPost,
  relatedProjectsForPost,
} from '@/lib/content-relations';
import {
  articleJsonLd,
  breadcrumbJsonLd,
  buildPageMetadata,
} from '@/lib/seo';
import styles from '@/styles/ArticlePage.module.css';

export const revalidate = 3600;

export async function generateStaticParams() {
  const posts = await getPublishedPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  return buildPageMetadata({
    title: post.title,
    description: post.excerpt,
    path: `/articles/${slug}`,
    useFileConventionImage: true,
    type: 'article',
    publishedTime: new Date(post.publishedAt).toISOString(),
    modifiedTime: new Date(post.updatedAt).toISOString(),
    tags: post.tags,
  });
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  const [profile, projects, posts] = await Promise.all([
    getProfile(),
    getProjects(),
    getPublishedPosts(),
  ]);
  const relatedProjects = relatedProjectsForPost(post, projects, 3);
  const relatedPosts = relatedPostsForPost(post, posts, 2);

  const date = new Date(post.publishedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const updatedDate = new Date(post.updatedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const wasUpdated =
    new Date(post.updatedAt).getTime() - new Date(post.publishedAt).getTime() >
    24 * 60 * 60 * 1000;

  return (
    <div className={styles.page}>
      <JsonLd data={articleJsonLd(post, profile)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Articles', path: '/articles' },
          { name: post.title, path: `/articles/${slug}` },
        ])}
      />
      <article className={styles.container}>
        <Link href="/articles" className={styles.back}>
          <VscArrowLeft size={16} />
          <span>All articles</span>
        </Link>

        <header className={styles.header}>
          <h1 className={styles.title}>{post.title}</h1>
          <p className={styles.excerpt}>{post.excerpt}</p>
          <div className={styles.meta}>
            <span className={styles.metaItem}>
              <VscCalendar size={14} aria-hidden="true" />
              Published {date}
            </span>
            {wasUpdated ? (
              <span className={styles.metaItem}>
                <VscEdit size={14} aria-hidden="true" />
                Updated {updatedDate}
              </span>
            ) : null}
            <Link href="/about" className={styles.author}>
              <VscPerson size={14} aria-hidden="true" />
              {profile.name}, {profile.role}
            </Link>
          </div>
          <div className={styles.tags} aria-label="Article topics">
            {post.tags.map((tag) => (
              <span key={tag} className={styles.tag}>
                {tag}
              </span>
            ))}
          </div>
        </header>

        <div className={styles.prose}>
          <MarkdownContent>{post.body}</MarkdownContent>
        </div>

        {relatedProjects.length > 0 ? (
          <section className={styles.related} aria-labelledby="article-projects-title">
            <header className={styles.relatedHeader}>
              <p className={styles.relatedEyebrow}>Evidence in practice</p>
              <h2 id="article-projects-title" className={styles.relatedTitle}>
                Related engineering projects
              </h2>
              <p className={styles.relatedCopy}>
                Open implementations and case studies that apply the principles
                described in this article.
              </p>
            </header>
            <div className={styles.projectGrid}>
              {relatedProjects.map((project, index) => (
                <ProjectCard
                  key={project.slug}
                  project={project}
                  index={index + 1}
                  headingLevel={3}
                />
              ))}
            </div>
          </section>
        ) : null}

        {relatedPosts.length > 0 ? (
          <section className={styles.related} aria-labelledby="article-related-title">
            <header className={styles.relatedHeader}>
              <p className={styles.relatedEyebrow}>Continue reading</p>
              <h2 id="article-related-title" className={styles.relatedTitle}>
                Related technical notes
              </h2>
            </header>
            <div className={styles.articleList}>
              {relatedPosts.map((relatedPost, index) => (
                <ArticleCard
                  key={relatedPost.slug}
                  post={relatedPost}
                  index={index + 1}
                  headingLevel={3}
                />
              ))}
            </div>
          </section>
        ) : null}
      </article>
    </div>
  );
}
