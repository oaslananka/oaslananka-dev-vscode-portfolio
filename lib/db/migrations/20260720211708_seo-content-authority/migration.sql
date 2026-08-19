-- Refresh canonical portfolio content with evidence-driven case-study and article context.
-- Content is intentionally limited to verifiable repositories, packages, documentation and explicit engineering boundaries.
--> statement-breakpoint
UPDATE "profile"
SET "hero_description" = $authority$I design and ship production-focused edge AI, embedded and device-to-cloud systems — from sensor interfaces and on-device inference to secure backends, observability and release evidence.$authority$,
    "bio" = $authority$["I am a software and embedded systems engineer focused on edge AI, computer vision, IoT and engineering tools. I work across the full system boundary: sensors and firmware, Linux gateways, backend services, cloud ingestion and operator-facing diagnostics.","My engineering approach is production-first. I design for intermittent connectivity, bounded failure modes, structured telemetry, repeatable tests and reviewable release artifacts — not only for a successful demonstration on a development machine.","I also build open-source tooling for AI-assisted electronics design. Those projects keep inspection, mutation, native validation and qualified human approval as separate steps, so automation accelerates engineering work without pretending to replace engineering judgement.","My background in civil and structural engineering is especially useful in structural health monitoring and earthquake early-warning systems: I interpret sensor streams as physical behavior, then connect that understanding to reliable embedded and cloud software."]$authority$::jsonb,
    "writing" = $authority$[{"label":"Designing Safe AI-Assisted KiCad Workflows","url":"https://www.oaslananka.dev/articles/safe-ai-assisted-kicad-workflows"},{"label":"From Detection to Control: An Edge Vision Tracking Pipeline","url":"https://www.oaslananka.dev/articles/edge-vision-tracking-control-pipeline"},{"label":"Designing a Cross-Language Sensor Driver Family","url":"https://www.oaslananka.dev/articles/cross-language-sensor-driver-design"},{"label":"Building an AI-Ready MCP Server for KiCad","url":"https://www.oaslananka.dev/articles/ai-ready-mcp-server-for-kicad"},{"label":"Production-First Edge AI: Lessons from the Field","url":"https://www.oaslananka.dev/articles/production-first-edge-ai"}]$authority$::jsonb,
    "updated_at" = now()
WHERE "id" = 1;
--> statement-breakpoint
UPDATE "site_settings"
SET "site_description" = $authority$Osman Aslan designs production-focused edge AI, embedded, computer-vision and device-to-cloud systems, plus safe AI-assisted engineering tools.$authority$,
    "keywords" = $authority$["Osman Aslan","edge ai engineer","computer vision engineer","embedded systems engineer","iot systems","device to cloud","AI-assisted EDA","Model Context Protocol","KiCad automation","sensor driver development","structural health monitoring","earthquake early warning"]$authority$::jsonb,
    "updated_at" = now()
WHERE "id" = 1;
--> statement-breakpoint
UPDATE "projects"
SET "long_description" = CASE
      WHEN position('## Evidence you can inspect' in "long_description") = 0
        THEN rtrim("long_description") || E'\n\n' || $authority$## Evidence you can inspect

- [Source repository](https://github.com/oaslananka/kicad-mcp-pro) with the server, desktop surface, tests and release workflow.
- [Product documentation](https://oaslananka.github.io/kicad-mcp-pro/) covering installation, client setup, capabilities and engineering boundaries.
- [Published PyPI package](https://pypi.org/project/kicad-mcp-pro/) for the installable Python distribution.
- [Designing Safe AI-Assisted KiCad Workflows](/articles/safe-ai-assisted-kicad-workflows) for the quality-gate architecture behind the tool surface.

## Engineering trade-offs

Typed, bounded tools are less flexible than unrestricted script execution, but they make intent, validation and side effects reviewable. Native ERC and DRC provide stronger evidence than model-generated claims, while still leaving SI, PI, EMC, thermal and manufacturing sign-off with qualified engineering workflows.$authority$
      ELSE "long_description"
    END,
    "updated_at" = now()
WHERE "slug" = $authority$kicad-mcp-pro$authority$;
--> statement-breakpoint
UPDATE "projects"
SET "long_description" = CASE
      WHEN position('## Evidence you can inspect' in "long_description") = 0
        THEN rtrim("long_description") || E'\n\n' || $authority$## Evidence you can inspect

- [Source repository](https://github.com/oaslananka/sky-track-vision-dev) with the modular perception, tracking, control, agent and evaluation packages.
- The recorded simulation in this case study shows the current AirSim workflow without claiming physical-flight validation.
- [From Detection to Control](/articles/edge-vision-tracking-control-pipeline) explains why probabilistic perception and mission planning remain outside the deterministic control and safety loop.

## Engineering trade-offs

Keeping AirSim at the I/O boundary improves deterministic testing and contributor access, but simulation cannot establish real-world aerodynamic, timing or safety performance. The architecture is intentionally useful for research and integration learning while keeping those unverified claims explicit.$authority$
      ELSE "long_description"
    END,
    "updated_at" = now()
WHERE "slug" = $authority$sky-track-vision$authority$;
--> statement-breakpoint
UPDATE "projects"
SET "long_description" = CASE
      WHEN position('## Evidence you can inspect' in "long_description") = 0
        THEN rtrim("long_description") || E'\n\n' || $authority$## Evidence you can inspect

- [Source repository](https://github.com/oaslananka/adxl355) containing the shared device model and language-specific packages.
- The architecture diagram on this page shows how one register specification and common vectors feed six runtime surfaces.
- [Designing a Cross-Language Sensor Driver Family](/articles/cross-language-sensor-driver-design) documents the transport boundary, signed decoding and verification strategy.

## Engineering trade-offs

A shared semantic contract reduces protocol drift, but each language still needs an idiomatic public API and its own package tooling. Golden vectors can verify decoding and register behavior without hardware; electrical timing, bus integrity and calibration still require device-level validation.$authority$
      ELSE "long_description"
    END,
    "updated_at" = now()
WHERE "slug" = $authority$adxl355$authority$;
--> statement-breakpoint
UPDATE "projects"
SET "long_description" = CASE
      WHEN position('## Evidence you can inspect' in "long_description") = 0
        THEN rtrim("long_description") || E'\n\n' || $authority$## Evidence you can inspect

- [Source repository](https://github.com/oaslananka/kicad-studio-kit) for extension code, fixtures and release automation.
- Public listings on the [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=oaslananka.kicadstudiokit) and [Open VSX](https://open-vsx.org/extension/oaslananka/kicadstudiokit).
- The separate [KiCad MCP Pro case study](/projects/kicad-mcp-pro) documents the server-side automation and validation boundary.

## Engineering trade-offs

Keeping the editor extension and MCP server in separate repositories adds compatibility work, but prevents UI concerns, server packaging and privileged engineering operations from collapsing into one release surface.$authority$
      ELSE "long_description"
    END,
    "updated_at" = now()
WHERE "slug" = $authority$kicad-studio-kit$authority$;
--> statement-breakpoint
UPDATE "projects"
SET "long_description" = CASE
      WHEN position('## Evidence you can inspect' in "long_description") = 0
        THEN rtrim("long_description") || E'\n\n' || $authority$## Evidence you can inspect

- [Source repository](https://github.com/oaslananka/easyeda-mcp-pro) for the MCP server, local bridge and capability gates.
- [Published npm package](https://www.npmjs.com/package/easyeda-mcp-pro) for the distributable server.
- [Designing Safe AI-Assisted KiCad Workflows](/articles/safe-ai-assisted-kicad-workflows) describes the same inspect-first and evidence-first principles applied across EDA tools.

## Engineering trade-offs

A local runtime bridge exposes useful application context, but it also increases the importance of scope gates, explicit confirmation and honest capability reporting. Raw execution remains more powerful than typed operations and therefore stays behind stronger experimental controls.$authority$
      ELSE "long_description"
    END,
    "updated_at" = now()
WHERE "slug" = $authority$easyeda-mcp-pro$authority$;
--> statement-breakpoint
UPDATE "projects"
SET "long_description" = CASE
      WHEN position('## Evidence you can inspect' in "long_description") = 0
        THEN rtrim("long_description") || E'\n\n' || $authority$## Evidence you can inspect

- [Source repository](https://github.com/oaslananka/iot-cloud-monitor) for the API, ownership rules, tests and example infrastructure files.
- [Production-First Edge AI](/articles/production-first-edge-ai) explains the wider device-to-cloud reliability principles that this backend boundary supports.
- The architecture diagram on this page identifies the verified REST and MongoDB scope without implying unimplemented MQTT, alerting or dashboard features.

## Engineering trade-offs

A narrow, tested backend is more credible than a broad product claim. The repository demonstrates authentication, ownership and telemetry persistence, while deliberately leaving deployment automation and ingestion features as visible future work rather than undocumented assumptions.$authority$
      ELSE "long_description"
    END,
    "updated_at" = now()
WHERE "slug" = $authority$iot-cloud-monitor$authority$;
--> statement-breakpoint
UPDATE "posts"
SET "body" = CASE
      WHEN position('## Applied evidence and related work' in "body") = 0
        THEN rtrim("body") || E'\n\n' || $authority$## Applied evidence and related work

The [KiCad MCP Pro case study](/projects/kicad-mcp-pro) connects this architecture to the source repository, documentation, package and reviewable product surfaces. [Designing Safe AI-Assisted KiCad Workflows](/articles/safe-ai-assisted-kicad-workflows) goes deeper on bounded writes, native validation and manufacturing evidence.

The practical test is not whether an agent can call many tools. It is whether another engineer can inspect the selected project, requested operation, changed artifacts and native validation results without relying on the conversation that produced them.$authority$
      ELSE "body"
    END,
    "updated_at" = now()
WHERE "slug" = $authority$ai-ready-mcp-server-for-kicad$authority$
  AND "published" = true;
--> statement-breakpoint
UPDATE "posts"
SET "body" = CASE
      WHEN position('## Applied evidence and related work' in "body") = 0
        THEN rtrim("body") || E'\n\n' || $authority$## A field-readiness checklist

Before describing an edge-AI system as production-ready, I look for evidence across the complete operating chain:

- Defined behavior for power loss, network loss, clock drift and partial data.
- Local buffering with replay-safe identifiers and bounded storage.
- Device health, model/version identity and sensor-quality telemetry.
- Reproducible deployment, rollback and remote-diagnostic paths.
- Explicit thresholds for degraded operation and human intervention.
- Tests that separate model quality from transport, storage and operational failures.

## Applied evidence and related work

[SkyTrackVision](/projects/sky-track-vision) demonstrates the separation between probabilistic perception, deterministic control and safety in simulation. The [ADXL355 driver family](/projects/adxl355) focuses on repeatable sensor semantics across runtimes, while [IoT Cloud Monitor API](/projects/iot-cloud-monitor) documents a deliberately bounded authenticated telemetry service.

None of those projects alone proves a complete field deployment. Together they show the interfaces, tests and honest scope statements I expect before stronger operational claims are made.$authority$
      ELSE "body"
    END,
    "updated_at" = now()
WHERE "slug" = $authority$production-first-edge-ai$authority$
  AND "published" = true;
--> statement-breakpoint
UPDATE "posts"
SET "body" = CASE
      WHEN position('## Applied evidence and related work' in "body") = 0
        THEN rtrim("body") || E'\n\n' || $authority$## Applied evidence and related work

The [KiCad MCP Pro case study](/projects/kicad-mcp-pro) links this workflow to the public source, documentation, package and visual release evidence. [Building an AI-Ready MCP Server for KiCad](/articles/ai-ready-mcp-server-for-kicad) explains the protocol and tool-surface decisions behind it.

A useful quality gate should preserve the original ERC, DRC and export artifacts, identify the exact project revision and make unresolved assumptions visible. A prose success message is not equivalent evidence.$authority$
      ELSE "body"
    END,
    "updated_at" = now()
WHERE "slug" = $authority$safe-ai-assisted-kicad-workflows$authority$
  AND "published" = true;
--> statement-breakpoint
UPDATE "posts"
SET "body" = CASE
      WHEN position('## Applied evidence and related work' in "body") = 0
        THEN rtrim("body") || E'\n\n' || $authority$## Applied evidence and related work

The [SkyTrackVision case study](/projects/sky-track-vision) provides the source repository and recorded AirSim workflow for this architecture. [Production-First Edge AI](/articles/production-first-edge-ai) expands the operational checklist beyond the model and controller.

The next validation steps for a physical platform would include calibrated end-to-end latency, hardware-in-the-loop tests, sensor and actuator fault injection, environmental testing and an independent emergency-stop path. Those are requirements for a stronger claim, not results implied by the simulation.$authority$
      ELSE "body"
    END,
    "updated_at" = now()
WHERE "slug" = $authority$edge-vision-tracking-control-pipeline$authority$
  AND "published" = true;
--> statement-breakpoint
UPDATE "posts"
SET "body" = CASE
      WHEN position('## Applied evidence and related work' in "body") = 0
        THEN rtrim("body") || E'\n\n' || $authority$## Applied evidence and related work

The [ADXL355 Driver Family case study](/projects/adxl355) links the architecture to the public multi-language repository and shared diagram. [Production-First Edge AI](/articles/production-first-edge-ai) places reliable sensor semantics inside the wider device-to-cloud operating chain.

Golden vectors and mock transports are strong evidence for protocol interpretation. They do not replace oscilloscope-level timing checks, electrical validation, device calibration or long-duration tests on representative hardware.$authority$
      ELSE "body"
    END,
    "updated_at" = now()
WHERE "slug" = $authority$cross-language-sensor-driver-design$authority$
  AND "published" = true;
