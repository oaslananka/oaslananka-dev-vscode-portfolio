import type { Metadata } from 'next';
import Link from 'next/link';

import { buildNotFoundMetadata } from '@/lib/seo';
import styles from '@/styles/StatePage.module.css';

export const metadata: Metadata = buildNotFoundMetadata();

export default function NotFound() {
  return (
    <div className={styles.wrap}>
      <div className={styles.code}>404</div>
      <h1 className={styles.title}>Page not found</h1>
      <p className={styles.text}>
        The file you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <div className={styles.actions}>
        <Link href="/" className={`${styles.button} ${styles.buttonPrimary}`}>
          Go home
        </Link>
        <Link href="/projects" className={styles.button}>
          View projects
        </Link>
      </div>
    </div>
  );
}
