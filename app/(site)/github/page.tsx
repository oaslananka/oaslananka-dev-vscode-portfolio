import type { Metadata } from 'next';
import Image from 'next/image';
import {
  VscRepo,
  VscPerson,
  VscStarEmpty,
  VscRepoForked,
  VscLinkExternal,
  VscGithub,
  VscWarning,
} from '@/components/UiIcons';

import GitHubContributionCalendar from '@/components/GitHubContributionCalendar';
import JsonLd from '@/components/JsonLd';
import RepoCard from '@/components/RepoCard';
import {
  loadGitHubPageData,
  selectPopularGitHubRepositories,
  summarizeGitHubRepositories,
} from '@/lib/github';
import { breadcrumbJsonLd, buildPageMetadata } from '@/lib/seo';
import { GITHUB_USERNAME } from '@/lib/site-config';
import styles from '@/styles/GithubPage.module.css';

export const metadata: Metadata = buildPageMetadata({
  title: 'GitHub',
  description: `Open-source work and contribution activity of @${GITHUB_USERNAME} on GitHub.`,
  path: '/github',
});

export const revalidate = 600;

export default async function GithubPage() {
  const data = await loadGitHubPageData(GITHUB_USERNAME, {
    token: process.env.GITHUB_TOKEN,
    revalidate,
  });

  if (!data) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.errorState}>
            <VscWarning size={28} />
            <h1 className={styles.name}>GitHub data unavailable</h1>
            <p>
              Could not load GitHub activity right now. Visit{' '}
              <a
                href={`https://github.com/${GITHUB_USERNAME}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                github.com/{GITHUB_USERNAME}
              </a>{' '}
              directly.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const { user, repos } = data;
  const { totalStars, totalForks } = summarizeGitHubRepositories(repos);
  const popularRepositories = selectPopularGitHubRepositories(repos);

  return (
    <div className={styles.page}>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'GitHub', path: '/github' },
        ])}
      />
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.profile}>
            <Image
              src={user.avatar_url}
              className={styles.avatar}
              alt={user.login}
              width={80}
              height={80}
              priority
            />
            <div className={styles.profileInfo}>
              <h1 className={styles.name}>{user.name || user.login}</h1>
              <span className={styles.handle}>@{user.login}</span>
            </div>
          </div>

          <a
            href={user.html_url || `https://github.com/${user.login}`}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.profileLink}
          >
            <VscGithub size={18} />
            <span>View Profile</span>
            <VscLinkExternal size={14} />
          </a>
        </header>

        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <VscRepo size={20} />
            </div>
            <div className={styles.statInfo}>
              <span className={styles.statValue}>{user.public_repos}</span>
              <span className={styles.statLabel}>Repositories</span>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <VscPerson size={20} />
            </div>
            <div className={styles.statInfo}>
              <span className={styles.statValue}>{user.followers}</span>
              <span className={styles.statLabel}>Followers</span>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <VscStarEmpty size={20} />
            </div>
            <div className={styles.statInfo}>
              <span className={styles.statValue}>{totalStars}</span>
              <span className={styles.statLabel}>Total Stars</span>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <VscRepoForked size={20} />
            </div>
            <div className={styles.statInfo}>
              <span className={styles.statValue}>{totalForks}</span>
              <span className={styles.statLabel}>Total Forks</span>
            </div>
          </div>
        </div>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Contribution Activity</h2>
          <div className={styles.contributions}>
            <GitHubContributionCalendar username={GITHUB_USERNAME} />
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Popular Repositories</h2>
            <a
              href={`https://github.com/${user.login}?tab=repositories`}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.viewAll}
            >
              View All
              <VscLinkExternal size={14} />
            </a>
          </div>

          <div className={styles.reposGrid}>
            {popularRepositories.map((repo) => (
              <RepoCard key={repo.id} repo={repo} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
