ALTER TABLE "contact_messages" ADD CONSTRAINT "contact_messages_inquiry_type_check" CHECK ("contact_messages"."inquiry_type" in ('project', 'role', 'collaboration', 'other'));--> statement-breakpoint
ALTER TABLE "contact_messages" ADD CONSTRAINT "contact_messages_notification_status_check" CHECK ("contact_messages"."notification_status" in ('pending', 'sent', 'failed', 'disabled'));--> statement-breakpoint
ALTER TABLE "contact_messages" ADD CONSTRAINT "contact_messages_notification_attempts_check" CHECK ("contact_messages"."notification_attempts" between 0 and 1000);--> statement-breakpoint
ALTER TABLE "contact_messages" ADD CONSTRAINT "contact_messages_retention_window_check" CHECK ("contact_messages"."retention_expires_at" > "contact_messages"."created_at");--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_published_at_finite_check" CHECK (isfinite("posts"."published_at"));--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_tags_shape_check" CHECK (jsonb_typeof("posts"."tags") = 'array' and jsonb_array_length("posts"."tags") <= 20);--> statement-breakpoint
ALTER TABLE "profile" ADD CONSTRAINT "profile_singleton_id_check" CHECK ("profile"."id" = 1);--> statement-breakpoint
ALTER TABLE "profile" ADD CONSTRAINT "profile_bio_shape_check" CHECK (jsonb_typeof("profile"."bio") = 'array' and jsonb_array_length("profile"."bio") <= 12);--> statement-breakpoint
ALTER TABLE "profile" ADD CONSTRAINT "profile_socials_shape_check" CHECK (jsonb_typeof("profile"."socials") = 'array' and jsonb_array_length("profile"."socials") <= 20);--> statement-breakpoint
ALTER TABLE "profile" ADD CONSTRAINT "profile_skills_shape_check" CHECK (jsonb_typeof("profile"."skills") = 'array' and jsonb_array_length("profile"."skills") <= 20);--> statement-breakpoint
ALTER TABLE "profile" ADD CONSTRAINT "profile_experience_shape_check" CHECK (jsonb_typeof("profile"."experience") = 'array' and jsonb_array_length("profile"."experience") <= 30);--> statement-breakpoint
ALTER TABLE "profile" ADD CONSTRAINT "profile_writing_shape_check" CHECK (jsonb_typeof("profile"."writing") = 'array' and jsonb_array_length("profile"."writing") <= 30);--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_sort_order_check" CHECK ("projects"."sort_order" between -10000 and 10000);--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_tags_shape_check" CHECK (jsonb_typeof("projects"."tags") = 'array' and jsonb_array_length("projects"."tags") <= 20);--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_outcomes_shape_check" CHECK (jsonb_typeof("projects"."outcomes") = 'array' and jsonb_array_length("projects"."outcomes") <= 8);--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_media_shape_check" CHECK (jsonb_typeof("projects"."media") = 'array' and jsonb_array_length("projects"."media") <= 12);--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_links_shape_check" CHECK (jsonb_typeof("projects"."links") = 'array' and jsonb_array_length("projects"."links") <= 12);--> statement-breakpoint
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_singleton_id_check" CHECK ("site_settings"."id" = 1);--> statement-breakpoint
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_keywords_shape_check" CHECK (jsonb_typeof("site_settings"."keywords") = 'array' and jsonb_array_length("site_settings"."keywords") <= 20);--> statement-breakpoint
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_theme_check" CHECK ("site_settings"."default_theme" in ('github-dark', 'dracula', 'ayu-dark', 'ayu-mirage', 'nord', 'night-owl'));
