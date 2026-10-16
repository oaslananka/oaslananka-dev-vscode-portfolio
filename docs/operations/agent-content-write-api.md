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

Each request uses bearer authorization, a unique `Idempotency-Key` UUIDv4
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

**Deployment gate:** New migration `20261016193000_agent-write-identity`
adds `agent_write_requests` and records the actor/request ID in `content_changes`.
Apply and validate that migration *before* deploying this application change;
never merge the new schema reference first. Do not enable production writes.
An explicitly approved publication workflow, independently attributed human
approvals, Ops credential onboarding and live permission acceptance are still
missing. No write credentials or service connection are created by this PR.
