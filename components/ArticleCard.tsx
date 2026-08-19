import Image from 'next/image';
import Link from 'next/link';
import { VscCalendar, VscTag } from '@/components/UiIcons';

import type { Post } from '@/lib/db/schema';
import styles from '@/styles/ArticleCard.module.css';

interface ArticleCardProps {
  post: Post;
  index: number;
  headingLevel?: 2 | 3;
}

const ArticleCard = ({ post, index, headingLevel = 2 }: ArticleCardProps) => {
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  const date = new Date(post.publishedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <Link href={`/articles/${post.slug}`} className={styles.card}>
      <div className={styles.number}>{String(index).padStart(2, '0')}</div>

      {post.coverImage && (
        <div className={styles.imageWrapper}>
          <Image
            src={post.coverImage}
            alt={post.title}
            fill
            sizes="(max-width: 768px) 100vw, 200px"
            className={styles.image}
          />
        </div>
      )}

      <div className={styles.content}>
        <div className={styles.main}>
          <Heading className={styles.title}>{post.title}</Heading>
          <p className={styles.description}>{post.excerpt}</p>
        </div>

        <div className={styles.footer}>
          <div className={styles.stats}>
            <div className={styles.stat}>
              <VscCalendar size={13} />
              <span>{date}</span>
            </div>
            {post.tags.slice(0, 2).map((tag) => (
              <div key={tag} className={styles.stat}>
                <VscTag size={13} />
                <span>{tag}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Link>
  );
};

export default ArticleCard;
