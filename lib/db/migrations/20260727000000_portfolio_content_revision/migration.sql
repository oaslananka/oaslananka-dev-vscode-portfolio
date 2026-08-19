ALTER TABLE "profile" ADD COLUMN "education" jsonb DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE "profile" ADD CONSTRAINT "profile_education_shape_check" CHECK (jsonb_typeof("education") = 'array' and jsonb_array_length("education") <= 10);--> statement-breakpoint
ALTER TABLE "contact_messages" DROP CONSTRAINT "contact_messages_inquiry_type_check", ADD CONSTRAINT "contact_messages_inquiry_type_check" CHECK ("inquiry_type" in ('project', 'role', 'collaboration', 'other'));--> statement-breakpoint
ALTER TABLE "contact_messages" DROP CONSTRAINT "contact_messages_notification_status_check", ADD CONSTRAINT "contact_messages_notification_status_check" CHECK ("notification_status" in ('pending', 'sent', 'failed', 'disabled'));--> statement-breakpoint
ALTER TABLE "contact_messages" DROP CONSTRAINT "contact_messages_notification_attempts_check", ADD CONSTRAINT "contact_messages_notification_attempts_check" CHECK ("notification_attempts" between 0 and 1000);--> statement-breakpoint
ALTER TABLE "contact_messages" DROP CONSTRAINT "contact_messages_retention_window_check", ADD CONSTRAINT "contact_messages_retention_window_check" CHECK ("retention_expires_at" > "created_at");--> statement-breakpoint
ALTER TABLE "posts" DROP CONSTRAINT "posts_published_at_finite_check", ADD CONSTRAINT "posts_published_at_finite_check" CHECK (isfinite("published_at"));--> statement-breakpoint
ALTER TABLE "posts" DROP CONSTRAINT "posts_tags_shape_check", ADD CONSTRAINT "posts_tags_shape_check" CHECK (jsonb_typeof("tags") = 'array' and jsonb_array_length("tags") <= 20);--> statement-breakpoint
ALTER TABLE "profile" DROP CONSTRAINT "profile_singleton_id_check", ADD CONSTRAINT "profile_singleton_id_check" CHECK ("id" = 1);--> statement-breakpoint
ALTER TABLE "profile" DROP CONSTRAINT "profile_bio_shape_check", ADD CONSTRAINT "profile_bio_shape_check" CHECK (jsonb_typeof("bio") = 'array' and jsonb_array_length("bio") <= 12);--> statement-breakpoint
ALTER TABLE "profile" DROP CONSTRAINT "profile_socials_shape_check", ADD CONSTRAINT "profile_socials_shape_check" CHECK (jsonb_typeof("socials") = 'array' and jsonb_array_length("socials") <= 20);--> statement-breakpoint
ALTER TABLE "profile" DROP CONSTRAINT "profile_skills_shape_check", ADD CONSTRAINT "profile_skills_shape_check" CHECK (jsonb_typeof("skills") = 'array' and jsonb_array_length("skills") <= 20);--> statement-breakpoint
ALTER TABLE "profile" DROP CONSTRAINT "profile_experience_shape_check", ADD CONSTRAINT "profile_experience_shape_check" CHECK (jsonb_typeof("experience") = 'array' and jsonb_array_length("experience") <= 30);--> statement-breakpoint
ALTER TABLE "profile" DROP CONSTRAINT "profile_writing_shape_check", ADD CONSTRAINT "profile_writing_shape_check" CHECK (jsonb_typeof("writing") = 'array' and jsonb_array_length("writing") <= 30);--> statement-breakpoint
ALTER TABLE "projects" DROP CONSTRAINT "projects_sort_order_check", ADD CONSTRAINT "projects_sort_order_check" CHECK ("sort_order" between -10000 and 10000);--> statement-breakpoint
ALTER TABLE "projects" DROP CONSTRAINT "projects_tags_shape_check", ADD CONSTRAINT "projects_tags_shape_check" CHECK (jsonb_typeof("tags") = 'array' and jsonb_array_length("tags") <= 20);--> statement-breakpoint
ALTER TABLE "projects" DROP CONSTRAINT "projects_outcomes_shape_check", ADD CONSTRAINT "projects_outcomes_shape_check" CHECK (jsonb_typeof("outcomes") = 'array' and jsonb_array_length("outcomes") <= 8);--> statement-breakpoint
ALTER TABLE "projects" DROP CONSTRAINT "projects_media_shape_check", ADD CONSTRAINT "projects_media_shape_check" CHECK (jsonb_typeof("media") = 'array' and jsonb_array_length("media") <= 12);--> statement-breakpoint
ALTER TABLE "projects" DROP CONSTRAINT "projects_links_shape_check", ADD CONSTRAINT "projects_links_shape_check" CHECK (jsonb_typeof("links") = 'array' and jsonb_array_length("links") <= 12);--> statement-breakpoint
ALTER TABLE "site_settings" DROP CONSTRAINT "site_settings_singleton_id_check", ADD CONSTRAINT "site_settings_singleton_id_check" CHECK ("id" = 1);--> statement-breakpoint
ALTER TABLE "site_settings" DROP CONSTRAINT "site_settings_keywords_shape_check", ADD CONSTRAINT "site_settings_keywords_shape_check" CHECK (jsonb_typeof("keywords") = 'array' and jsonb_array_length("keywords") <= 20);--> statement-breakpoint
ALTER TABLE "site_settings" DROP CONSTRAINT "site_settings_theme_check", ADD CONSTRAINT "site_settings_theme_check" CHECK ("default_theme" in ('github-dark', 'dracula', 'ayu-dark', 'ayu-mirage', 'nord', 'night-owl'));

UPDATE "profile"
SET
  "hero_description" = $portfolio$I build connected physical systems across sensing, embedded software, edge AI and secure backend services, with verification and operating constraints visible from the start.$portfolio$,
  "bio" = $portfolio$["I am a software and embedded systems engineer working across physical sensing, edge devices, backend services and engineering tools. My civil and structural engineering background helps me connect sensor data and software behavior to the physical systems being monitored.","Over a decade building connected and embedded systems, including recent edge-AI and computer-vision products. I am strongest where hardware constraints, device software, cloud integration and operational ownership meet.","My open-source work applies the same discipline to AI-assisted engineering: automation can inspect, propose and execute bounded operations, while native validators and qualified reviewers remain responsible for engineering approval."]$portfolio$::jsonb,
  "socials" = $portfolio$[{"platform":"github","label":"GitHub","url":"https://github.com/oaslananka"},{"platform":"linkedin","label":"LinkedIn","url":"https://www.linkedin.com/in/oaslananka"},{"platform":"pypi","label":"PyPI","url":"https://pypi.org/user/oaslananka/"},{"platform":"npm","label":"npm","url":"https://www.npmjs.com/~oaslananka"},{"platform":"peerlist","label":"Peerlist","url":"https://peerlist.io/oaslananka"}]$portfolio$::jsonb,
  "experience" = $portfolio$[{"role":"Founder & Lead Engineer","company":"Sismo Smart","period":"2025 — Present","description":"Earthquake early warning and structural health monitoring","points":["Lead the sensor-to-alert product architecture across embedded hardware, edge processing, secure telemetry and backend services","Design compact sensing hardware and PCB revisions around power, connectivity and field-service constraints","Build observable device-to-cloud paths with health signals, bounded buffering and deployment diagnostics","Develop and evaluate signal-processing and ML workflows without presenting unverified field performance as a public claim"]},{"role":"Head of Hardware","company":"Confidential renewable-energy startup","period":"2024 — 2025","description":"Wind-turbine blade health monitoring via acoustic sensing and AI","points":["Led hardware and embedded development for an acoustic monitoring device","Managed a distributed hardware team, vendors and prototype delivery","Designed an ESP32-based device with connectivity, power-management and serviceability requirements"]},{"role":"Software & Embedded Systems Engineer","company":"","period":"2022 — 2024","description":"Earthquake early-warning platform · IoT, real-time, ML","points":["Designed an end-to-end earthquake early-warning and emergency-response automation platform","Built custom Raspberry Pi hardware with high-precision accelerometers and STA/LTA P-wave detection","Delivered a real-time backend with Django REST, WebSockets and PostgreSQL / TimescaleDB","Shipped a multi-channel alerting system and an Android app for device management"]},{"role":"Independent Software Engineer","company":"","period":"2012 — 2022","description":"Connected systems · Embedded software · Cloud / DevOps — remote, international","points":["Delivered connected, embedded and cloud systems for international clients, with later work extending into edge AI and computer vision","Owned the full chain: MCU and embedded firmware → Linux gateway → cloud ingestion → dashboards and runbooks","Built real-time video analytics, model-training and edge-deployment workflows using ONNX and TF Lite on representative edge hardware","Created driver, parser and calibration libraries with tests and field-debug tooling when off-the-shelf components were insufficient"]}]$portfolio$::jsonb,
  "education" = $portfolio$[{"institution":"Ege University","qualification":"M.Sc., Civil & Structural Engineering","details":"Thesis: A Big Data– and AI-Driven Embedded Systems Framework for Structural Health Monitoring"},{"institution":"Ege University","qualification":"B.Eng., Civil & Structural Engineering","details":""},{"institution":"Middle East Technical University","qualification":"B.Ed., Elementary Science Education","details":""}]$portfolio$::jsonb,
  "updated_at" = now()
WHERE "id" = 1;

INSERT INTO "projects" (
  "slug", "title", "description", "long_description", "role",
  "logo", "cover_image", "cover_image_alt", "link", "repo",
  "tags", "outcomes", "media", "links", "featured", "sort_order",
  "updated_at"
)
VALUES (
  $portfolio$sismo-smart$portfolio$,
  $portfolio$Sismo Smart$portfolio$,
  $portfolio$A privacy-safe case study of an earthquake early-warning and structural-health-monitoring platform spanning sensing hardware, edge processing, secure telemetry and operator alerts.$portfolio$,
  $portfolio$## The engineering problem

Earthquake early warning and structural health monitoring depend on a complete physical-to-digital chain. Sensor quality, timing, device health, connectivity and alert delivery all affect whether a signal can become useful operational information. The engineering problem is therefore wider than a classifier or dashboard: the system must preserve trustworthy measurements, make degraded behavior visible and keep safety-sensitive claims inside the evidence actually available.

## My role

As Founder & Lead Engineer, I lead the system architecture across sensing hardware, embedded and edge software, secure device-to-cloud communication, backend services and operational diagnostics. I connect structural-engineering interpretation with the software boundaries needed to test, deploy and support the product.

## System boundary

The public architecture is sensor → edge device → secure backend → operator alert. Devices acquire and qualify measurements, retain bounded data when connectivity is unavailable and report health alongside telemetry. Backend services authenticate devices, ingest events, preserve traceability and expose information to alerting and operator workflows. Exact hardware revisions, customer environments and deployment topology remain confidential.

## Reliability and validation

The engineering approach separates signal-processing experiments, deterministic software checks, hardware validation and field evidence. Recorded inputs and simulators support repeatable software tests; device diagnostics expose power, connectivity, clock and sensor state; release work includes configuration contracts, update paths and recovery procedures. A passing test or model result is not presented as a safety certification.

## Public evidence boundary

This case study explains architecture, ownership and verification discipline. It does not publish customer names, deployment quantities, private datasets, commercial terms, detection accuracy, alert latency or certification claims. Those limits are intentional: public content should not imply evidence that cannot be independently inspected.

## Outcome

Sismo Smart connects my civil and structural engineering background with embedded systems, device-to-cloud software and recent edge-AI work. The public value of the case study is the complete system boundary and the discipline used to keep operational claims reviewable.

## Evidence you can inspect

- This case study documents the public sensor-to-alert architecture, technical ownership and verification boundary without exposing private deployments.
- [Production-First Edge AI](/articles/production-first-edge-ai) explains the device health, buffering, observability and recovery principles applied to connected physical systems.
- The [ADXL355 Driver Family](/projects/adxl355) demonstrates the repeatable sensor-semantics and test-boundary work that supports reliable sensing software.

## Engineering trade-offs

A public case study can explain architecture and engineering discipline without publishing customer environments or unsupported performance metrics. That reduces external reproducibility compared with an open-source repository, so the page states exactly which claims remain private or unverified instead of treating commercial confidentiality as evidence.$portfolio$,
  $portfolio$Founder & Lead Engineer$portfolio$,
  $portfolio$$portfolio$,
  $portfolio$$portfolio$,
  $portfolio$$portfolio$,
  $portfolio$$portfolio$,
  $portfolio$$portfolio$,
  $portfolio$["Embedded Systems","IoT","Structural Health Monitoring","Edge AI"]$portfolio$::jsonb,
  $portfolio$["Sensor-to-alert architecture across embedded devices, edge processing and backend services","Operational design for bounded offline buffering, device health and secure telemetry","Public evidence boundary that excludes customer, deployment and safety-performance claims"]$portfolio$::jsonb,
  $portfolio$[]$portfolio$::jsonb,
  $portfolio$[]$portfolio$::jsonb,
  true,
  -1,
  now()
)
ON CONFLICT ("slug") DO UPDATE SET
  "title" = EXCLUDED."title",
  "description" = EXCLUDED."description",
  "long_description" = EXCLUDED."long_description",
  "role" = EXCLUDED."role",
  "logo" = EXCLUDED."logo",
  "cover_image" = EXCLUDED."cover_image",
  "cover_image_alt" = EXCLUDED."cover_image_alt",
  "link" = EXCLUDED."link",
  "repo" = EXCLUDED."repo",
  "tags" = EXCLUDED."tags",
  "outcomes" = EXCLUDED."outcomes",
  "media" = EXCLUDED."media",
  "links" = EXCLUDED."links",
  "featured" = EXCLUDED."featured",
  "sort_order" = EXCLUDED."sort_order",
  "updated_at" = now();

UPDATE "posts"
SET
  "excerpt" = $portfolio$Building connected and embedded systems, including recent edge-AI products, taught me that the model is the easy part. Here is what makes field deployments survive.$portfolio$,
  "updated_at" = now()
WHERE "slug" = $portfolio$production-first-edge-ai$portfolio$;
