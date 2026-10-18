# ADR 0002: Keep the live Neon production branch explicitly pinned

- Status: Accepted
- Date: 2026-10-19
- Tracking issue: #41
- Related: #39, #40

## Context

During the #35–#38 release, Neon's project default branch was not the
branch serving the Vercel/Doppler production PostgreSQL connections.
Although both have 16 schema migrations, 7 projects, 5 posts and 14 audit
rows, deterministic content/audit fingerprints differ. The two branches
are **not interchangeable**.

The live branch has its own read-write compute endpoint and a verified
snapshot restored into an isolated branch. Production builds verify
four-part project/branch/endpoint/database identity pins using the actual
PostgreSQL session (PR #40). The live branch has an old restore-oriented
display name that must not determine its present role.

Preview branches may derive from the Neon *default* branch, meaning even
passing preview builds do not establish live production data parity.

## Decision

**Keep the currently serving production branch and its existing compute
and connection URLs. Do not change Neon default/primary metadata, switch
computes, move/restore/finalize branches, rotate URLs, or synchronize
divergent content solely for naming consistency.**

The source of truth for deployments is the restricted four-part live
production identity pin in Doppler prod and Vercel production, checked
against live PostgreSQL session identity at build and migration time.

Treat the separate Neon default as **non-authoritative for live data**.
It is neither an interchangeable restore point nor a source for
production-equivalent acceptance testing.

A future alignment requires its own data-reconciliation, downtime,
backup/restore, rollback, credentials and application impact plan plus
separate explicit user authorization. No such cutover is scheduled.

## Invariants

1. Release tools fail closed on mismatching or missing Neon identity pins.
2. Both pooled and direct DB URLs and PostgreSQL session identity must
   designate the same approved live project, branch, endpoint and database.
3. Backups, migrations, restores and audits explicitly target the live
   branch ID; never use an implicit default.
4. Preview copies derived from the default are labeled as **not** proven
   production-equivalent. For production-data acceptance, deliberately
   provision an isolated branch from the authorized live source, migrate
   it separately and never reuse live database credentials.
5. The live branch is currently not protected against deletion/reset,
   and no scheduled native snapshots were found. Plan/quota remediation
   is separate open work; retain the existing validated live snapshot.
6. Agent writer credentials, production mutations and automatic
   publication stay disabled pending independent authorization.

## Consequences

Benefits: zero traffic switching, credential churn, divergent-content
overwrite, or loss of writes after the last snapshot.

Tradeoffs: Neon console default is not live production; default-based
preview branches may have different content. Explicit identity and
preview-source validation remain mandatory.

Follow up on live branch protection/backup schedule and preview branch
parentage separately. Reopen this decision only when a demonstrated
operational requirement outweighs the migration risk.
