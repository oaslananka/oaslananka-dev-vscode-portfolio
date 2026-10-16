# Agent content PATCH API (disabled by default)

Four PATCH endpoints update **existing** records at the same paths as the
private GET endpoints: `/api/agent/v1/profile`, `/settings`, `/projects/{slug}`,
`/posts/{slug}`. They reuse `/admin` Zod input validation, the common content
mutation service and database audit triggers.

The write service requires `AGENT_CONTENT_WRITE_ENABLED=true` and a
separate `AGENT_API_WRITE_KEY` (32+ UTF-8 bytes, distinct from the
`AGENT_API_SECRET_KEY`), plus a verified service principal
`AGENT_WRITE_ACTOR_ID` (e.g. `agent:portfolio-owner`). Missing any condition
makes PATCH return HTTP 503.
The private GET API and `/admin` remain independent.

Each request uses bearer authorization, an explicit signed per-change `X-Agent-Approval`, a unique `Idempotency-Key` UUIDv4
(stable across retries), `Content-Type: application/json`,
`If-Match` with the quoted integer revision returned by GET, and a nonempty
JSON object up to 256 KiB. Stale versions produce 409; missing preconditions
produce 428. The existing database-backed rate limit is 30 authorized
attempts per hour, failing closed. PATCH success returns HTTP 204 and records
a new audit revision with the agent principal and request UUID. Exact retries
return 204 without making another revision; reuse with changed input returns 409.
The request key ledger and changed record commit atomically. Re-read the new
revision before another update.

`published` and `publishedAt` cannot be edited by ordinary article PATCH.
Editing already published articles and changing draft publication state are
**both blocked**. Publish/unpublish, record creation, deletion and restore are
not exposed by this PR; all need separately scoped, authorized workflows.

**Deployment gate:** Migration `20261016193000_agent-write-identity`
adds `agent_write_requests` and records the actor/request ID in `content_changes`.
A separate migration `20261016211500_agent-command-approval` adds the
request-bound administrator approval reference without modifying the migration
already journaled in Preview. Apply and validate **both** migrations *before*
deploying this application change;
never merge the new schema reference first. Do not enable production writes.
An explicitly approved publication workflow, independently attributed human
approvals, Ops credential onboarding and live permission acceptance are still
missing. No write credentials or service connection are created by this PR.

## User-command approval boundary

Holding the agent write key does **not** grant permission to change arbitrary
content. Before each new edit, an **authenticated administrator** must approve
the exact request body, `If-Match` revision, target resource and idempotency
UUID through same-origin `POST /admin/api/agent-approvals`. This issuance path
is protected by the existing admin session and the admin access gateway, and
rejects cross-origin browser requests. It returns a 3-minute HS256 approval
JWT bound to all the approved parameters. The write endpoint verifies this
proof independently of the agent write key; it rejects missing, modified or
expired approvals with 403. The approval JWT is **not** a reusable global
permission to edit content. The issued approval ID is recorded in the durable
request ledger alongside the authenticated agent principal and its request ID.

This is a **backend approval primitive**, not yet a complete ChatGPT-native
user approval interaction. The administrator must see and deliberately approve
what will change. Before enabling any live writes, complete the UX and Ops
approval provenance integration; do not let an agent mint approval tokens or
present an autonomous API POST as proof of human approval. In particular,
ChatGPT conversation text alone is not a cryptographic signature.
