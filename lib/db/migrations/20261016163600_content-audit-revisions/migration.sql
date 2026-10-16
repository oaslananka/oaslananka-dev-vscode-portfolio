CREATE TABLE "content_changes" (
	"id" serial PRIMARY KEY,
	"entity_type" text NOT NULL,
	"entity_id" integer NOT NULL,
	"revision" integer NOT NULL,
	"operation" text NOT NULL,
	"before" jsonb,
	"after" jsonb,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "content_changes_entity_check" CHECK ("entity_type" in ('profile', 'site_settings', 'projects', 'posts')),
	CONSTRAINT "content_changes_operation_check" CHECK ("operation" in ('insert', 'update', 'delete'))
);
--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "revision" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "revision" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "revision" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "revision" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
CREATE INDEX "content_changes_lookup_idx" ON "content_changes" ("entity_type","entity_id","revision");--> statement-breakpoint
-- Keep a baseline snapshot for preexisting content before enabling the row triggers.
INSERT INTO content_changes (entity_type, entity_id, revision, operation, after)
SELECT entity_type, entity_id, revision, 'insert', row_content
FROM (
  SELECT 'profile' AS entity_type, id AS entity_id, revision, to_jsonb(profile) AS row_content FROM profile
  UNION ALL
  SELECT 'site_settings', id, revision, to_jsonb(site_settings) FROM site_settings
  UNION ALL
  SELECT 'projects', id, revision, to_jsonb(projects) FROM projects
  UNION ALL
  SELECT 'posts', id, revision, to_jsonb(posts) FROM posts
) AS initial_rows;
--> statement-breakpoint
-- Revision numbers are assigned exclusively by the database, even for admin writes.
CREATE FUNCTION content_revision_before_write() RETURNS trigger
LANGUAGE plpgsql AS $content_revision$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.revision := 1;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.revision = 2147483647 THEN
      RAISE EXCEPTION 'Content revision overflow' USING ERRCODE = '22003';
    END IF;
    NEW.revision := OLD.revision + 1;
  END IF;
  RETURN NEW;
END;
$content_revision$;
--> statement-breakpoint
-- History insertion is in the SAME PostgreSQL transaction as the mutation.
CREATE FUNCTION content_revision_log_write() RETURNS trigger
LANGUAGE plpgsql AS $content_audit$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO content_changes(entity_type, entity_id, revision, operation, before, after)
    VALUES (TG_TABLE_NAME, NEW.id, NEW.revision, lower(TG_OP), NULL, to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO content_changes(entity_type, entity_id, revision, operation, before, after)
    VALUES (TG_TABLE_NAME, NEW.id, NEW.revision, lower(TG_OP), to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSE
    INSERT INTO content_changes(entity_type, entity_id, revision, operation, before, after)
    VALUES (TG_TABLE_NAME, OLD.id, OLD.revision + 1, lower(TG_OP), to_jsonb(OLD), NULL);
    RETURN OLD;
  END IF;
END;
$content_audit$;
--> statement-breakpoint
-- Reject update/delete of audit records from ordinary DML (not a backup mechanism).
CREATE FUNCTION content_revision_protect_history() RETURNS trigger
LANGUAGE plpgsql AS $content_history$
BEGIN
  RAISE EXCEPTION 'Content history is append-only' USING ERRCODE = '23514';
END;
$content_history$;
--> statement-breakpoint
CREATE TRIGGER content_changes_append_only BEFORE UPDATE OR DELETE ON content_changes
FOR EACH ROW EXECUTE FUNCTION content_revision_protect_history();
--> statement-breakpoint
CREATE TRIGGER content_changes_no_truncate BEFORE TRUNCATE ON content_changes
FOR EACH STATEMENT EXECUTE FUNCTION content_revision_protect_history();
--> statement-breakpoint
CREATE TRIGGER profile_content_revision_before BEFORE INSERT OR UPDATE ON profile
FOR EACH ROW EXECUTE FUNCTION content_revision_before_write();
--> statement-breakpoint
CREATE TRIGGER profile_content_revision_log AFTER INSERT OR UPDATE OR DELETE ON profile
FOR EACH ROW EXECUTE FUNCTION content_revision_log_write();
--> statement-breakpoint
CREATE TRIGGER settings_content_revision_before BEFORE INSERT OR UPDATE ON site_settings
FOR EACH ROW EXECUTE FUNCTION content_revision_before_write();
--> statement-breakpoint
CREATE TRIGGER settings_content_revision_log AFTER INSERT OR UPDATE OR DELETE ON site_settings
FOR EACH ROW EXECUTE FUNCTION content_revision_log_write();
--> statement-breakpoint
CREATE TRIGGER projects_content_revision_before BEFORE INSERT OR UPDATE ON projects
FOR EACH ROW EXECUTE FUNCTION content_revision_before_write();
--> statement-breakpoint
CREATE TRIGGER projects_content_revision_log AFTER INSERT OR UPDATE OR DELETE ON projects
FOR EACH ROW EXECUTE FUNCTION content_revision_log_write();
--> statement-breakpoint
CREATE TRIGGER posts_content_revision_before BEFORE INSERT OR UPDATE ON posts
FOR EACH ROW EXECUTE FUNCTION content_revision_before_write();
--> statement-breakpoint
CREATE TRIGGER posts_content_revision_log AFTER INSERT OR UPDATE OR DELETE ON posts
FOR EACH ROW EXECUTE FUNCTION content_revision_log_write();
