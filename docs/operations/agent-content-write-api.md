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
already journaled in Preview. Apply and validate **all three** migrations *before*
deploying this application change;
never merge the new schema reference first. Do not enable production writes.
An explicitly approved publication workflow, independently attributed human
approvals, Ops credential onboarding and live permission acceptance are still
missing. No write credentials or service connection are created by this PR.

## User-command approval boundary

The agent cannot mint approvals. The API write key is only permitted to
submit change proposals until a human explicitly approves each edit.

1. The agent calls POST /api/agent/v1/proposals with a unique UUIDv4
   Idempotency-Key, If-Match strong revision, and JSON body with resource
   and patch fields. The proposal is validated against the current record
   but does NOT modify any site content. It expires after 15 minutes.
2. The owner visits /admin/agent-approvals, protected by the existing
   admin session and Cloudflare access gate, reviews each current and
   proposed field, checks the acknowledgement, and clicks Approve or Reject.
   Stale or invalid content cannot be approved.
3. The agent polls GET /api/agent/v1/proposals/{requestId} with its
   separate writer bearer token. Pending, rejected, expired, or approved
   status is returned. Only an approved proposal returns a 3-minute JWT.
4. The agent calls the matching PATCH with identical revision, request ID
   and exact JSON patch plus X-Agent-Approval. The PostgreSQL transaction
   re-verifies that the proposal was approved and is still valid before
   committing the new revision and durable actor/approval audit record.

The previous direct admin approval-token POST route has been removed.
An authenticated session alone cannot generate tokens with an agent API
call: the owner must deliberately approve the displayed diff.

This works as a backend + site admin review workflow. A ChatGPT-native
approval callback and automatic Ops connector handoff are separate provider
integrations: the current chat text alone is NOT a cryptographic signature.

## Ops integration status

Ops currently has no registered oaslananka.dev API connection. The
separate agent-content-write.openapi.json specifies proposal submission,
status polling and content PATCH. This contract must remain off in
production until scoped credential onboarding and rollout authorization.
ChatGPT should return the admin approval-page link when proposals are
pending; it must not click Approve on the owner's behalf.

## Release gate

Schema-first migrations, in order:
- 20261016193000_agent-write-identity (audit and idempotency ledger)
- 20261016211500_agent-command-approval (approval ID)
- 20261016213000_agent-proposal-workflow (review queue)

Previously journaled migrations remain byte-identical. None of these
migrations is authorized for the production database yet. Keep agent write
feature flag off. No creation, publishing, deletion, historical restoration
or media upload capability is enabled by this PR.
