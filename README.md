# VS Code Portfolio

A Visual Studio Code themed developer portfolio with a **live admin panel**, built with Next.js 16, React 19 and a Neon Postgres database. Deploys on Vercel.

## Features

- 🎨 **VS Code UI** — title bar, activity bar, file explorer, tabs, an interactive terminal, a command palette (`Ctrl/Cmd+Shift+P`) and keyboard shortcuts, with 6 editor themes.
- 🛠️ **Dynamic admin panel** (`/admin`) — edit your profile, projects, blog posts and SEO settings live. Changes appear on the site immediately (no redeploy) thanks to on-demand revalidation.
- 🗄️ **Database-backed content** — Neon Postgres via Drizzle ORM. Production fails closed when content storage is unavailable; bundled defaults require an explicit local/test opt-in.
- 📝 **Built-in blog** — write posts in Markdown with a live preview, rendered server-side for SEO.
- 🔍 **Best-in-class SEO** — server-rendered content, per-page metadata, dynamic `sitemap.xml`, `robots.txt`, JSON-LD (Person, WebSite, BreadcrumbList, BlogPosting), dynamic OpenGraph images, a web manifest and dynamic icons.
- 🤖 **AI discovery** — Markdown negotiation, `/index.md`, `/sitemap.md`, `/llms.txt`, `/llms-full.txt`, `/AGENTS.md` and a public glossary for agents and crawlers.
- 📊 **Analytics** — Google Analytics 4, Vercel Analytics and Speed Insights.
- 🐛 **Error monitoring** — consent-safe Sentry error reporting for client, server and edge runtimes.
- 🔒 **Simple, secure admin auth** — single password gate (bcrypt + signed JWT cookie), enforced by proxy/middleware.

## Tech stack

Next.js 16 (App Router) · React 19 · TypeScript · Drizzle ORM · Neon Postgres · Sentry · CSS Modules.

## Getting started

### 1. Install

Use Node.js `22.23.1` and npm `10.9.8` as declared in `package.json`, `.nvmrc`, and `.node-version`.

```bash
nvm use
npm ci
```

### 2. Configure Doppler

Runtime secrets are managed in Doppler. Do not create `.env.local` or commit secret values.

```bash
doppler login
doppler setup --project oaslananka-dev-vscode-portfolio --config dev
doppler secrets --only-names
```

The required application variables are:

- **`DATABASE_URL`** — pooled Neon connection string used by the application.
- **`DATABASE_URL_UNPOOLED`** — direct Neon connection string used by Drizzle migrations.
- **`ADMIN_PASSWORD_HASH`** — bcrypt hash for the admin password.
- **`AUTH_SECRET`** — random secret used to sign admin sessions.
- **`RATE_LIMIT_HMAC_SECRET`** — a separate random secret used to pseudonymize abuse-prevention identities.
- **`CRON_SECRET`** — bearer secret protecting retention cleanup and contact-notification redrive endpoints.
- **`NEXT_PUBLIC_SITE_URL`** — production URL.
- **`NEXT_PUBLIC_GITHUB_USERNAME`** — GitHub handle.

Optional variables include `ALLOW_DEFAULT_CONTENT` (local/test only), `INDEXNOW_DISABLED`, `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_GTM_ID`, `NEXT_PUBLIC_META_PIXEL_ID`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`, `GITHUB_TOKEN`, `RESEND_API_KEY` and `CONTACT_FROM_EMAIL`. `CRON_SECRET` is required on Vercel so the scheduled retention cleanup and durable contact-notification redrive jobs in `vercel.json` can run.

### 3. Set up the database

Use a disposable development database for local work. Review every database operation and select the Doppler config explicitly before running it.

```bash
doppler run --config dev -- npm run db:migrate
doppler run --config dev -- npm run db:preflight
doppler run --config dev -- npm run db:seed
```

`db:seed` is idempotent for existing top-level content, but it should not be part of routine local development.

Validate the recovery machinery with disposable local PostgreSQL, then run the read-only Neon drill:

```bash
npm run test:restore-drill
doppler run -- npm run db:restore-drill
```

See the [Neon recovery runbook](./docs/operations/neon-recovery.md) before running or responding to a database incident.

### 4. Run

```bash
doppler run --config dev -- npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Then go to [http://localhost:3000/admin](http://localhost:3000/admin) and fill in your real content.

## Managing content

Everything is edited from **`/admin`**:

- **Profile** — name, role, bio, skills, experience, socials. Powers the home, about and contact pages.
- **Projects** — your work, with tags and featured flags.
- **Blog posts** — Markdown posts with cover images and tags.
- **Settings** — site title, description, keywords and default theme.

Remote content images must be local `/public` paths or use a hostname listed in `lib/image-policy.ts`. Add new trusted image hosts there before saving them through the admin panel.

## Deploying to Vercel

1. Push the repository to GitHub and import it into Vercel.
2. In Doppler, create a Vercel Config Sync from config `prod` to the Vercel **Production** environment.
3. Sync a separate `preview` config to Vercel **Preview**. Keep its database, auth and external-service credentials isolated from production.
4. Use **Sensitive** as the Vercel environment-variable type and never set `ALLOW_DEFAULT_CONTENT=true` in Production.
5. Manage values in Doppler only; do not edit synchronized variables manually in Vercel.
6. Apply migrations and run the read-only database preflight before redeploying production.
7. Redeploy production after a secret changes so the new deployment receives the updated environment snapshot.

```bash
doppler run --project oaslananka-dev-vscode-portfolio --config prod -- npm run db:migrate
doppler run --project oaslananka-dev-vscode-portfolio --config prod -- npm run db:preflight
```

The preflight distinguishes missing configuration, connectivity, schema, migration, and canonical-content failures without printing database credentials or authored content. `npm run build` runs it automatically for production deployments. Vercel Preview builds skip production migration-parity enforcement; pull-request CI still migrates a disposable PostgreSQL database, runs the read-only preflight, and exercises the full browser suite. If production preflight reports missing migrations, run `db:migrate`; if it reports `profile(id=1)` or `site_settings(id=1)`, restore or create those canonical records before deploying.

Vercel invokes `/api/cron/retention` and `/api/cron/contact-notifications` once per day using `CRON_SECRET`. On a different host, schedule the same paths and send `Authorization: Bearer <CRON_SECRET>`. The notification endpoint may run more frequently when the hosting plan permits it; database timestamps and leases enforce retry eligibility and concurrency safety.

Contact messages are always stored before optional email delivery. Delivery state, bounded backoff, terminal failures, and manual redrive are documented in the [contact notification runbook](./docs/operations/contact-notification-delivery.md).

Maintain separate `dev`, `preview` and `prod` Doppler configs. Database migrations and seeds must always name the intended config; local commands must not use production services.

Deployment classification and fail-closed behavior are defined in the [deployment environment policy](./docs/operations/deployment-environments.md). Vercel previews remain `noindex`, never use bundled fallback content, and never submit IndexNow notifications.

Agent-facing Markdown endpoints, content negotiation, and privacy boundaries are defined in [agent discovery and Markdown interoperability](./docs/operations/agent-discovery.md).

## Dependency and security automation

Renovate handles routine dependency updates with grouped compatibility updates, a Dependency Dashboard, immutable GitHub Action digests, and guarded automerge for low-risk development updates. Dependabot handles security updates only; routine Dependabot version PRs are disabled. The free required quality gate uses `build`, CodeQL, `restore-drill`, `production-audit`, `pre-commit`, Semgrep, and `visual-regression`. SonarQube Cloud is advisory only and is not a required status check. See [the free quality gate](./docs/operations/quality-gate.md) and [dependency automation and static analysis](./docs/operations/dependency-and-static-analysis.md).

## Scripts

| Script | Description |
| --- | --- |
| `doppler run -- npm run dev` | Start the dev server with Doppler secrets |
| `doppler run -- npm run build` | Read-only database preflight followed by the production build |
| `doppler run -- npm run db:preflight` | Verify connectivity, schema, migrations, and canonical content without modifying the database |
| `npm run lint` | Lint; no runtime secrets required |
| `npm run typecheck` | Type check; no runtime secrets required |
| `pre-commit run --all-files` | Run repository-local hygiene and ESLint hooks |
| `npm run test` | Run security and application tests |
| `npm run test:e2e` | Run browser/WCAG tests; DB-backed admin CRUD is skipped without a disposable DB |
| `npm run test:e2e:db` | Start a disposable local PostgreSQL container, migrate it, run all E2E tests, then remove it |
| `npm run test:restore-drill` | Validate the dump/restore machinery using disposable source and target PostgreSQL containers |
| `doppler run -- npm run db:generate` | Generate a migration from schema changes |
| `doppler run -- npm run db:migrate` | Apply migrations using the direct Neon URL |
| `doppler run -- npm run db:seed` | Seed missing placeholder content |
| `doppler run -- npm run db:studio` | Open Drizzle Studio |
| `doppler run -- npm run db:restore-drill` | Dump production read-only, restore into disposable PostgreSQL, compare manifests, and remove all artifacts |
| `npm run admin:hash "<password>"` | Generate an admin password hash locally |
| `npm run seo:indexnow` | Submit every canonical sitemap URL to IndexNow |

The E2E suite uses local dummy authentication values and never uses Doppler production secrets. GitHub Actions provisions a fresh PostgreSQL 16 service, applies versioned migrations, and runs full project, post, profile, settings, and contact-message CRUD coverage. Contact messages expire after 12 months; abuse-prevention records contain HMAC identities rather than raw IP addresses and expire after 24 hours. Production continues to use the Neon HTTP driver; the `node-postgres` driver is enabled only when `DATABASE_DRIVER=node-postgres` is explicitly set by CI or the disposable local test script.

## License

[MIT](./LICENSE)
