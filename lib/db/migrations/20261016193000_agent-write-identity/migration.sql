-- All existing admin writes remain attributed to NULL (unknown/legacy).
-- Agent attribution is applied only by a transaction-local context from the
-- independently authenticated write adapter.
ALTER TABLE "content_changes" ADD COLUMN "actor_id" text;
--> statement-breakpoint
ALTER TABLE "content_changes" ADD COLUMN "request_id" text;
--> statement-breakpoint
CREATE TABLE "agent_write_requests" (
  "request_id" text PRIMARY KEY,
  "actor_id" text NOT NULL,
  "resource" text NOT NULL,
  "payload_sha256" text NOT NULL,
  "completed_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "agent_write_actor_nonempty" CHECK (length(actor_id) BETWEEN 1 AND 128),
  CONSTRAINT "agent_write_resource_nonempty" CHECK (length(resource) BETWEEN 1 AND 320),
  CONSTRAINT "agent_write_digest_length" CHECK (length(payload_sha256) = 64)
);
--> statement-breakpoint
CREATE OR REPLACE FUNCTION content_revision_log_write() RETURNS trigger
LANGUAGE plpgsql AS $content_audit$
DECLARE
  active_actor text := nullif(current_setting('app.agent_actor', true), '');
  active_request text := nullif(current_setting('app.agent_request_id', true), '');
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO content_changes(entity_type, entity_id, revision, operation, before, after, actor_id, request_id)
    VALUES (TG_TABLE_NAME, NEW.id, NEW.revision, lower(TG_OP), NULL, to_jsonb(NEW), active_actor, active_request);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO content_changes(entity_type, entity_id, revision, operation, before, after, actor_id, request_id)
    VALUES (TG_TABLE_NAME, NEW.id, NEW.revision, lower(TG_OP), to_jsonb(OLD), to_jsonb(NEW), active_actor, active_request);
    RETURN NEW;
  ELSE
    INSERT INTO content_changes(entity_type, entity_id, revision, operation, before, after, actor_id, request_id)
    VALUES (TG_TABLE_NAME, OLD.id, OLD.revision + 1, lower(TG_OP), to_jsonb(OLD), NULL, active_actor, active_request);
    RETURN OLD;
  END IF;
END;
$content_audit$;
--> statement-breakpoint
CREATE TRIGGER agent_write_requests_append_only BEFORE UPDATE OR DELETE ON agent_write_requests
FOR EACH ROW EXECUTE FUNCTION content_revision_protect_history();
--> statement-breakpoint
CREATE TRIGGER agent_write_requests_no_truncate BEFORE TRUNCATE ON agent_write_requests
FOR EACH STATEMENT EXECUTE FUNCTION content_revision_protect_history();
