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
      'I start with the limits the system must live inside: sensing quality, latency, compute, power, connectivity, updates and operational ownership. Those constraints decide what runs on-device, what moves to a gateway or backend, and how the system degrades when a dependency disappears. Research assumptions stay separate from deployment evidence, with timing, calibration, recovery and service responsibilities defined before implementation.',
    href: '/articles/production-first-edge-ai',
    linkLabel: 'Read the production-first architecture guide',
  },
  {
    title: 'Evidence before claims',
    body:
      'Claims should point to evidence another engineer can inspect: tests, deterministic demos, native validators, build artifacts, migration rehearsals or operational diagnostics. When a measurement does not exist, I state the boundary instead of inventing a benchmark. KiCad MCP Pro applies this by keeping tool execution, ERC/DRC output, manufacturing exports and engineering approval as separate gates.',
    href: '/projects/kicad-mcp-pro',
    linkLabel: 'Inspect the KiCad MCP Pro evidence',
  },
  {
    title: 'Safe automation boundaries',
    body:
      'Automation should remove mechanical work without hiding responsibility. My tools expose the selected project, requested operation, changed artifacts and validation results for review. Language models can organize intent and choose bounded tools; they do not replace electrical rules, control timing, sensor physics, security policy or qualified review. When a safe precondition is missing, automation stops and returns the decision to an engineer.',
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
  'I move from prototype to release through reviewable stages. Each stage removes a different uncertainty—feasibility, integration, failure handling and operability—and its evidence becomes the entry condition for the next.';

export const HOMEPAGE_DELIVERY_STAGES = [
  {
    order: '01',
    title: 'Frame the operating system',
    body:
      'Define the physical source, latency, compute location, power and thermal limits, connectivity, data ownership, security boundaries, updates and service model. Mark what is known, estimated or experimental, then set acceptance criteria for startup, steady state and degraded operation. Bench-test assumptions that software alone cannot establish.',
  },
  {
    order: '02',
    title: 'Build one observable vertical slice',
    body:
      'Build the smallest path that crosses real system boundaries: one sensor input, one decision, one durable message and one observable backend result. Add structured logs, health signals, timeouts and representative test data immediately. Keep configuration and protocol versions visible, and make the slice reproducible from documented commands.',
  },
  {
    order: '03',
    title: 'Exercise failure and recovery',
    body:
      'Exercise network loss, duplicate or late messages, storage failure, implausible sensor values, low-confidence model output, restarts and interrupted updates. Give each boundary an explicit response—reject, retry, buffer, degrade, stop safely, alert or request review—and verify both the telemetry and recovery path.',
  },
  {
    order: '04',
    title: 'Release evidence with the system',
    body:
      'Ship build provenance, test and security results, configuration contracts, deployment steps, health checks, known limitations and recovery procedures with the release. Link claims to repositories, artifacts, demonstrations or explicit evidence gaps. Assign operational ownership and rehearse both a normal deployment and rollback.',
  },
] as const satisfies readonly HomepageDeliveryStage[];
