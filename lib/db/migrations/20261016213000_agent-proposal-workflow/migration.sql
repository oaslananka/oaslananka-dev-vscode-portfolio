-- Commands are proposals until an authenticated administrator approves them.
-- No automatic publishing and no access granted by mere proposal submission.
CREATE TABLE "agent_content_proposals" (
  "request_id" text PRIMARY KEY,
  "actor_id" text NOT NULL,
  "resource" text NOT NULL,
  "expected_revision" integer NOT NULL,
  "patch" jsonb NOT NULL,
  "fingerprint" text NOT NULL,
  "status" text NOT NULL DEFAULT 'pending',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "expires_at" timestamptz NOT NULL,
  "decided_at" timestamptz,
  CONSTRAINT "agent_proposal_revision_positive" CHECK (expected_revision > 0),
  CONSTRAINT "agent_proposal_fingerprint_length" CHECK (length(fingerprint) = 64),
  CONSTRAINT "agent_proposal_status_check" CHECK (status IN ('pending', 'approved', 'rejected')),
  CONSTRAINT "agent_proposal_json_object" CHECK (jsonb_typeof(patch) = 'object'),
  CONSTRAINT "agent_proposal_expiry" CHECK (expires_at > created_at)
);
--> statement-breakpoint
CREATE INDEX "agent_content_proposals_pending_idx"
ON "agent_content_proposals" ("status", "created_at" DESC);
