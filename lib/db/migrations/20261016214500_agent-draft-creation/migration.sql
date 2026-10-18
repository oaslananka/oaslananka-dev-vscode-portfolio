-- The zero revision is reserved for a new, unpublished article, never an
-- update. The existing positive revision precondition still applies to edits.
ALTER TABLE "agent_content_proposals"
  DROP CONSTRAINT "agent_proposal_revision_positive";
--> statement-breakpoint
ALTER TABLE "agent_content_proposals"
  ADD CONSTRAINT "agent_proposal_revision_nonnegative"
  CHECK ("expected_revision" >= 0);
