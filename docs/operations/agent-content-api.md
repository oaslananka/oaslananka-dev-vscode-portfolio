# AI content administration (incremental rollout)

The **existing** Next.js app remains the only content backend. The authenticated
`/admin` interface is unchanged. A private, versioned API provides access for
ChatGPT through the owner's existing Ops HTTP API gateway; no additional MCP
server is required.

## First increment: private reads

`GET /api/agent/v1/context`, `/profile`, `/settings`, `/projects`,
`/projects/{slug}`, `/posts`, and `/posts/{slug}`. The context result contains
content summaries and selected limits; individual endpoints return full data,
including **unpublished posts**. Never expose their results publicly.

The API requires `Authorization: Bearer <token>` with a configured
`AGENT_API_SECRET_KEY` of at least 32 UTF-8 bytes. Configure it **only** through
Doppler in the environment intentionally being connected; do not put the
value in tickets, docs, curl history, repo configuration, or chat. With no
valid configuration, all endpoints fail closed (503). Invalid credentials
receive 401. Responses are `private, no-store` and `noindex`.

The service has no mutation or media endpoints in this increment. Do not
advertise write permissions until implemented, security-tested, and explicitly
enabled. The source-of-truth remains Neon PostgreSQL; `lib/admin/data.ts`
provides uncached administrative reads. Contact messages, authentication
records and rate-limit records are not part of this API.

## Ops connection (after review; not provisioned by this PR)

1. Use an isolated `dev` environment and **separate non-production database**.
   Do not test or seed against production. The current Doppler project has only
   a `prod` config, so the isolated environment must be established first.
2. Deploy an environment with the read API and a dedicated agent API key.
3. In Ops **Add API**, configure the trusted fixed-origin HTTPS base URL with
   the key referenced from Doppler; select `readOnly: true` initially.
4. Import `docs/operations/agent-content-api.openapi.json` as OpenAPI 3.
5. Verify unauthorized requests fail; test authorized context and detail reads;
   confirm unpublished entries stay inaccessible without valid credentials.
6. Future implementation: common domain write service + JSON mutations,
   revision preconditions, audit/rollback, R2 upload, then per-operation tests
   and full ChatGPT → Ops → staging → live validation.

Never switch a configured Ops connection from read-only to write merely because
an OpenAPI operation is present. Treat the policy as a separate authorization
boundary.
