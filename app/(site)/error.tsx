'use client';

import { useEffect } from 'react';

import styles from '@/styles/StatePage.module.css';

export default function SiteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;

    void import('@sentry/nextjs').then((Sentry) => {
      Sentry.captureException(error);
    });
  }, [error]);

  return (
    <div className={styles.wrap}>
      <div className={styles.code}>500</div>
      <h1 className={styles.title}>Something went wrong</h1>
      <p className={styles.text}>
        An unexpected error occurred while loading this page.
      </p>
      <div className={styles.actions}>
        <button
          onClick={() => reset()}
          className={`${styles.button} ${styles.buttonPrimary}`}
        >
          Try again
        </button>
      </div>
    </div>
  );
}
