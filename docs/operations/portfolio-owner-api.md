# Portfolio owner API — one Ops connection

The owner-facing Ops connection is named `portfolio`. It uses the existing
strong `AGENT_API_WRITE_KEY`, which can also read private CMS content while
`AGENT_CONTENT_WRITE_ENABLED=true`. The old read key remains read-only.

All operations use the same fixed origin: `https://www.oaslananka.dev/`.

- `GET /api/agent/v1/context`, `/profile`, `/settings`, `/projects`,
  `/projects/{slug}`, `/posts`, `/posts/{slug}`: private reads.
- `POST /api/agent/v1/proposals`: create a durable owner-review proposal.
- `GET /api/agent/v1/proposals/{requestId}`: check approval / obtain fresh
  three-minute, request-specific proof after the owner approves.
- `PATCH /api/agent/v1/projects/{slug}` and
  `POST /api/agent/v1/projects/{slug}/publication`: revision-bound content
  changes with an exact owner-approved signed proof and idempotency key.
  Publication is never implied by a content update.
- `POST /api/agent/v1/projects` and `/posts`: create unpublished drafts
  under their existing creation preconditions and approval flow.
- `POST /api/agent/v1/media`: small PNG/JPEG/WebP raster upload.
  The app relays bytes to the existing `media.oaslananka.dev` service with
  its **separate** server-only `MEDIA_UPLOAD_TOKEN`; immutable public
  URLs are returned. This never changes the CMS or publication state.

This is a single externally configured API, not a merger of separate upstream
secrets or a new service. No DNS, database schema, paid infrastructure, or
credential is added. Keep old Ops connections disabled (rather than removing
them) until the unified API passes a real end-to-end verification.

Only the owner may approve content proposals; the existing full patch and
revision fingerprint checks still apply. A writer's read privilege does not
grant a read-only key write privileges.
