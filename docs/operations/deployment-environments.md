# Deployment environment policy

The application resolves deployment behavior in one place: `lib/deployment-environment.ts`.

`VERCEL_ENV` is authoritative when Vercel provides it. This distinction is important because Vercel preview builds use `NODE_ENV=production` even though they are not production deployments. Outside Vercel, `NODE_ENV=production` is treated as a real production deployment and receives the same fail-closed protections.

## Supported environments

| Environment | Signals | Canonical URL | Bundled content | Rate-limit HMAC | Search metadata | IndexNow |
| --- | --- | --- | --- | --- | --- | --- |
| Vercel production | `VERCEL_ENV=production`, `NODE_ENV=production` | `SITE_URL` required (`NEXT_PUBLIC_SITE_URL` accepted temporarily for compatibility) | Disabled | `RATE_LIMIT_HMAC_SECRET` required | Indexable | Enabled unless explicitly disabled |
| Vercel preview | `VERCEL_ENV=preview`, normally `NODE_ENV=production` | Explicit URL or `VERCEL_PROJECT_PRODUCTION_URL` hint | Disabled | Auth/development fallback permitted | `noindex` | Disabled |
| Local development | `NODE_ENV=development` or unset | Localhost fallback permitted | Requires `ALLOW_DEFAULT_CONTENT=true` | Auth/development fallback permitted | Existing non-preview behavior | Disabled |
| Automated test | `NODE_ENV=test` | Localhost fallback permitted | Requires `ALLOW_DEFAULT_CONTENT=true` | Auth/development fallback permitted | Existing non-preview behavior | Disabled |
| Non-Vercel production | `NODE_ENV=production`, no `VERCEL_ENV` | `SITE_URL` required (`NEXT_PUBLIC_SITE_URL` accepted temporarily for compatibility) | Disabled | `RATE_LIMIT_HMAC_SECRET` required | Indexable | Enabled unless explicitly disabled |

## Operational rules

- Do not set or override `VERCEL_ENV` manually in Vercel. It is supplied by the platform.
- Never set `ALLOW_DEFAULT_CONTENT=true` in preview or production. The application ignores the flag in both environments.
- Production requires a dedicated `RATE_LIMIT_HMAC_SECRET`; `AUTH_SECRET` is not accepted as its replacement.
- Production canonical URLs must be HTTPS origins without paths, credentials, queries, or fragments. HTTP remains allowed only for loopback hosts used by controlled local production checks.
- `SITE_URL` is server-only and is the canonical configuration key. `NEXT_PUBLIC_SITE_URL` exists only as a migration fallback for deployments that have not switched yet.
- Preview deployments remain `noindex` and do not submit IndexNow notifications, even when they reuse the production-domain hint for canonical URL generation.
- Invalid non-empty `NODE_ENV` or `VERCEL_ENV` values stop configuration resolution instead of silently selecting a weaker policy.

## Framework-mode exceptions

Not every `NODE_ENV` check describes deployment policy. The following remain local to their modules:

- Next.js development CSP allowances in `next.config.ts`
- secure-cookie transport selection in `lib/auth.ts`
- test pool sizing and hot-reload pool reuse in `lib/db/index.ts`

These checks describe runtime mechanics and should not be replaced with deployment-kind checks.

## Verification examples

Resolve a non-Vercel production deployment:

```bash
NODE_ENV=production \
SITE_URL=https://example.com \
RATE_LIMIT_HMAC_SECRET="$(openssl rand -base64 32)" \
npm run build
```

A complete production build also requires the database variables and canonical content rows. CI provisions disposable PostgreSQL, applies versioned migrations, and runs the complete build and browser suite.

Run local development with bundled placeholder content:

```bash
ALLOW_DEFAULT_CONTENT=true npm run dev
```
