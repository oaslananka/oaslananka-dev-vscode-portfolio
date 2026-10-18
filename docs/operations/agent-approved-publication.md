# Approved project and article publication (staged)

This change is stacked on draft PR #37. It does not authorize a production
migration, merge, write credentials, or publication of any live content.

Existing content is readable via the private agent GET endpoints (including
its `revision` and `published` fields). Publication never rides on the generic
project/article PATCH path.

1. Submit `POST /api/agent/v1/proposals` with resource
   `/api/agent/v1/projects/{slug}/publication` or
   `/api/agent/v1/posts/{slug}/publication`, an exact patch
   `{ "published": true }` or `{ "published": false }`, a fresh UUIDv4
   `Idempotency-Key`, and the current strong `If-Match` revision.
2. The owner explicitly reviews the current and requested publication state
   in `/admin/agent-approvals` and approves or rejects that request.
3. Poll the proposal status for the short-lived, request-bound approval JWT.
4. Call `POST` on the same `/publication` resource with the unchanged patch,
   revision, request key, `X-Agent-Approval`, and separate writer bearer key.
   Successful transition returns 204; identical retries return 204 with no
   additional audit revision. Changed payloads, stale revisions, or attempts
   to modify additional fields fail. Already matching states reject new proposals.

Both transitions are transactional and use database-enforced revision triggers,
actor/request/approval audit and shared revalidation/IndexNow signaling.
Articles set `publishedAt` to server time when publishing and retain it on
unpublication. Project visibility is enforced by the shared public queries,
including listing, detail, social-image, sitemap and discovery endpoints.

The API remains disabled without the existing independent write key,
feature switch, administrator review and signed approval. This implementation
adds no new database migration or external service.

**Release order:** PR #35 -> #36 -> #37 -> publication PR. Verify all required
CI checks on `main`-targeted PRs after restacking. Before merging any of
these, validate current production target, create and independently restore
a fresh snapshot, apply the five committed migrations in schema-first order,
verify the old app still works, and obtain separate rollout authorization.
