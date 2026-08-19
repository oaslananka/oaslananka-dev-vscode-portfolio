import type { Repo, User } from '../types';

const GITHUB_API_ROOT = 'https://api.github.com';
const REPOSITORIES_PER_PAGE = 100;
const MAX_REPOSITORY_PAGES = 20;

interface GitHubFetchInit extends RequestInit {
  next?: { revalidate: number };
}

type GitHubFetch = (
  input: string | URL | Request,
  init?: GitHubFetchInit,
) => Promise<Response>;

export interface GitHubData {
  user: User;
  repos: Repo[];
}

export interface GitHubRepositorySummary {
  totalStars: number;
  totalForks: number;
}

export interface GitHubFetchOptions {
  token?: string;
  fetchImpl?: GitHubFetch;
  revalidate?: number;
}

export interface GitHubFixtureEnvironment {
  CI?: string;
  E2E_GITHUB_FIXTURE?: string;
  VERCEL_ENV?: string;
}

export interface GitHubPageDataOptions extends GitHubFetchOptions {
  env?: GitHubFixtureEnvironment;
}

function repositoryPageUrl(username: string, page: number): string {
  const encodedUsername = encodeURIComponent(username);
  return `${GITHUB_API_ROOT}/users/${encodedUsername}/repos?per_page=${REPOSITORIES_PER_PAGE}&page=${page}`;
}

function pushedTimestamp(repository: Repo): number {
  const timestamp = Date.parse(repository.pushed_at ?? '');
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function summarizeGitHubRepositories(
  repositories: Repo[],
): GitHubRepositorySummary {
  return repositories.reduce<GitHubRepositorySummary>(
    (summary, repository) => ({
      totalStars: summary.totalStars + repository.stargazers_count,
      totalForks: summary.totalForks + repository.forks,
    }),
    { totalStars: 0, totalForks: 0 },
  );
}

/**
 * Rank active repositories by stars, forks, last push, then name. The final
 * name tie-break keeps output stable when every popularity signal is equal.
 */
export function selectPopularGitHubRepositories(
  repositories: Repo[],
  limit = 6,
): Repo[] {
  return repositories
    .filter((repository) => !repository.archived && !repository.disabled)
    .sort((left, right) => {
      const starDifference = right.stargazers_count - left.stargazers_count;
      if (starDifference !== 0) return starDifference;

      const forkDifference = right.forks - left.forks;
      if (forkDifference !== 0) return forkDifference;

      const pushDifference = pushedTimestamp(right) - pushedTimestamp(left);
      if (pushDifference !== 0) return pushDifference;

      const naturalNameDifference = left.name.localeCompare(right.name, 'en', {
        numeric: true,
        sensitivity: 'base',
      });
      if (naturalNameDifference !== 0) return naturalNameDifference;

      return left.name.localeCompare(right.name, 'en', { numeric: true });
    })
    .slice(0, Math.max(0, limit));
}

function githubE2EFixture(username: string): GitHubData {
  const profileUrl = `https://github.com/${username}`;
  const repository = (id: number, name: string, stars: number, forks: number): Repo => ({
    id,
    name,
    description: `Deterministic E2E fixture repository ${id}`,
    language: 'TypeScript',
    watchers: stars,
    forks,
    stargazers_count: stars,
    html_url: `${profileUrl}/${name}`,
    homepage: '',
    archived: false,
    disabled: false,
    pushed_at: `2026-07-${20 + id}T12:00:00.000Z`,
  });
  const repos = [
    repository(1, 'fixture-edge-platform', 12, 3),
    repository(2, 'fixture-observability-kit', 8, 2),
  ];

  return {
    user: {
      login: username,
      name: 'E2E GitHub Fixture',
      avatar_url: '/themes/github-dark.png',
      html_url: profileUrl,
      bio: 'Synthetic GitHub data used only by deterministic CI browser tests.',
      public_repos: repos.length,
      followers: 7,
      following: 3,
    },
    repos,
  };
}

export function shouldUseGitHubE2EFixture(
  env: GitHubFixtureEnvironment = process.env as GitHubFixtureEnvironment,
): boolean {
  return (
    env.CI === 'true' &&
    env.E2E_GITHUB_FIXTURE?.trim().toLowerCase() === 'true' &&
    env.VERCEL_ENV !== 'production'
  );
}

export async function loadGitHubPageData(
  username: string,
  options: GitHubPageDataOptions = {},
): Promise<GitHubData | null> {
  const {
    env = process.env as GitHubFixtureEnvironment,
    ...fetchOptions
  } = options;
  if (shouldUseGitHubE2EFixture(env)) {
    return githubE2EFixture(username);
  }
  return fetchGitHubData(username, fetchOptions);
}

export async function fetchGitHubData(
  username: string,
  options: GitHubFetchOptions = {},
): Promise<GitHubData | null> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const revalidate = options.revalidate ?? 600;
  const encodedUsername = encodeURIComponent(username);
  const headers: HeadersInit = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'oaslananka.dev',
    ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
  };
  const requestInit: GitHubFetchInit = {
    headers,
    next: { revalidate },
  };

  try {
    const [userResponse, firstPageResponse] = await Promise.all([
      fetchImpl(`${GITHUB_API_ROOT}/users/${encodedUsername}`, requestInit),
      fetchImpl(repositoryPageUrl(username, 1), requestInit),
    ]);

    if (!userResponse.ok || !firstPageResponse.ok) return null;

    const user = (await userResponse.json()) as User;
    const firstPage = (await firstPageResponse.json()) as unknown;
    if (!Number.isFinite(user.public_repos) || !Array.isArray(firstPage)) {
      return null;
    }

    const pageCount = Math.max(
      1,
      Math.ceil(user.public_repos / REPOSITORIES_PER_PAGE),
    );
    if (pageCount > MAX_REPOSITORY_PAGES) return null;

    const remainingResponses = await Promise.all(
      Array.from({ length: pageCount - 1 }, (_, index) =>
        fetchImpl(repositoryPageUrl(username, index + 2), requestInit),
      ),
    );

    if (remainingResponses.some((response) => !response.ok)) return null;

    const remainingPages = await Promise.all(
      remainingResponses.map((response) => response.json()),
    );
    if (remainingPages.some((page) => !Array.isArray(page))) return null;

    const repositoriesById = new Map<number, Repo>();
    for (const repository of [
      ...(firstPage as Repo[]),
      ...(remainingPages.flat() as Repo[]),
    ]) {
      repositoriesById.set(repository.id, repository);
    }

    return { user, repos: [...repositoriesById.values()] };
  } catch (error) {
    console.error('[github] fetch failed:', error);
    return null;
  }
}
