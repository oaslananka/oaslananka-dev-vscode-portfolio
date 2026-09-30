# Contributing

## Supported workflow

1. Create a branch from current `main`; do not commit directly to the protected branch.
2. Use the pinned Node.js/npm toolchain declared by `.node-version`, `.nvmrc`, and `package.json`.
3. Install with `nvm install`, `nvm use`, and `npm ci`.
4. Use the isolated Doppler `dev` config for local application/database work. Never point local tests, seeds, migrations, restore drills, or exploratory commands at production.
5. Make the smallest reviewable change and preserve the boundaries in `docs/ARCHITECTURE.md`.
6. Run `npm run verify`. For browser changes also run the relevant Playwright suite; for database changes use disposable PostgreSQL.
7. Open a pull request and allow every required GitHub check to finish. Do not bypass branch protection.

## Pull request evidence

Describe the problem, the smallest chosen change, security/operational impact, tests run, and any residual risk. Database or deployment changes must include rollback steps. User-facing changes should include screenshots or deterministic visual-regression evidence when applicable.

## Dependencies

Renovate owns routine dependency updates. Dependabot owns security updates. Do not force upgrades around failing checks or weaken security policy to make an update pass.

## Security reports

Do not open public issues containing exploit details, credentials, personal data, or production secrets. Follow `SECURITY.md` and use GitHub private vulnerability reporting.

## Production changes

Production configuration is managed through Doppler/Vercel. Repository contributors must not copy production credentials into development, commit environment files, or mutate production databases as part of normal development. Production-affecting changes must pass the protected pull-request path first.

## Releases

Version, tag, changelog, and publication rules are defined in `docs/operations/release-process.md`. Release tags are created only from merged protected `main`.
