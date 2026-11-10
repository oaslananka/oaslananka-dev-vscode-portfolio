# Isolated Vercel Preview

Vercel Preview intentionally has no production DATABASE_URL. Prior builds
failed at getPublishedPosts() while pre-rendering pages. Preview now uses the
repository's bundled example content only when VERCEL_ENV=preview and
neither database URL is configured. That allows checking layout and browser
behavior without a new service, duplicate database, or paid environment.

The page displays a prominent PREVIEW — Demonstration content only
banner and robots.txt disallows crawling. Preview does not prove that live
CMS records or messages work; production continues to require database
readiness and fails closed when its database is unavailable.

If a dedicated preview DB is added in the future, sample fallback is disabled
and the preview must be migrated/separately configured. Never copy production
secrets into Preview solely to make a build succeed.

## Preview data provenance

Every Vercel Preview build emits a sanitized `[preview-provenance]` line
with `source`, `branch_ancestry`, and `live_data_parity`. The page
also shows a persistent accessible PREVIEW notice, including when a
database is configured:

- `source=bundled-demo`: no database URL was provided, the UI uses
  demonstration fixtures, and live-data parity is definitively `no`.
- `source=database-unverified`: a database URL is present, but the app
  cannot establish Neon branch parentage or production parity solely
  from a connection string. Both are `not-verified`.

No URL, credential, branch identifier, content row, or account data is
included in this build evidence. These classifications prevent a
successful Preview build from silently standing in for a test of actual
production data.

The Neon integration was inspected on 2026-11-10: existing Vercel Preview
branches descended from the Neon default branch named `production`,
which is **not** the branch actually serving production traffic.
This is an observation, not a permanent guarantee about new branches.

A future live-parity acceptance must separately verify the running
Preview database session identity and **provider-reported parent
ancestry**, compare to the pinned production identity, and prove
schema/content parity using an explicitly authorized isolated fixture
or sanitized branch. If any evidence is missing, report `NOT VERIFIED`.
Never connect Preview to the live database, automatically copy contact
or login records, or treat a matching branch *name* as proof.
