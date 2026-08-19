'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';

import styles from '@/styles/GithubPage.module.css';

const DeferredGitHubCalendar = dynamic(
  () =>
    import('react-github-calendar').then(
      (module) => module.GitHubCalendar,
    ),
  {
    ssr: false,
    loading: () => (
      <output className={styles.calendarPlaceholder} aria-live="polite">
        Loading contribution activity…
      </output>
    ),
  },
);

type GitHubContributionCalendarProps = Readonly<{
  username: string;
}>;

export default function GitHubContributionCalendar({
  username,
}: GitHubContributionCalendarProps) {
  const boundaryRef = useRef<HTMLElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const boundary = boundaryRef.current;
    if (!boundary) return;

    if (!('IntersectionObserver' in window)) {
      const timer = globalThis.setTimeout(() => setShouldLoad(true), 0);
      return () => globalThis.clearTimeout(timer);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setShouldLoad(true);
        observer.disconnect();
      },
      { rootMargin: '240px 0px' },
    );

    observer.observe(boundary);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={boundaryRef}
      className={styles.calendarBoundary}
      aria-label={`GitHub contribution calendar for @${username}`}
      aria-busy={!shouldLoad}
    >
      {shouldLoad ? (
        <DeferredGitHubCalendar
          username={username}
          errorMessage="Contribution activity is temporarily unavailable."
          showColorLegend={false}
          showMonthLabels={false}
          colorScheme="dark"
          labels={{
            totalCount: '{{count}} contributions in {{year}}',
            legend: { less: 'Less', more: 'More' },
          }}
          theme={{
            dark: ['#161B22', '#0e4429', '#006d32', '#26a641', '#39d353'],
            light: ['#161B22', '#0e4429', '#006d32', '#26a641', '#39d353'],
          }}
          style={{ width: '100%' }}
        />
      ) : (
        <output className={styles.calendarPlaceholder} aria-live="polite">
          Contribution calendar loads when it enters the viewport.
        </output>
      )}
    </section>
  );
}
