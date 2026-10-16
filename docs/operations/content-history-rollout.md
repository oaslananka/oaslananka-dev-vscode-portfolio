# Content history: schema-first rollout and recovery checklist

Scope: the draft PR that adds `revision` to four content tables and the private
`content_changes` journal. **Do not merge the application before the matching
production database migration has been applied and verified.** The initial
preview failed with PostgreSQL `42703` when deployment preceded migration.

## Confirmed evidence — 2026-10-16

- The PR-specific isolated Neon Preview branch was migrated using the exact
  committed SQL and a matching Drizzle migration history entry, in one
  transaction. It now has eleven migration records; all four revision columns,
  content triggers, and fourteen baseline audit entries for fourteen existing
  content rows were verified. The production branch has the old schema.
- Neon's native schema diff between Preview and production shows the expected
  content-history additions (table/index, columns, functions and triggers),
  not unrelated application schema edits.
- A fresh **Preview** Vercel deployment of the current PR commit completed
  successfully. An authenticated browser session verified real responses for
  `/`, `/projects`, `/projects/kicad-mcp-pro` and `/articles` (HTTP 200).
  `/api/agent/v1/context` returns 503 by design with no agent key configured.
- GitHub build, static security analysis, visual regression and quality gates
  passed, with no open review threads; this is **not** a live production test.
- At review time, the Neon project had a 2026-09-30 manual snapshot and no
  automatic snapshot schedule. Its configured history retention was 6 hours.
  **No current production restore point or tested restore is asserted.**

## Before touching production — required gates

1. Obtain explicit production authorization for the snapshot/recovery test and
   separate authorization for the production migration. A request to advance
   local/Preview work does not substitute for these operational approvals.
2. Verify the target project, `production` branch and intended database via
   metadata and read-only SQL. Never use the API's default branch implicitly.
3. Create a **fresh** production snapshot and record its snapshot ID privately.
   Restore that snapshot to an **isolated new branch**, inspect schema and
   representative row counts, and prove the restored copy is readable.
   Do not swap branches, replace production computes or expose copied data.
   Do not claim backup success from snapshot creation alone.
4. Check that the old and newly restored data match expected counts and
   relevant integrity constraints. Confirm there is a workable reversal route
   before modifying the production schema; retain the tested snapshot until
   rollout acceptance. Extra test resources are cleaned up only through
   authorized resource-management steps.
5. Recheck production migration history and table columns immediately before
   migration: the new migration must not already be recorded or partially
   applied, and existing production traffic must remain healthy.

## Migration, deploy and smoke test (authorization required)

1. Apply the exact committed migration through the project's Drizzle-aware
   migration mechanism, with SQL and the migration history entry committed
   consistently. **Do not** edit migration checksums or mark SQL as applied if
   statements failed. Migration must succeed before application merge.
2. Verify `revision` on profile/site_settings/projects/posts, all expected
   journal triggers and constraints, exactly one corresponding Drizzle history
   row, and baseline journal entries matching existing content rows.
3. Smoke-test the still-running **old** production app (`/`, `/projects`,
   `/articles`, a real detail page). The additive schema must not break it.
4. Only after DB and old-app checks succeed: mark the draft PR ready, review
   its current head/CI/comments, then merge by the normal repository workflow.
   Verify production deployment is READY and is the intended commit.
5. Run production homepage, project/article detail, sitemap/discovery, API
   fail-closed, and authorized `/admin` read-only checks. Test an authorized
   admin edit + generated audit revision only with an explicitly approved
   low-risk fixture/change and verified rollback. Keep agent writes disabled.

## Recovery rules

- **Before merging the app:** if the additive DB migration succeeded but a
  later deployment is blocked, keep the old application and the additive
  database schema. Do not blindly reverse tables or delete history.
- **After merging the app:** if the new application fails, prefer reverting
  the application to its previously working version while leaving the new
  columns and triggers intact (forward-compatible schema). Validate publicly
  served pages and admin behavior again.
- Database-wide snapshot restoration is not a routine application rollback:
  replacing a production branch can discard writes made since the snapshot.
  Stop any write traffic and reconcile subsequent changes before any actual
  branch restore/swap. A restore demands its own authorization.
- Snapshot access, credentials and copied unpublished data remain private.
  Never commit connection strings, API keys, production data or snapshot
  payloads to the repository.

## Explicitly outside this PR

No public mutation routes, automatic publishing, R2 media, secret enrollment,
production writes or working ChatGPT/Ops write connection. The revision and
restore functions are internal building blocks only.
