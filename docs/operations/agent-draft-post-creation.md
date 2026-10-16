# Agent-created unpublished article drafts (stacked on PR #35)

The agent may propose creation of a new unpublished article. This operation
never changes published content and never publishes the new record.

1. Agent submits POST /api/agent/v1/proposals, using the dedicated writer
   bearer key, a fresh UUIDv4 Idempotency-Key and If-None-Match: *.
   Example body: {"resource":"/api/agent/v1/posts",
   "patch":{"title":"...","slug":"...","body":"..."}}.
2. The owner reviews the proposed fields in /admin/agent-approvals and clicks
   Approve or Reject. Approval is separate for each proposed change.
3. Agent polls GET /api/agent/v1/proposals/{requestId} and obtains a
   short-lived approval token only after administrator approval.
4. Agent sends POST /api/agent/v1/posts with the original content patch,
   If-None-Match: *, same UUIDv4 key and X-Agent-Approval.
   HTTP 201 confirms exactly one unpublished draft was created.
   The same request key cannot create a second article.
5. The created row has published=false, revision 1 and immutable history with
   the actor, request and approval. Drafts are excluded from public pages,
   feeds and sitemap until separately published.

Any published or publishedAt field supplied by the agent is rejected, even
published=false. The public publication workflow remains a separate action
requiring its own explicit administrator review.

## Migration and rollout

The additive migration 20261016214500_agent-draft-creation allows the
zero expected revision ONLY for new, reviewed draft-creation proposals.
It follows the migrations in the PR #35 dependency branch. Do not merge
or deploy this increment before its base PR and a separate schema-first
release are complete. No production DB write, API key configuration, Ops
connector, merge, or live content mutation is authorized by this PR.
