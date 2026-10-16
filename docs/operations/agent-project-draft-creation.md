# Agent-created unpublished project drafts (stacked on PR #36)

All existing portfolio projects retain their public status: the new projects.published
database column defaults to true. The additive migration is named
20261017002000_agent-project-publication.

New projects proposed by an agent must instead remain private.
The agent submits POST /api/agent/v1/proposals with resource
/api/agent/v1/projects and patch containing title, slug and description.
Creation requires a new UUIDv4 Idempotency-Key and If-None-Match: *.

1. The owner compares current versus proposed content in
   /admin/agent-approvals, then explicitly approves or rejects it.
2. Agent polls GET /api/agent/v1/proposals/{requestId}, receiving the
   short-lived signed approval only for an approved exact proposal.
3. Agent calls POST /api/agent/v1/projects with identical JSON, UUID,
   If-None-Match: * and X-Agent-Approval.
4. The content transaction creates exactly one record with published=false,
   featured=false, revision=1, and an actor-attributed immutable history.
   A retry cannot create duplicates; an existing slug causes conflict 409.

The admin project list shows both drafts and public projects, with an
explicit visibility badge. All public readers filter unpublished projects,
including detail pages, project lists, OpenGraph, Markdown, model discovery
and sitemaps. Admin editing preserves the existing publication state.

The agent cannot supply published or featured fields, including false.
Publication and unpublication need their own separately reviewed operation.
The existing manual admin project-creation behavior remains public by default.

## Release gate

This is a staged code change stacked on PR #36 and PR #35.
No production migration, release, merge, credentials or API connector was
authorized. Deploy only in schema-first order after separate authorization
of the real production connection and rollback plan.
