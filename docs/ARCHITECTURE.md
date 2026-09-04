# Architecture

This repository is a single Next.js web application. Keep it simple: public portfolio rendering, the authenticated admin surface, shared domain/policy code, and PostgreSQL persistence live in one deployable unit. Do not introduce services or infrastructure layers unless a measured product or reliability need justifies them.

## Runtime map

- `app/` — Next.js App Router entry points. Public pages live under `app/(site)/`; authenticated administration lives under `app/admin/`; scheduled maintenance endpoints live under `app/api/cron/`; machine-readable discovery routes such as `/AGENTS.md`, `/llms.txt`, and Markdown mirrors are also defined here.
- `components/` — reusable React UI. `components/admin/` is specific to the authenticated admin surface.
- `lib/` — application/domain policies and server-side behavior: authentication, access policy, content/security policy, contact delivery, discovery, SEO, rate limiting, and related helpers.
- `lib/admin/` — bounded admin validation, action state, and data helpers.
- `lib/db/` — Drizzle schema, database access, migrations, preflight, seed/default content, and content authority rules.
- `scripts/` — deterministic build, migration/preflight, recovery, performance, icon-generation, and operational verification commands.
- `tests/` — fast Node/TypeScript unit, policy, regression, and database-contract tests. Database-backed cases require an explicitly disposable PostgreSQL target.
- `e2e/` — Playwright browser journeys, accessibility, responsive, SEO, admin CRUD, and visual-regression checks.
- `.github/workflows/` — CI, security scanning, browser matrix, dependency automation, and advisory analysis.
- `docs/operations/` — operational/security runbooks and quality-gate policy.
- `docs/performance/` — measured performance evidence and fitness-function rationale.

## Trust and dependency boundaries

1. Public routes must not expose admin-only, contact-message, credential, or rate-limit state.
2. Admin mutations authenticate before database access. The admin perimeter may additionally require a validated Cloudflare Access assertion; malformed or partial perimeter configuration fails closed.
3. Production secrets stay outside the repository. Local work must use an isolated non-production Doppler config and commands must select the intended config explicitly.
4. Database migrations, seeds, integration tests, restore drills, and exploratory commands must never target production unless the operation is explicitly production-scoped, reviewed, and documented as safe.
5. Production database readiness is checked before a production build; development/test builds use non-production or bundled test content and must not silently require production services.
6. Public machine-readable Markdown/agent surfaces are derived from the same application/domain data as the human-facing site and must preserve privacy boundaries.
7. Third-party GitHub Actions are pinned to immutable commit SHAs; merge-critical deterministic checks are enforced by branch protection.

## Executable enforcement

Current executable architecture/behavior sensors include:

- TypeScript strict type checking and ESLint.
- `npm run verify` for the fast deterministic local contract.
- Policy tests that require protected admin mutations to authenticate before database access.
- Deployment-environment/build-policy tests that separate production preflight behavior from development/test behavior.
- Security-policy, CSP, URL/image-policy, rate-limit, cron-auth, migration-compatibility, repository-governance, and client/server import-boundary tests.
- Disposable-PostgreSQL migration/preflight/admin CRUD coverage in CI.
- Playwright browser, accessibility, responsive, SEO, and visual-regression checks.
- CodeQL, Semgrep, OSV Scanner, production dependency audit, pre-commit policy checks, critical-module coverage thresholds, homepage-density fitness checks, CycloneDX SBOM/provenance generation, and restore-drill checks in CI.

## Architecture governance

`tests/architecture-boundaries.test.ts` enforces the current highest-risk dependency rules: client modules may not runtime-import server/database/auth primitives, and the edge proxy stays independent from database and `next/headers` modules. ADRs live in `docs/decisions/`; ADR 0001 records the decision to keep one Next.js deployment unit.

The repository intentionally does not add a general-purpose dependency graph framework or cycle detector yet. Add broader machinery only when measured drift shows that the focused rules are insufficient.

## Change guidance

- Put route composition in `app/`, reusable presentation in `components/`, application/security policy in `lib/`, and persistence concerns in `lib/db/`.
- Keep server secrets and database clients out of client components.
- Extend existing policy modules before duplicating validation or security decisions in routes/components.
- For a new high-risk boundary, add a deterministic policy/regression test and document the invariant here or in the relevant runbook.
- For complex work, record decisions and verification evidence in repository documentation so the repository remains the engineering system of record.

## Related system-of-record documents

- `docs/operations/threat-model.md` — assets, trust boundaries, abuse cases, and residual external risk.
- `docs/operations/service-level-objectives.md` — reliability targets, evidence expectations, and rollback triggers.
- `docs/decisions/0001-single-nextjs-application.md` — accepted deployment-architecture decision.
- `evals/agent-tasks.json` — representative agent task/evidence contracts; the repository validates the corpus structure but does not claim measured agent success from this file alone.
