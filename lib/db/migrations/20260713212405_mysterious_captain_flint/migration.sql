ALTER TABLE "contact_messages" ADD COLUMN "inquiry_type" text DEFAULT 'other' NOT NULL;--> statement-breakpoint
ALTER TABLE "contact_messages" ADD COLUMN "organization" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "contact_messages" ADD COLUMN "notification_status" text DEFAULT 'disabled' NOT NULL;--> statement-breakpoint
ALTER TABLE "contact_messages" ADD COLUMN "notification_provider_id" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "contact_messages" ADD COLUMN "notification_attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "contact_messages" ADD COLUMN "notification_last_error" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "contact_messages" ADD COLUMN "notification_last_attempt_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "contact_messages" ADD COLUMN "retention_expires_at" timestamp with time zone DEFAULT now() + interval '12 months' NOT NULL;--> statement-breakpoint
UPDATE "contact_messages"
SET "retention_expires_at" = "created_at" + interval '12 months';--> statement-breakpoint
CREATE INDEX "contact_messages_retention_expires_at_idx" ON "contact_messages" USING btree ("retention_expires_at");--> statement-breakpoint
DELETE FROM "login_attempts";--> statement-breakpoint
CREATE INDEX "login_attempts_identity_created_at_idx" ON "login_attempts" USING btree ("ip","created_at");--> statement-breakpoint
INSERT INTO "profile" (
	"id", "name", "role", "tagline", "greeting", "hero_description",
	"location", "email", "avatar_url", "resume_url", "available_for_work",
	"bio", "socials", "skills", "experience", "writing", "updated_at"
)
SELECT
	1, "name", "role", "tagline", "greeting", "hero_description",
	"location", "email", "avatar_url", "resume_url", "available_for_work",
	"bio", "socials", "skills", "experience", "writing", "updated_at"
FROM "profile"
ORDER BY "updated_at" DESC, "id" DESC
LIMIT 1
ON CONFLICT ("id") DO UPDATE SET
	"name" = EXCLUDED."name",
	"role" = EXCLUDED."role",
	"tagline" = EXCLUDED."tagline",
	"greeting" = EXCLUDED."greeting",
	"hero_description" = EXCLUDED."hero_description",
	"location" = EXCLUDED."location",
	"email" = EXCLUDED."email",
	"avatar_url" = EXCLUDED."avatar_url",
	"resume_url" = EXCLUDED."resume_url",
	"available_for_work" = EXCLUDED."available_for_work",
	"bio" = EXCLUDED."bio",
	"socials" = EXCLUDED."socials",
	"skills" = EXCLUDED."skills",
	"experience" = EXCLUDED."experience",
	"writing" = EXCLUDED."writing",
	"updated_at" = EXCLUDED."updated_at";--> statement-breakpoint
DELETE FROM "profile" WHERE "id" <> 1;--> statement-breakpoint
INSERT INTO "site_settings" (
	"id", "site_title", "site_description", "keywords", "default_theme",
	"og_heading", "updated_at"
)
SELECT
	1, "site_title", "site_description", "keywords", "default_theme",
	"og_heading", "updated_at"
FROM "site_settings"
ORDER BY "updated_at" DESC, "id" DESC
LIMIT 1
ON CONFLICT ("id") DO UPDATE SET
	"site_title" = EXCLUDED."site_title",
	"site_description" = EXCLUDED."site_description",
	"keywords" = EXCLUDED."keywords",
	"default_theme" = EXCLUDED."default_theme",
	"og_heading" = EXCLUDED."og_heading",
	"updated_at" = EXCLUDED."updated_at";--> statement-breakpoint
DELETE FROM "site_settings" WHERE "id" <> 1;
