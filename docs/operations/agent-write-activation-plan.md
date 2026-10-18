# Agent write API — staged authorization and acceptance

Status: **NOT AUTHORIZED FOR PRODUCTION ENABLEMENT**.
The five schema-first migrations have landed, but this is a disabled-by-default
feature. The production agent endpoints returning HTTP 503 is expected while
read/write keys, the service principal and the feature switch remain absent.

## Preconditions

- Issues #39 and #41 confirmed the actual production database identity
  and the fail-closed project/branch/compute/database preflight. Issue #42
  records remaining live-branch protection and recurring-backup gaps.
  Resolve the required recovery level and obtain explicit rollout
  authorization before enabling real writes.
- The production API must retain a separate 32+-byte read bearer key and
  32+-byte write bearer key that differ; configure a constrained
  `agent:<service-principal>` actor; never print or commit keys.
- The writer remains off unless
  `AGENT_CONTENT_WRITE_ENABLED=true`, both distinct credentials,
  and `AGENT_WRITE_ACTOR_ID` all validate. A valid token alone is
  **not** an administrator's approval.
- Register a scoped, auditable Ops connection to this one application's
  OpenAPI contract; do not issue unrestricted SQL or GitHub permissions to
  the content-writing service. Maintain separate credential rotation
  and revocation procedures.

## Phase 0: Read-only production evidence (no keys, no writes)

With the correct restricted Doppler `prod` config, run
`npm run agent:write:readiness`. It verifies the actual connected Neon
identity, the five required migrations and write/proposal/audit inventory
inside a PostgreSQL read-only transaction. The command fails if the
production write switch is on or writer credentials are fully configured.
Never treat this result as permission to enable writes.

Confirm the public app is healthy; agent write and proposal routes remain
closed. Check the current native backup, a recent independent restore, the
production identity pin and rate-limit/audit table readiness.

## Phase 1: Isolated acceptance (synthetic only)

Run `E2E_AGENT_WRITE_TEST=true npm run test:e2e:db` with disposable
PostgreSQL and synthetic independent credentials. Review tests for:

- Proposal submission does not change content, status expiry/rejection
  and strong revision preconditions.
- A separate, authenticated administrator explicitly reviews the exact
  field diff and approves or rejects it through
  `/admin/agent-approvals`. The agent cannot self-approve.
- Short-lived, request-bound signed approval JWT, exact patch and
  resource identity, idempotency UUID, atomic mutation + audit.
- Replayed and stale edits, wrong token, revoked credentials, publish
  without dedicated approval, and unavailable rate limiting fail closed.
- Article/project draft visibility and explicit publish/unpublish 404/200
  behavior, with one audit revision for one approved action.

The already deployed production data must not be reused as an unprotected
test source. If a live-data parity acceptance is essential, separately
authorize a restricted live-derived, non-production branch and avoid
copying private contact/login records into public Preview infrastructure.

## Phase 2: Operator-assisted canary (separate production approval)

After owner sign-off on backups, principal scope, rotation/revocation and
Ops connection, enable **only** the explicitly authorized writer client.
Begin with a single reversible, low-impact, unpublished test draft. Require
a deliberate owner action in the admin approvals page for each patch.
Confirm the exact proposal, actor, revision, approval ID, request UUID and
audit row. No automatic approval, no uncontrolled publication and no
unattended repeated mutations.

Measure response codes, auth failures, 409/428 precondition errors, rate
limits, rollback latency and audit accuracy. Require a second specific
authorization before an agent is allowed to publish a live public item.

## Kill switch, rollback and acceptance

- First set `AGENT_CONTENT_WRITE_ENABLED=false` in production and deploy
  that config. Then revoke/rotate the write credential and disable its Ops
  connection; preserve audit records. Existing read/admin paths must remain
  independently functional.
- A database snapshot restore is not the default undo for an individual
  edit; use revision-aware domain changes under owner review.
- Complete only when a real authorized test yields the exact audited
  outcome, negative tests continue to fail closed, and revocation works.
  Do not label synthetic Playwright success as production write acceptance.

The rollout owner must separately authorize production enabling and the
specific canary content; the present plan does not grant either permission.
