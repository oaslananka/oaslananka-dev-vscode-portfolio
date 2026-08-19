# Changelog

All notable changes to this project are documented in this file.

## [3.2.0] - 2026-07-27

### Security and administration

- Activated the dedicated `admin.oaslananka.dev` perimeter through Cloudflare Access while keeping the public portfolio directly served by Vercel.
- Added a per-request nonce Content Security Policy for `/admin` rendering, redirects, and fail-closed responses; admin `script-src` and `style-src` no longer require `'unsafe-inline'`.
- Centralized CSP construction and preserved the public site's static generation, ISR, CDN caching, Markdown negotiation, and production-only `upgrade-insecure-requests` behavior.
- Added regression tests for nonce uniqueness, invalid nonce rejection, public/static CSP compatibility, admin request-header propagation, and the root layout's static-rendering boundary.
- Resolved CodeQL review findings before merge without bypassing required checks or conversation-resolution protection.

### Portfolio content and discovery

- Added editable Education data and published it consistently across About, Markdown, LLM discovery, and JSON-LD outputs.
- Added the Sismo Smart case study with explicit confidentiality and evidence boundaries.
- Refined experience, availability, contact, and homepage copy while keeping canonical URLs, sitemap entries, and machine-readable content synchronized.
- Applied and verified the forward production migration for canonical portfolio content.

### Browser and delivery reliability

- Stabilized Firefox and WebKit smoke coverage and fixed the WebKit titlebar/media stacking regression that blocked the command-palette control.
- Preserved deterministic Chromium end-to-end and visual-regression baselines after the content revision.
- Kept the mandatory free quality gate authoritative through GitHub CI, CodeQL, Semgrep, production audit, PostgreSQL migration/preflight, restore drill, browser tests, and visual regression.

### Operations

- Synchronized package and lockfile metadata at version `3.2.0` using the pinned Node.js/npm toolchain.
- Added durable design, implementation-plan, and redacted operations-checkpoint records for the CSP and release work.

## [3.1.0] - 2026-07-26

### Security and quality

- Replaced the mandatory SonarQube Cloud gate with a free authoritative merge gate built from GitHub CI, CodeQL, Semgrep, production dependency audit, pre-commit checks, visual regression, and the PostgreSQL restore drill.
- Closed production dependency advisories and hardened the content security policy without disabling incremental static regeneration.
- Added an optional, fail-closed Cloudflare Access perimeter for the admin area while keeping it disabled unless fully configured.
- Fixed confirmed runtime and test defects, including un-awaited Playwright assertions, an inaccessible terminal interaction, and an error-boundary naming collision.

### Accessibility

- Converted the command palette to a native dialog with correct focus restoration and Escape handling.
- Improved privacy-panel semantics and changed live status text to native output elements.
- Added explicit accessibility metadata and a complete visual-description track for the silent project demo video.
- Introduced theme-safe semantic status colors and enforced WCAG AA contrast with automated tests.

### Database and operations

- Upgraded `drizzle-kit` and `drizzle-orm` together to `1.0.0-rc.4`, removing the legacy `@esbuild-kit` loader chain.
- Converted all nine Drizzle migrations to the v3 timestamped-folder format while preserving every SQL file byte-for-byte.
- Added disposable PostgreSQL coverage for upgrading the legacy migration table without replaying SQL or changing stored migration timestamps.
- Updated database preflight checks to support both legacy millisecond migration records and the v3 folder format.
- Eliminated the PostgreSQL startup race in the restore-drill self-test by waiting for the final server process and a successful query.

### Delivery and browser coverage

- Added required Chromium end-to-end and visual-regression checks plus scheduled Firefox and WebKit smoke coverage.
- Made GitHub-derived browser fixtures deterministic and isolated visual baselines from mutable database tests.
- Kept Sonar analysis available only as an optional manual advisory check.
