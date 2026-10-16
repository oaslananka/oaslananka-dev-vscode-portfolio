-- Separate migration because the preceding agent-write migration has already
-- been applied and journaled on a dedicated Neon Preview branch.
ALTER TABLE "agent_write_requests" ADD COLUMN "approval_id" text NOT NULL;
