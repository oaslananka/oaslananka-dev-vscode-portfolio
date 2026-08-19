import type { Metadata } from 'next';
import { VscBook, VscGlobe } from '@/components/UiIcons';

import ArticleCard from '@/components/ArticleCard';
import ContentDomainGrid from '@/components/ContentDomainGrid';
import JsonLd from '@/components/JsonLd';
import { getProjects, getPublishedPosts } from '@/lib/content';
import { breadcrumbJsonLd, buildPageMetadata } from '@/lib/seo';
import { absoluteUrl } from '@/lib/site-config';
import styles from '@/styles/ArticlesPage.module.css';

export const revalidate = 3600;

export const metadata: Metadata = buildPageMetadata({
  title: 'Edge AI, Embedded Systems & AI Engineering Articles',
  description:
    'Technical articles by Osman Aslan on production edge AI, vision control, cross-language sensor drivers and safe AI-assisted EDA workflows.',
  path: '/articles',
});

export default async function ArticlesPage() {
  const [posts, projects] = await Promise.all([
    getPublishedPosts(),
    getProjects(),
  ]);
  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    '@id': `${absoluteUrl('/articles')}#item-list`,
    name: 'Technical articles',
    itemListElement: posts.map((post, index) => {
      const url = absoluteUrl(`/articles/${post.slug}`);

      return {
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'BlogPosting',
          '@id': `${url}#article`,
          headline: post.title,
          description: post.excerpt,
          url,
        },
      };
    }),
  };

  return (
    <div className={styles.page}>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Articles', path: '/articles' },
        ])}
      />
      <JsonLd data={itemListJsonLd} />
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.headerMain}>
            <div className={styles.iconWrapper}>
              <VscBook className={styles.icon} size={24} />
            </div>

            <div className={styles.headerContent}>
              <div className={styles.headerTop}>
                <h1 className={styles.title}>Technical engineering articles</h1>
                <div className={styles.stats}>
                  <div className={styles.stat}>
                    <VscGlobe size={14} />
                    <span>
                      {posts.length} post{posts.length === 1 ? '' : 's'}
                    </span>
                  </div>
                </div>
              </div>

              <p className={styles.subtitle}>
                Technical notes on AI-assisted EDA, edge computer vision,
                embedded systems, and the validation practices behind reliable
                engineering tools.
              </p>
            </div>
          </div>
        </header>

        <ContentDomainGrid
          projects={projects}
          posts={posts}
          headingId="article-domains-title"
        />

        {posts.length === 0 ? (
          <p className={styles.subtitle}>
            No articles published yet — check back soon.
          </p>
        ) : (
          <div className={styles.articlesList}>
            {posts.map((post, index) => (
              <ArticleCard key={post.id} post={post} index={index + 1} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
