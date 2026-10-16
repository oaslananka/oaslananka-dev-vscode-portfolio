# Agent content PATCH API (disabled by default)

Four PATCH endpoints update **existing** records at the same paths as the
private GET endpoints: `/api/agent/v1/profile`, `/settings`, `/projects/{slug}`,
`/posts/{slug}`. They reuse `/admin` Zod input validation, the common content
mutation service and database audit triggers.

The write service requires both `AGENT_CONTENT_WRITE_ENABLED=true` and a
separate `AGENT_API_WRITE_KEY` (32+ UTF-8 bytes, distinct from the
`AGENT_API_SECRET_KEY`). Missing any condition makes PATCH return HTTP 503.
The private GET API and `/admin` remain independent.

Each request uses bearer authorization, `Content-Type: application/json`,
`If-Match` with the quoted integer revision returned by GET, and a nonempty
JSON object up to 256 KiB. Stale versions produce 409; missing preconditions
produce 428. The existing database-backed rate limit is 30 authorized
attempts per hour, failing closed. PATCH success returns HTTP 204 and records
a new audit revision; read the new revision before another update.

`published` and `publishedAt` cannot be edited by ordinary article PATCH.
Publish/unpublish, record creation, deletion and restore are not exposed by
this PR; all need separately scoped, explicitly authorized workflows.

**Deployment gate:** Do not enable production writes yet. Actor attribution,
request idempotency, isolated end-to-end write/rollback testing, release audit,
and Ops credential configuration must be completed and reviewed first. No
write secrets or service connection are created by this change.
