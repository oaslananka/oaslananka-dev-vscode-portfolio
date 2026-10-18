# Production Neon target identity — Issue #39

## Incident and identity

During the release of PRs #35–#38, the Neon default branch was not the
branch used by the Vercel/Doppler production PostgreSQL connection.
Successful migrations on Neon's default branch did not change the live
application database.

The authoritative production target is the four-field identity pin,
recorded in the access-restricted Doppler prod config and Vercel production
environment (the restricted operations inventory):

- PRODUCTION_NEON_PROJECT_ID
- PRODUCTION_NEON_BRANCH_ID
- PRODUCTION_NEON_ENDPOINT_ID
- PRODUCTION_DATABASE_NAME

Never infer the release target from Neon default/primary flags, a branch's
display name, or matching row counts. Never commit DB credentials or data.

## Enforcement

A production build runs db:preflight. Its fail-closed checks verify all four
pins, compare both pooled and unpooled URL endpoints, then connect to the
actual PostgreSQL database and read Neon project, branch and endpoint
session identity, and current_database(), inside a read-only transaction.
They must exactly match the pin before schema, migration and canonical
content preflight continues.

URLs, credentials and raw data are never printed in errors.
Preview/CI/development builds do not require a production pin.
A local migration CLI running with a production pin checks it even if
NODE_ENV is unset.

Drizzle configuration independently validates the URL target before
running a command. The guarded production migration wrapper additionally
verifies actual server-side branch identity and content fingerprint.
The standard db:migrate command routes to this wrapper automatically
whenever a production pin or production deployment is detected.

## Approved production migration procedure

1. Read the actual deployment DB connection metadata, match its endpoint to
   the Neon project and branch, and compare Doppler prod and Vercel
   production pin settings. Do not rely on the Neon default branch.
2. With separate production approval, take a new native snapshot of the
   *live* branch. Restore into an isolated branch; match migration journal,
   schema, row counts and content/audit fingerprints. Retain the snapshot.
3. Obtain the digest using the command:
   doppler run --project oaslananka-dev-vscode-portfolio --config prod -- npm run release:target:fingerprint
4. Record that SHA-256 in the private release authorization. Supply it via
   RELEASE_EXPECTED_CONTENT_FINGERPRINT and execute npm run db:migrate:production
   under the same explicitly pinned Doppler prod config.
5. The wrapper rechecks Neon session identity and computes a deterministic
   digest of content and audit tables in a read-only transaction. Drift in
   target or content aborts before migration starts.
6. After schema update, run db:preflight, verify canonical and audit rows,
   inspect public URLs, then full GitHub CI and production deployment
   health. Keep agent write credentials disabled unless separately approved.

The fingerprint is an approval-time concurrency check and changes on
legitimate content edits. A mismatch requires fresh evidence and approval.

## Boundaries

Do not change, rename, finalize, move or swap Neon branches merely to make
configuration match; such changes require separately approved recovery plans.

A fingerprint check does not lock out writes between verification and SQL
execution; arrange a maintenance window if concurrent changes matter.
Operators with unbounded direct DB credentials may bypass a CLI wrapper;
least privilege and change authorization remain important.

A READY Vercel production build does not grant agent write access.
