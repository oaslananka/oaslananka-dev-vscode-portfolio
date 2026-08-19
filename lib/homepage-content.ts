export interface HomepageEngineeringPrinciple {
  title: string;
  body: string;
  href: string;
  linkLabel: string;
}

export const HOMEPAGE_ENGINEERING_PRINCIPLES = [
  {
    title: 'Constraints before architecture',
    body:
      'I start with the limits the system must live inside: sensing quality, decision latency, compute and memory, power, connectivity, update paths and the people expected to operate it. Those constraints decide what stays on the device, what can move to a gateway or backend, and what must happen when a dependency disappears. Research assumptions and deployment assumptions remain separate, so a simulation result is not presented as field validation. The goal is a design whose timing, failure behavior and ownership can be reviewed before the stack becomes expensive to change. I also define time synchronization, calibration ownership and service access before implementation, so later optimizations cannot quietly change the operating contract.',
    href: '/articles/production-first-edge-ai',
    linkLabel: 'Read the production-first architecture guide',
  },
  {
    title: 'Evidence before claims',
    body:
      'A strong claim should point to something another engineer can inspect: tests, deterministic demos, protocol checks, native validators, build artifacts, migration rehearsals or operational diagnostics. When a measurement does not exist, I state the boundary instead of inventing a benchmark. Software checks, hardware validation and field evidence are named separately. KiCad MCP Pro applies this rule by keeping tool execution, ERC/DRC output, manufacturing exports and engineering approval as distinct gates. Each result names the input, environment and scope it covers, making review repeatable rather than dependent on a demo.',
    href: '/projects/kicad-mcp-pro',
    linkLabel: 'Inspect the KiCad MCP Pro evidence',
  },
  {
    title: 'Safe automation boundaries',
    body:
      'Automation should reduce mechanical work without hiding responsibility. My engineering tools expose the selected project, requested operation, changed artifacts and validation results so an operator can review what happened. Language models can organize intent and choose bounded tools; they do not replace electrical rules, control timing, sensor physics, security policy or qualified review. The same boundary keeps mission planning outside real-time control and prevents generated code from bypassing the tests required of handwritten changes. High-impact actions use narrow permissions and auditable outputs; when a safe precondition is missing, automation stops and returns the decision to an engineer.',
    href: '/articles/safe-ai-assisted-kicad-workflows',
    linkLabel: 'Read the safe automation pattern',
  },
] as const satisfies readonly HomepageEngineeringPrinciple[];

export interface HomepageDeliveryStage {
  order: string;
  title: string;
  body: string;
}

export const HOMEPAGE_DELIVERY_INTRO =
  'I move from prototype to release through reviewable stages. Each stage reduces a different uncertainty: whether the operating assumptions are possible, whether the boundaries integrate, whether failure is controlled, and whether another person can deploy and support the result. Evidence from one stage becomes the entry condition for the next instead of being discarded after a demo.';

export const HOMEPAGE_DELIVERY_STAGES = [
  {
    order: '01',
    title: 'Frame the operating system',
    body:
      'Define the physical source, latency target, compute location, power and thermal limits, connectivity assumptions, data ownership, security boundaries, update mechanism and service model. Record what is known, estimated or still experimental. Describe interfaces with units, timing, failure behavior and recovery, not only function names. This prevents an impressive model or dashboard from hiding an impossible device requirement. Set acceptance criteria for startup, steady state and degraded operation, then identify which assumptions need a bench test or hardware measurement.',
  },
  {
    order: '02',
    title: 'Build one observable vertical slice',
    body:
      'Build the smallest path that crosses the real system boundaries: one sensor input, one decision, one durable message and one observable backend result. Include structured logs, health information, explicit timeouts and representative test data immediately. Use fixtures, recorded inputs or protocol fakes for hardware-dependent pieces so integration mistakes can be reproduced before the complete lab or product exists. Keep configuration and protocol versions visible, and make the slice runnable from documented commands rather than private workstation state.',
  },
  {
    order: '03',
    title: 'Exercise failure and recovery',
    body:
      'Test network loss, duplicate or late messages, storage failure, implausible sensor values, low-confidence model output, process restarts and interrupted updates. Give each boundary an explicit response: reject, retry, buffer, degrade, stop safely, alert or request review. Exercise migrations, restart paths and rollback procedures instead of leaving recovery as documentation that has never run. Capture expected telemetry and operator action for each scenario, so the test proves both detection and the intended recovery.',
  },
  {
    order: '04',
    title: 'Release evidence with the system',
    body:
      'Ship source and build provenance, test and security results, configuration contracts, deployment steps, health checks, known limitations and a practical recovery path. Project claims should link to repositories, artifacts, demonstrations or clearly stated evidence gaps. Automated and AI-assisted changes pass the same review gates as manual work. The release includes enough operating knowledge for someone else to judge readiness and support it. Assign ownership for updates, credentials, retention and incidents, then rehearse a normal deployment and one rollback with production artifacts.',
  },
] as const satisfies readonly HomepageDeliveryStage[];
