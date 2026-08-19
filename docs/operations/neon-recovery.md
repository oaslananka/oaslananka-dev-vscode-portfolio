# Neon recovery runbook

This project uses Neon only for production. Recovery checks must therefore avoid writing to the production branch.

## Recovery layers

1. **Neon point-in-time branch** — create an isolated branch from a current or historical production state, validate it, then delete it.
2. **Logical PostgreSQL backup** — create a temporary `pg_dump`, restore it into disposable local PostgreSQL, compare deterministic manifests, and delete every temporary artifact.

Neither procedure changes the Vercel or Doppler production connection strings.

## Automated logical restore drill

Prerequisites:

- Doppler CLI authenticated for project `oaslananka-dev-vscode-portfolio`, config `prod`
- Docker
- PostgreSQL client tools

Validate the machinery without production access:

```bash
npm run test:restore-drill
```

The self-test is intended for Linux/Docker environments and is also enforced by CI. Then run the read-only production drill:

```bash
doppler run --config prod -- npm run db:restore-drill
```

The script:

- reads only from `DATABASE_URL_UNPOOLED`
- detects the production PostgreSQL major version
- uses the matching official PostgreSQL Docker image
- captures a source manifest before and after the dump
- aborts if production data changes during the dump window
- restores `public` and `drizzle` schemas into disposable PostgreSQL
- compares schemas, row counts, row hashes, and sequence positions
- removes the dump, manifests, and container even on failure

Expected safe output resembles:

```text
restore_drill=passed
postgres_major=17
tables_verified=7
rows_verified=...
dump_bytes=...
dump_sha256=...
source_manifest_stable=yes
restored_manifest_match=yes
temporary_artifacts_removed=yes
```

The checksum identifies that one temporary dump only. The dump itself is never committed or retained.

## Neon point-in-time branch drill

Authenticate once on the operator machine:

```bash
npx neonctl auth
```

List projects and branches without copying connection strings into chat, tickets, or logs:

```bash
npx neonctl projects list
npx neonctl branches list --project-id <project-id>
```

Choose a timestamp inside the configured restore window and create an expiring branch:

```bash
branch_name="restore-drill-$(date -u +%Y%m%d-%H%M%S)"
restore_time="$(node -e "console.log(new Date(Date.now() - 5 * 60_000).toISOString())")"
expires_at="$(node -e "console.log(new Date(Date.now() + 2 * 60 * 60_000).toISOString())")"

npx neonctl branches create \
  --project-id <project-id> \
  --name "${branch_name}" \
  --parent "${restore_time}" \
  --expires-at "${expires_at}"
```

Validate only the temporary branch:

- obtain its connection string locally with `neonctl connection-string`
- run migrations in check-only or read-only mode
- compare application table inventory and row counts
- run read-only page/content smoke tests
- never sync the temporary URL to Doppler or Vercel production

Delete it after validation instead of waiting for expiration:

```bash
npx neonctl branches delete "${branch_name}" --project-id <project-id>
```

## Emergency production recovery

Do not immediately rewind the production branch.

1. Identify the incident timestamp in UTC.
2. Create a new historical branch at that timestamp.
3. Validate schema, content, authentication records, and application reads.
4. Export only the required records or prepare a reviewed branch restore plan.
5. Take a fresh logical dump of the current production state before any destructive action.
6. Require explicit operator approval before using `neonctl branches restore` on production.
7. Preserve the pre-restore branch under a clear backup name.
8. Verify Vercel health, Sentry, contact delivery, sitemap, and admin access after recovery.

## Schedule

- Run the automated logical restore drill monthly and before high-risk migrations.
- Run the Neon historical branch drill quarterly.
- Re-check the configured restore window after any Neon plan change.
- Record the date, commit, result, dump size, and verified table count; never record credentials or row data.
