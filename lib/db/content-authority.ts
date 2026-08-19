export const authorityProfileRefresh = {
  heroDescription:
    'I build connected physical systems across sensing, embedded software, edge AI and secure backend services, with verification and operating constraints visible from the start.',
  bio: [
    'I am a software and embedded systems engineer working across physical sensing, edge devices, backend services and engineering tools. My civil and structural engineering background helps me connect sensor data and software behavior to the physical systems being monitored.',
    'Over a decade building connected and embedded systems, including recent edge-AI and computer-vision products. I am strongest where hardware constraints, device software, cloud integration and operational ownership meet.',
    'My open-source work applies the same discipline to AI-assisted engineering: automation can inspect, propose and execute bounded operations, while native validators and qualified reviewers remain responsible for engineering approval.',
  ],
  writing: [
    {
      label: 'Designing Safe AI-Assisted KiCad Workflows',
      url: 'https://www.oaslananka.dev/articles/safe-ai-assisted-kicad-workflows',
    },
    {
      label: 'From Detection to Control: An Edge Vision Tracking Pipeline',
      url: 'https://www.oaslananka.dev/articles/edge-vision-tracking-control-pipeline',
    },
    {
      label: 'Designing a Cross-Language Sensor Driver Family',
      url: 'https://www.oaslananka.dev/articles/cross-language-sensor-driver-design',
    },
    {
      label: 'Building an AI-Ready MCP Server for KiCad',
      url: 'https://www.oaslananka.dev/articles/ai-ready-mcp-server-for-kicad',
    },
    {
      label: 'Production-First Edge AI: Lessons from the Field',
      url: 'https://www.oaslananka.dev/articles/production-first-edge-ai',
    },
  ],
} as const;

export const authoritySettingsRefresh = {
  siteDescription:
    'Osman Aslan designs production-focused edge AI, embedded, computer-vision and device-to-cloud systems, plus safe AI-assisted engineering tools.',
  keywords: [
    'Osman Aslan',
    'edge ai engineer',
    'computer vision engineer',
    'embedded systems engineer',
    'iot systems',
    'device to cloud',
    'AI-assisted EDA',
    'Model Context Protocol',
    'KiCad automation',
    'sensor driver development',
    'structural health monitoring',
    'earthquake early warning',
  ],
} as const;

export const projectAuthoritySections: Readonly<Record<string, string>> = {
  'sismo-smart': `## Evidence you can inspect

- This case study documents the public sensor-to-alert architecture, technical ownership and verification boundary without exposing private deployments.
- [Production-First Edge AI](/articles/production-first-edge-ai) explains the device health, buffering, observability and recovery principles applied to connected physical systems.
- The [ADXL355 Driver Family](/projects/adxl355) demonstrates the repeatable sensor-semantics and test-boundary work that supports reliable sensing software.

## Engineering trade-offs

A public case study can explain architecture and engineering discipline without publishing customer environments or unsupported performance metrics. That reduces external reproducibility compared with an open-source repository, so the page states exactly which claims remain private or unverified instead of treating commercial confidentiality as evidence.`,

  'kicad-mcp-pro': `## Evidence you can inspect

- [Source repository](https://github.com/oaslananka/kicad-mcp-pro) with the server, desktop surface, tests and release workflow.
- [Product documentation](https://oaslananka.github.io/kicad-mcp-pro/) covering installation, client setup, capabilities and engineering boundaries.
- [Published PyPI package](https://pypi.org/project/kicad-mcp-pro/) for the installable Python distribution.
- [Designing Safe AI-Assisted KiCad Workflows](/articles/safe-ai-assisted-kicad-workflows) for the quality-gate architecture behind the tool surface.

## Engineering trade-offs

Typed, bounded tools are less flexible than unrestricted script execution, but they make intent, validation and side effects reviewable. Native ERC and DRC provide stronger evidence than model-generated claims, while still leaving SI, PI, EMC, thermal and manufacturing sign-off with qualified engineering workflows.`,

  'sky-track-vision': `## Evidence you can inspect

- [Source repository](https://github.com/oaslananka/sky-track-vision-dev) with the modular perception, tracking, control, agent and evaluation packages.
- The recorded simulation in this case study shows the current AirSim workflow without claiming physical-flight validation.
- [From Detection to Control](/articles/edge-vision-tracking-control-pipeline) explains why probabilistic perception and mission planning remain outside the deterministic control and safety loop.

## Engineering trade-offs

Keeping AirSim at the I/O boundary improves deterministic testing and contributor access, but simulation cannot establish real-world aerodynamic, timing or safety performance. The architecture is intentionally useful for research and integration learning while keeping those unverified claims explicit.`,

  adxl355: `## Evidence you can inspect

- [Source repository](https://github.com/oaslananka/adxl355) containing the shared device model and language-specific packages.
- The architecture diagram on this page shows how one register specification and common vectors feed six runtime surfaces.
- [Designing a Cross-Language Sensor Driver Family](/articles/cross-language-sensor-driver-design) documents the transport boundary, signed decoding and verification strategy.

## Engineering trade-offs

A shared semantic contract reduces protocol drift, but each language still needs an idiomatic public API and its own package tooling. Golden vectors can verify decoding and register behavior without hardware; electrical timing, bus integrity and calibration still require device-level validation.`,

  'kicad-studio-kit': `## Evidence you can inspect

- [Source repository](https://github.com/oaslananka/kicad-studio-kit) for extension code, fixtures and release automation.
- Public listings on the [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=oaslananka.kicadstudiokit) and [Open VSX](https://open-vsx.org/extension/oaslananka/kicadstudiokit).
- The separate [KiCad MCP Pro case study](/projects/kicad-mcp-pro) documents the server-side automation and validation boundary.

## Engineering trade-offs

Keeping the editor extension and MCP server in separate repositories adds compatibility work, but prevents UI concerns, server packaging and privileged engineering operations from collapsing into one release surface.`,

  'easyeda-mcp-pro': `## Evidence you can inspect

- [Source repository](https://github.com/oaslananka/easyeda-mcp-pro) for the MCP server, local bridge and capability gates.
- [Published npm package](https://www.npmjs.com/package/easyeda-mcp-pro) for the distributable server.
- [Designing Safe AI-Assisted KiCad Workflows](/articles/safe-ai-assisted-kicad-workflows) describes the same inspect-first and evidence-first principles applied across EDA tools.

## Engineering trade-offs

A local runtime bridge exposes useful application context, but it also increases the importance of scope gates, explicit confirmation and honest capability reporting. Raw execution remains more powerful than typed operations and therefore stays behind stronger experimental controls.`,

  'iot-cloud-monitor': `## Evidence you can inspect

- [Source repository](https://github.com/oaslananka/iot-cloud-monitor) for the API, ownership rules, tests and example infrastructure files.
- [Production-First Edge AI](/articles/production-first-edge-ai) explains the wider device-to-cloud reliability principles that this backend boundary supports.
- The architecture diagram on this page identifies the verified REST and MongoDB scope without implying unimplemented MQTT, alerting or dashboard features.

## Engineering trade-offs

A narrow, tested backend is more credible than a broad product claim. The repository demonstrates authentication, ownership and telemetry persistence, while deliberately leaving deployment automation and ingestion features as visible future work rather than undocumented assumptions.`,
} as const;

export const articleAuthoritySections: Readonly<Record<string, string>> = {
  'ai-ready-mcp-server-for-kicad': `## Applied evidence and related work

The [KiCad MCP Pro case study](/projects/kicad-mcp-pro) connects this architecture to the source repository, documentation, package and reviewable product surfaces. [Designing Safe AI-Assisted KiCad Workflows](/articles/safe-ai-assisted-kicad-workflows) goes deeper on bounded writes, native validation and manufacturing evidence.

The practical test is not whether an agent can call many tools. It is whether another engineer can inspect the selected project, requested operation, changed artifacts and native validation results without relying on the conversation that produced them.`,

  'production-first-edge-ai': `## A field-readiness checklist

Before describing an edge-AI system as production-ready, I look for evidence across the complete operating chain:

- Defined behavior for power loss, network loss, clock drift and partial data.
- Local buffering with replay-safe identifiers and bounded storage.
- Device health, model/version identity and sensor-quality telemetry.
- Reproducible deployment, rollback and remote-diagnostic paths.
- Explicit thresholds for degraded operation and human intervention.
- Tests that separate model quality from transport, storage and operational failures.

## Applied evidence and related work

[SkyTrackVision](/projects/sky-track-vision) demonstrates the separation between probabilistic perception, deterministic control and safety in simulation. The [ADXL355 driver family](/projects/adxl355) focuses on repeatable sensor semantics across runtimes, while [IoT Cloud Monitor API](/projects/iot-cloud-monitor) documents a deliberately bounded authenticated telemetry service.

None of those projects alone proves a complete field deployment. Together they show the interfaces, tests and honest scope statements I expect before stronger operational claims are made.`,

  'safe-ai-assisted-kicad-workflows': `## Applied evidence and related work

The [KiCad MCP Pro case study](/projects/kicad-mcp-pro) links this workflow to the public source, documentation, package and visual release evidence. [Building an AI-Ready MCP Server for KiCad](/articles/ai-ready-mcp-server-for-kicad) explains the protocol and tool-surface decisions behind it.

A useful quality gate should preserve the original ERC, DRC and export artifacts, identify the exact project revision and make unresolved assumptions visible. A prose success message is not equivalent evidence.`,

  'edge-vision-tracking-control-pipeline': `## Applied evidence and related work

The [SkyTrackVision case study](/projects/sky-track-vision) provides the source repository and recorded AirSim workflow for this architecture. [Production-First Edge AI](/articles/production-first-edge-ai) expands the operational checklist beyond the model and controller.

The next validation steps for a physical platform would include calibrated end-to-end latency, hardware-in-the-loop tests, sensor and actuator fault injection, environmental testing and an independent emergency-stop path. Those are requirements for a stronger claim, not results implied by the simulation.`,

  'cross-language-sensor-driver-design': `## Applied evidence and related work

The [ADXL355 Driver Family case study](/projects/adxl355) links the architecture to the public multi-language repository and shared diagram. [Production-First Edge AI](/articles/production-first-edge-ai) places reliable sensor semantics inside the wider device-to-cloud operating chain.

Golden vectors and mock transports are strong evidence for protocol interpretation. They do not replace oscilloscope-level timing checks, electrical validation, device calibration or long-duration tests on representative hardware.`,
} as const;
