-- Existing projects remain public. Newly created agent projects are created
-- unpublished and must pass an independent publication approval to go live.
ALTER TABLE "projects" ADD COLUMN "published" boolean DEFAULT true NOT NULL;
