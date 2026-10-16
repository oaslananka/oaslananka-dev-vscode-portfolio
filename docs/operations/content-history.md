# Content revision history — initial database rollout

The migration `20261016163600_content-audit-revisions` adds a `revision`
integer to profile, site settings, projects and posts, plus an append-only
`content_changes` table. All four tables record pre-existing rows as revision
1 before enabling PostgreSQL triggers. Every subsequent admin or other SQL
insert/update/delete creates a history entry *in the same transaction*.

- Inserts start at revision 1; each UPDATE increments the revision regardless
  of client input; deletion writes a final tombstone entry.
- Each entry contains entity type/id, operation, previous JSON snapshot, next
  JSON snapshot, revision and database timestamp. Unpublished posts are stored
  in this private table; never expose it through a public endpoint.
- `UPDATE ... WHERE id = ? AND revision = ? RETURNING ...` is the required
  compare-and-swap primitive for future HTTP writes. An empty result means
  conflict/not found, **not** success.
- Restoring content means writing a previous *validated* snapshot with an
  expected current revision, creating a NEW history entry. Never mutate the
  audit ledger to rewind time. The actual authenticated restore adapter is
  **not part of this migration**.
- The record does not attribute individual human/agent identity yet. Do not
  describe it as authenticated user attribution or a database backup. Actor
  identity must be carried through a separately tested write transaction.
- No new HTTP writes, R2 uploads, secrets, permissions, or data deletion.

Deployment condition: first pass upgrade compatibility and temporary-Postgres
integration checks, then review the PR and migration plan. Deployment/runtime
behaviour must be separately observed before any write API is enabled.
