import assert from 'node:assert/strict';
import test from 'node:test';

import {
  fetchGitHubData,
  selectPopularGitHubRepositories,
  summarizeGitHubRepositories,
} from '../lib/github';
import type { Repo, User } from '../types';

function repository(
  id: number,
  overrides: Partial<Repo> = {},
): Repo {
  return {
    id,
    name: `repo-${id}`,
    description: `Repository ${id}`,
    language: 'TypeScript',
    watchers: 0,
    forks: 0,
    stargazers_count: 0,
    html_url: `https://github.com/example/repo-${id}`,
    homepage: '',
    archived: false,
    disabled: false,
    pushed_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  } as Repo;
}

function user(publicRepos: number): User {
  return {
    login: 'example',
    name: 'Example Engineer',
    avatar_url: 'https://avatars.githubusercontent.com/u/1?v=4',
    html_url: 'https://github.com/example',
    bio: '',
    public_repos: publicRepos,
    followers: 0,
    following: 0,
  };
}

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

test('repository totals include every public repository', () => {
  const summary = summarizeGitHubRepositories([
    repository(1, { stargazers_count: 10, forks: 2 }),
    repository(2, { stargazers_count: 5, forks: 7 }),
    repository(3, { stargazers_count: 0, forks: 1, archived: true }),
  ]);

  assert.deepEqual(summary, { totalStars: 15, totalForks: 10 });
});

test('popular repositories use deterministic popularity ordering', () => {
  const selected = selectPopularGitHubRepositories(
    [
      repository(1, {
        name: 'lower-forks',
        stargazers_count: 5,
        forks: 1,
        pushed_at: '2026-06-01T00:00:00.000Z',
      }),
      repository(2, {
        name: 'older',
        stargazers_count: 5,
        forks: 2,
        pushed_at: '2026-05-01T00:00:00.000Z',
      }),
      repository(3, {
        name: 'Zulu',
        stargazers_count: 5,
        forks: 2,
        pushed_at: '2026-06-01T00:00:00.000Z',
      }),
      repository(4, {
        name: 'alpha',
        stargazers_count: 5,
        forks: 2,
        pushed_at: '2026-06-01T00:00:00.000Z',
      }),
      repository(5, { stargazers_count: 100, archived: true }),
      repository(6, { stargazers_count: 90, disabled: true }),
    ],
    4,
  );

  assert.deepEqual(
    selected.map((repo) => repo.name),
    ['alpha', 'Zulu', 'older', 'lower-forks'],
  );
});

test('GitHub requests identify the application explicitly', async () => {
  const observedUserAgents: string[] = [];

  const fetchImpl = async (
    input: string | URL | Request,
    init?: RequestInit,
  ): Promise<Response> => {
    observedUserAgents.push(new Headers(init?.headers).get('User-Agent') ?? '');
    const url = String(input);
    if (url.endsWith('/users/example')) return jsonResponse(user(1));
    return jsonResponse([repository(1)]);
  };

  const data = await fetchGitHubData('example', { fetchImpl });

  assert.equal(data?.repos.length, 1);
  assert.deepEqual(observedUserAgents, ['oaslananka.dev', 'oaslananka.dev']);
});

test('GitHub retrieval fails closed before unbounded repository pagination', async () => {
  const calls: string[] = [];

  const fetchImpl = async (input: string | URL | Request): Promise<Response> => {
    const url = String(input);
    calls.push(url);
    if (url.endsWith('/users/example')) return jsonResponse(user(2_001));
    return jsonResponse(Array.from({ length: 100 }, (_, index) => repository(index + 1)));
  };

  assert.equal(await fetchGitHubData('example', { fetchImpl }), null);
  assert.equal(calls.length, 2);
});

test('GitHub retrieval paginates all public repositories and deduplicates IDs', async () => {
  const firstPage = Array.from({ length: 100 }, (_, index) => repository(index + 1));
  const secondPage = [repository(100), repository(101)];
  const calls: string[] = [];

  const fetchImpl = async (input: string | URL | Request): Promise<Response> => {
    const url = String(input);
    calls.push(url);

    if (url.endsWith('/users/example')) return jsonResponse(user(101));
    const page = new URL(url).searchParams.get('page');
    if (page === '1') return jsonResponse(firstPage);
    if (page === '2') return jsonResponse(secondPage);
    return jsonResponse({ message: 'Not found' }, 404);
  };

  const data = await fetchGitHubData('example', { fetchImpl });

  assert.equal(data?.repos.length, 101);
  assert.equal(calls.some((url) => url.includes('page=2')), true);
  assert.equal(new Set(data?.repos.map((repo) => repo.id)).size, 101);
});

test('GitHub retrieval rejects partial repository data', async () => {
  const firstPage = Array.from({ length: 100 }, (_, index) => repository(index + 1));

  const fetchImpl = async (input: string | URL | Request): Promise<Response> => {
    const url = String(input);
    if (url.endsWith('/users/example')) return jsonResponse(user(101));
    const page = new URL(url).searchParams.get('page');
    if (page === '1') return jsonResponse(firstPage);
    return jsonResponse({ message: 'Rate limited' }, 403);
  };

  assert.equal(await fetchGitHubData('example', { fetchImpl }), null);
});

test('bundled GitHub fixture is limited to explicit non-production CI runs', async () => {
  const { shouldUseGitHubE2EFixture } = await import('../lib/github');

  assert.equal(shouldUseGitHubE2EFixture({}), false);
  assert.equal(
    shouldUseGitHubE2EFixture({ CI: 'true', E2E_GITHUB_FIXTURE: 'true' }),
    true,
  );
  assert.equal(
    shouldUseGitHubE2EFixture({ CI: 'false', E2E_GITHUB_FIXTURE: 'true' }),
    false,
  );
  assert.equal(
    shouldUseGitHubE2EFixture({
      CI: 'true',
      E2E_GITHUB_FIXTURE: 'true',
      VERCEL_ENV: 'production',
    }),
    false,
  );
});

test('GitHub page fixture avoids external requests and remains structurally valid', async () => {
  const { loadGitHubPageData } = await import('../lib/github');
  let requests = 0;

  const data = await loadGitHubPageData('fixture-user', {
    env: { CI: 'true', E2E_GITHUB_FIXTURE: 'true' },
    fetchImpl: async () => {
      requests += 1;
      throw new Error('fixture mode must not call GitHub');
    },
  });

  assert.equal(requests, 0);
  assert.equal(data?.user.login, 'fixture-user');
  assert.equal(data?.user.public_repos, data?.repos.length);
  assert.ok((data?.repos.length ?? 0) >= 2);
  assert.ok(data?.repos.every((repo) => repo.html_url.startsWith('https://github.com/')));
});

test('production ignores the E2E GitHub fixture flag', async () => {
  const { loadGitHubPageData } = await import('../lib/github');
  let requests = 0;

  const data = await loadGitHubPageData('example', {
    env: {
      CI: 'true',
      E2E_GITHUB_FIXTURE: 'true',
      VERCEL_ENV: 'production',
    },
    fetchImpl: async () => {
      requests += 1;
      return jsonResponse({ message: 'offline' }, 503);
    },
  });

  assert.equal(data, null);
  assert.equal(requests, 2);
});
