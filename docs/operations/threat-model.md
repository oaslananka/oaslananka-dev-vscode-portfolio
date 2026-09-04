# Threat model

This document records the repository's current application-security assumptions and the controls that are executable in source or CI. It is a living engineering artifact, not a compliance certification.

## Assets

- Admin authentication and Cloudflare Access assertions.
- Production database content, including contact messages and administrative content.
- Doppler/Vercel configuration and service credentials.
- Public portfolio content and canonical SEO/agent-discovery representations.
- Contact-notification delivery state and abuse-prevention identities.

## Trust boundaries

1. **Public internet → Next.js public routes.** Untrusted URL, header, Markdown, form, and browser input enters here.
2. **Public/admin host → Cloudflare Access perimeter.** When configured, the dedicated admin host requires a valid Cloudflare Access JWT with expected issuer, audience, and allowlisted email.
3. **Admin perimeter → signed application session.** Protected admin mutations additionally require the repository's signed admin session.
4. **Application → PostgreSQL.** Database mutations are server-only and validation precedes protected writes.
5. **Application → third-party providers.** Sentry, Resend, GitHub, IndexNow, Neon, Vercel, and analytics integrations receive only the data required by their role.
6. **Developer/CI → production configuration.** Local development and tests must use isolated non-production configuration or disposable services; directory-scoped Doppler state is not a safety boundary.

## Primary abuse cases and controls

| Abuse case | Primary controls | Verification |
| --- | --- | --- |
| Bypass admin authentication | Cloudflare Access verification, signed application session, auth-before-database mutation contract | `tests/admin-access.test.ts`, `tests/admin-action-contracts.test.ts` |
| Script/style injection | nonce-based admin CSP, sanitized Markdown, URL/image policies, JSON-LD/XML escaping | CSP, SEO, security-policy tests plus Playwright |
| Credential or secret exposure | `.gitignore`, GitHub secret scanning/push protection, no committed production env files, fail-closed configuration | GitHub repository security settings and governance tests |
| Brute force / abuse | dedicated rate-limit HMAC secret, bounded database rate limiting, short-lived abuse records | rate-limit policy/database tests |
| Cron endpoint abuse | exact bearer-secret verification | `tests/cron-auth.test.ts` |
| Duplicate contact notifications | durable state, leases, stable provider idempotency key, bounded retry/backoff | notification worker/database tests |
| Unsafe database change | versioned Drizzle migrations, disposable PostgreSQL CI, read-only production preflight, restore drill | required `build` and `restore-drill` checks |
| Dependency or workflow compromise | lockfile install, immutable GitHub Action SHAs, CodeQL, Semgrep, OSV Scanner, npm audit, CycloneDX SBOM | required security checks plus SBOM artifact |
| Accidental local production mutation | explicit Doppler config in commands; production services prohibited for local/test activity | repository governance tests and contributor guidance |

## Security invariants

- Production must fail closed when mandatory security configuration is incomplete.
- A protected admin mutation must authenticate before database access.
- Tests, seeds, restore drills, and exploratory commands must not target production.
- GitHub Actions remain pinned to immutable commit SHAs.
- Production secrets must not be printed, committed, copied into development, or attached to telemetry.
- Security controls must not be weakened to unblock dependency upgrades, CI, or releases.

## Residual and externally controlled risk

The repository can verify application and GitHub controls, but it cannot by itself prove Doppler organization IAM, Vercel team IAM/deployment approvals, Cloudflare account policy, Neon account policy, or third-party incident response. Those external controls require read-only provider review. Until verified, production mutation by autonomous agents remains out of scope.

## Review triggers

Review this model when adding a new authenticated route, new external provider, new class of stored personal data, new production credential, new deployment target, new database mutation path, or a material change to the admin perimeter.
