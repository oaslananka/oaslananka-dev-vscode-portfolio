// Content types (Profile, Project, Post) live in lib/db/schema.ts.
// These remaining types describe the live GitHub API responses used by the
// /github page.

export interface Repo {
  id: number;
  name: string;
  description: string;
  language: string;
  watchers: number;
  forks: number;
  stargazers_count: number;
  html_url: string;
  homepage: string;
  archived: boolean;
  disabled: boolean;
  pushed_at: string | null;
}

export interface User {
  login: string;
  name: string;
  avatar_url: string;
  html_url: string;
  bio: string;
  public_repos: number;
  followers: number;
  following: number;
}
