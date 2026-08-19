import type { Metadata } from 'next';
import Link from 'next/link';

import JsonLd from '@/components/JsonLd';
import { GLOSSARY_GROUPS } from '@/lib/glossary';
import { breadcrumbJsonLd, buildPageMetadata } from '@/lib/seo';
import styles from '@/styles/GlossaryPage.module.css';

export const metadata: Metadata = buildPageMetadata({
  title: 'Engineering glossary',
  description:
    'Definitions for edge AI, embedded systems, IoT, MCP, EDA, validation, and control terminology used across the portfolio.',
  path: '/glossary',
});



export default function GlossaryPage() {
  return (
    <div className={styles.page}>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Glossary', path: '/glossary' },
        ])}
      />
      <div className={styles.container}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>Terminology</p>
          <h1>Engineering glossary</h1>
          <p>
            Definitions for recurring concepts in the projects, articles, and
            engineering boundaries documented on this site.
          </p>
        </header>

        <div className={styles.groups}>
          {GLOSSARY_GROUPS.map((group) => (
            <section key={group.title} className={styles.group}>
              <h2>{group.title}</h2>
              <dl>{group.terms.map(({ term, definition }) => (
                <div key={term} className={styles.term}>
                  <dt>{term}</dt>
                  <dd>{definition}</dd>
                </div>
              ))}</dl>
            </section>
          ))}
        </div>

        <footer className={styles.footer}>
          <Link href="/projects">Explore the projects →</Link>
          <Link href="/articles">Read the technical articles →</Link>
        </footer>
      </div>
    </div>
  );
}
