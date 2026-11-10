# Actual Neon live branch — backups and protection (#42)

Status (2026-11-10): **Free encrypted recurring backups and independent recovery verified. Neon-native protected branch remains OFF.** Paid plans and new recurring charges are explicitly rejected by the owner.

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

## Approved approach: existing free resources only

Paid Neon branch protection and scheduled snapshots were evaluated earlier
but explicitly rejected by the owner. They are not authorized alternatives.
The current approved solution uses the existing encrypted logical backup,
off-device mirror, independent recovery keys and hourly alerts.

## Current free backup acceptance (2026-11-10)

The project now uses the *already available* backup host and recovery
machines. No new paid service or Neon plan upgrade is authorized.

- A daily read-only `pg_dump` is taken only after checking the exact
  Vercel/Doppler **serving** Neon branch, not the Neon default. The
  PostgreSQL archive is verified, encrypted with `age`, and retained
  on the existing backup host (up to 30 recent encrypted archives).
- Another machine mirrors the encrypted archives daily, checks SHA-256
  and freshness, and runs hourly health checks. Its hourly monitor
  now also attempts to **decrypt the entire newest archive** with its
  locally held recovery identity. A missing private key and a
  tampered ciphertext with a recomputed checksum both caused the
  expected alert in isolated dry-run negative tests.
- The backup recipient list retains the historical SSH public
  recipient and adds distinct `age` public recipients for two
  owner-controlled recovery devices. **No private key has been
  transferred to the backup host.** The two machines independently
  decrypted the same real three-recipient archive.
- A new mirrored archive was decrypted and restored into an isolated
  PostgreSQL 18 container with `--network none`. It contained
  16 migrations, 10 projects, 6 posts, 14 agent write requests,
  and 11 proposals. All five counts matched separate read-only
  queries against the identity-checked live source. The temporary
  container was removed. The second recovery machine's full
  PostgreSQL restore is **NOT VERIFIED** because its Docker engine
  was unavailable; authenticated decryption was verified.
- **Legacy warning:** archives encrypted before new recipients
  were added still require the original SSH private identity,
  which was not found in the latest inventory. They were not
  altered or deleted and must not be described as recoverable.
  Adding new recipients does not retroactively unlock old files.

Always verify current backup/mirror timers and decryptability before
risky migrations. Never copy private identities to CI, the backup
host, repository files or issue comments. Keep the existing Neon
native manual snapshot. The real live branch remains
`protected=false` on the Free plan; endpoint restrictions are not
native branch protection. No change to production Neon branch,
endpoint, credentials, or data is needed for this recovery path.

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
