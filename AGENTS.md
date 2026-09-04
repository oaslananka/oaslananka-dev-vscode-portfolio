# AGENTS.md — oaslananka.dev

These instructions apply to the complete repository and public portfolio.

Architecture, trust boundaries, and executable enforcement are documented in [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md).

## Installation

Use the pinned JavaScript toolchain and the lockfile-only installation path:

```bash
nvm install
nvm use
npm ci
python -m pip install --requirement requirements-security.txt
```

## Configuration

Runtime secrets are managed through Doppler. Never create or commit production environment files.

```bash
doppler setup --project oaslananka-dev-vscode-portfolio --config dev
doppler secrets --only-names
doppler run --config dev -- npm run db:migrate
doppler run --config dev -- npm run db:preflight
```

Local development requires the isolated `dev` config. If Doppler only offers `prod`, do not use production services for local work; provision/populate `dev` first. Always pass `--config` explicitly instead of relying on directory-scoped Doppler state.

Production content is database-backed and fails closed. Never enable bundled default content in production. Apply migrations only with an explicitly selected Doppler configuration.

## Usage

Run the development site and inspect the main public surfaces:

```bash
doppler run --config dev -- npm run dev
curl --fail http://localhost:3000/llms.txt
curl --fail http://localhost:3000/sitemap.md
curl --fail --header 'Accept: text/markdown' http://localhost:3000/
```

Content is managed through `/admin`; public pages must not expose admin, message, credential, or rate-limit data.

## Verification

Before proposing a change, run the checks that match the modified surface:

```bash
npm run verify
pre-commit run --all-files
npm run build
```

Database and browser tests use disposable PostgreSQL only. Do not point tests, seeds, restore drills, or exploratory commands at production.

## Safety boundaries

- Do not commit secrets, generated credentials, database dumps, or local environment files.
- Preserve canonical URLs, noindex preview behavior, robots separation, and Markdown/HTML content parity.
- Keep GitHub Actions pinned to immutable commit SHAs.
- Do not force dependency upgrades or bypass branch protection to merge failing changes.
- Treat ERC, DRC, simulation, and estimation outputs as evidence for human review, not autonomous engineering sign-off.
