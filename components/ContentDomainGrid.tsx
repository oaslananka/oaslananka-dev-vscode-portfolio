import Link from 'next/link';
import { VscArrowRight, VscBook, VscRepo } from '@/components/UiIcons';

import { resolveContentClusters } from '@/lib/content-relations';
import type { Post, Project } from '@/lib/db/schema';
import styles from '@/styles/ContentDomainGrid.module.css';

type ContentDomainGridProps = Readonly<{
  projects: readonly Project[];
  posts: readonly Post[];
  headingId: string;
}>;

export default function ContentDomainGrid({
  projects,
  posts,
  headingId,
}: ContentDomainGridProps) {
  return (
    <section className={styles.section} aria-labelledby={headingId}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Topical authority</p>
        <h2 id={headingId}>Browse by engineering domain</h2>
        <p>
          Each domain connects implementation case studies with the technical
          notes that explain architecture, constraints and verification.
        </p>
      </header>

      <div className={styles.grid}>
        {resolveContentClusters(projects, posts).map((cluster) => {
          return (
            <article key={cluster.id} id={cluster.id} className={styles.card}>
              <h3>{cluster.title}</h3>
              <p className={styles.description}>{cluster.description}</p>

              {cluster.projects.length > 0 ? (
                <div className={styles.group}>
                  <p className={styles.groupLabel}>
                    <VscRepo aria-hidden="true" />
                    Case studies
                  </p>
                  <ul>
                    {cluster.projects.map((project) => (
                      <li key={project.slug}>
                        <Link href={`/projects/${project.slug}`}>
                          {project.title}
                          <VscArrowRight aria-hidden="true" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {cluster.articles.length > 0 ? (
                <div className={styles.group}>
                  <p className={styles.groupLabel}>
                    <VscBook aria-hidden="true" />
                    Technical notes
                  </p>
                  <ul>
                    {cluster.articles.map((post) => (
                      <li key={post.slug}>
                        <Link href={`/articles/${post.slug}`}>
                          {post.title}
                          <VscArrowRight aria-hidden="true" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
