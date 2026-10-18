# Actual Neon live branch — backups and protection (#42)

Status: operational decision pending (2026-10-19). **This document is NOT evidence that branch protection or recurring backups are enabled.**

## Verified state

The authenticated Neon organization is on the **Free** plan. The actual
Vercel/Doppler live database belongs to Neon project
`jolly-mode-32445173`, branch `br-twilight-bar-as3ibvq8`, compute
`ep-noisy-mode-ass01uqp`, database `neondb`. The Neon default
`br-morning-hall-asyn6s2a` has different content and must not be used
as the backup or restore source.

At inspection, the actual live branch had `protected=false`; the
automatic native snapshot schedule was empty, PITR history was 21,600
seconds (six hours), and the only native manual snapshot was
`snap-winter-violet-aso1fz5c` from the **actual live branch**. Its
isolated restore test previously matched the source. These observations
are time-bound: check the live service before acting.

## Supported choices

**Preferred for integrated protection:** Have the account owner authorize
switching Neon to a suitable metered paid plan (current Neon documentation
says protected branches exist on paid plans and Launch supports scheduled
snapshots). Obtain a pricing estimate and confirm feature entitlements in
the organization's own dashboard before agreeing to charges. After the
owner's explicit plan-change authorization:

1. Confirm that the Vercel and Doppler production project, branch, compute,
   database pins all match an actual read-only PostgreSQL session.
2. Protect ONLY the pinned *actual live branch*, not the Neon default.
   Re-read branch metadata and verify `protected=true`. Confirm production
   service connectivity; never try a destructive deletion as a "test".
3. Configure automated **daily** snapshots with a proposed **7-day
   retention**. This is a proposed policy, not a previously approved
   schedule. Read back the actual schedule.
4. Wait for a completed scheduled snapshot. Restore it to an isolated
   temporary branch WITHOUT finalizing or changing live computes. Compare
   schemas, migration journal, row counts, content and audit digests.
5. Retain the known-good manual snapshot until its replacement and restore
   are independently verified. Only then consider cleanup with permission.

**Without a paid Neon plan:** Keep the existing verified snapshot and the
six-hour PITR window. Regular backups must instead use a **separate
persistently stored encrypted logical backup**, not the existing
`db:restore-drill` script alone: that script intentionally deletes its
temporary dump after verifying restoration. An acceptable self-managed job
must use an approved restricted host, least-privilege read-only backup
credentials, version-matched `pg_dump`, authenticated encryption,
durable off-site storage, defined retention, monitoring/alerts and a
recurring independent restore drill. An archive retained on the same
machine or an unencrypted CI artifact is not a reliable recovery copy.
Do not start the schedule until an appropriate storage sink, encryption
key custody and retention policy have been approved.

## Release rules

- No renaming or swapping Neon branches, updating live URLs or moving
  computes to make labels match.
- No upgrade, deletion of the last backup, protection-mode mutation or
  schedule write without separate user authorization.
- Before high-risk schema changes, verify an up-to-date backup of the
  **actual serving** database and test it in isolation. The manual restore
  drill is a test of recoverability, not a persistent backup.
- Rollback plans must account for writes after the snapshot.
- Record UTC dates, snapshot IDs, source branch ID, table counts and
  digest-match result. Never publish credentials or private rows.

See [ADR 0002](../decisions/0002-pin-live-neon-production-branch.md)
and [Neon recovery](./neon-recovery.md).
