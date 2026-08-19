import type {
  EducationItem,
  ExperienceItem,
  SkillGroup,
  SocialLink,
  WritingLink,
} from './schema';
import type { ProjectLink, ProjectMedia } from '../project-content';
import { CANONICAL_IDENTITY_PROFILES } from '../person-identity';
import {
  articleAuthoritySections,
  authorityProfileRefresh,
  authoritySettingsRefresh,
  projectAuthoritySections,
} from './content-authority';

/**
 * Initial content used to (a) seed a fresh database and (b) render the site
 * before a database is attached. Everything here is editable from /admin.
 */

export interface DefaultProfile {
  name: string;
  role: string;
  tagline: string;
  greeting: string;
  heroDescription: string;
  location: string;
  email: string;
  avatarUrl: string;
  resumeUrl: string;
  availableForWork: boolean;
  bio: string[];
  socials: SocialLink[];
  skills: SkillGroup[];
  experience: ExperienceItem[];
  education: EducationItem[];
  writing: WritingLink[];
}

export const defaultProfile: DefaultProfile = {
  name: 'Osman Aslan',
  role: 'Edge AI & Embedded Systems Engineer',
  tagline:
    'I build edge-AI, computer-vision and IoT systems that work reliably in the real world.',
  greeting: "Hello, I'm",
  heroDescription: authorityProfileRefresh.heroDescription,
  location: 'İzmir, Türkiye',
  email: 'info@oaslananka.dev',
  avatarUrl: 'https://avatars.githubusercontent.com/u/285490571?v=4',
  resumeUrl: '',
  availableForWork: true,
  bio: [...authorityProfileRefresh.bio],
  socials: CANONICAL_IDENTITY_PROFILES.map((social) => ({ ...social })),

  skills: [
    { category: 'Languages', items: ['Python', 'C / C++', 'TypeScript', 'Kotlin'] },
    {
      category: 'Edge AI / CV',
      items: ['PyTorch', 'TensorFlow', 'OpenCV', 'YOLO', 'ONNX Runtime', 'TF Lite'],
    },
    {
      category: 'Embedded',
      items: ['STM32', 'ESP32', 'FreeRTOS', 'Raspberry Pi', 'KiCad'],
    },
    {
      category: 'Backend',
      items: ['FastAPI', 'Django', 'Node.js', 'PostgreSQL', 'Redis'],
    },
    {
      category: 'Infra / DevOps',
      items: ['Docker', 'Kubernetes', 'AWS IoT', 'Azure IoT', 'MQTT'],
    },
  ],
  experience: [
    {
      role: 'Founder & Lead Engineer',
      company: 'Sismo Smart',
      period: '2025 — Present',
      description: 'Earthquake early warning and structural health monitoring',
      points: [
        'Lead the sensor-to-alert product architecture across embedded hardware, edge processing, secure telemetry and backend services',
        'Design compact sensing hardware and PCB revisions around power, connectivity and field-service constraints',
        'Build observable device-to-cloud paths with health signals, bounded buffering and deployment diagnostics',
        'Develop and evaluate signal-processing and ML workflows without presenting unverified field performance as a public claim',
      ],
    },
    {
      role: 'Head of Hardware',
      company: 'Confidential renewable-energy startup',
      period: '2024 — 2025',
      description: 'Wind-turbine blade health monitoring via acoustic sensing and AI',
      points: [
        'Led hardware and embedded development for an acoustic monitoring device',
        'Managed a distributed hardware team, vendors and prototype delivery',
        'Designed an ESP32-based device with connectivity, power-management and serviceability requirements',
      ],
    },
    {
      role: 'Software & Embedded Systems Engineer',
      company: '',
      period: '2022 — 2024',
      description: 'Earthquake early-warning platform · IoT, real-time, ML',
      points: [
        'Designed an end-to-end earthquake early-warning and emergency-response automation platform',
        'Built custom Raspberry Pi hardware with high-precision accelerometers and STA/LTA P-wave detection',
        'Delivered a real-time backend with Django REST, WebSockets and PostgreSQL / TimescaleDB',
        'Shipped a multi-channel alerting system and an Android app for device management',
      ],
    },
    {
      role: 'Independent Software Engineer',
      company: '',
      period: '2012 — 2022',
      description: 'Connected systems · Embedded software · Cloud / DevOps — remote, international',
      points: [
        'Delivered connected, embedded and cloud systems for international clients, with later work extending into edge AI and computer vision',
        'Owned the full chain: MCU and embedded firmware → Linux gateway → cloud ingestion → dashboards and runbooks',
        'Built real-time video analytics, model-training and edge-deployment workflows using ONNX and TF Lite on representative edge hardware',
        'Created driver, parser and calibration libraries with tests and field-debug tooling when off-the-shelf components were insufficient',
      ],
    },
  ],
  education: [
    {
      institution: 'Ege University',
      qualification: 'M.Sc., Civil & Structural Engineering',
      details:
        'Thesis: A Big Data– and AI-Driven Embedded Systems Framework for Structural Health Monitoring',
    },
    {
      institution: 'Ege University',
      qualification: 'B.Eng., Civil & Structural Engineering',
      details: '',
    },
    {
      institution: 'Middle East Technical University',
      qualification: 'B.Ed., Elementary Science Education',
      details: '',
    },
  ],
  writing: [...authorityProfileRefresh.writing],
};

export interface DefaultProject {
  slug: string;
  title: string;
  description: string;
  longDescription: string;
  role: string;
  logo: string;
  coverImage: string;
  coverImageAlt: string;
  link: string;
  repo: string;
  tags: string[];
  outcomes: string[];
  media: ProjectMedia[];
  links: ProjectLink[];
  featured: boolean;
  sortOrder: number;
}

const baseDefaultProjects: DefaultProject[] = [
  {
    slug: 'sismo-smart',
    title: 'Sismo Smart',
    description:
      'A privacy-safe case study of an earthquake early-warning and structural-health-monitoring platform spanning sensing hardware, edge processing, secure telemetry and operator alerts.',
    longDescription: `## The engineering problem

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

Sismo Smart connects my civil and structural engineering background with embedded systems, device-to-cloud software and recent edge-AI work. The public value of the case study is the complete system boundary and the discipline used to keep operational claims reviewable.`,
    role: 'Founder & Lead Engineer',
    logo: '',
    coverImage: '',
    coverImageAlt: '',
    link: '',
    repo: '',
    tags: ['Embedded Systems', 'IoT', 'Structural Health Monitoring', 'Edge AI'],
    outcomes: [
      'Sensor-to-alert architecture across embedded devices, edge processing and backend services',
      'Operational design for bounded offline buffering, device health and secure telemetry',
      'Public evidence boundary that excludes customer, deployment and safety-performance claims',
    ],
    media: [],
    links: [],
    featured: true,
    sortOrder: -1,
  },
  {
    slug: 'kicad-mcp-pro',
    title: 'KiCad MCP Pro',
    description:
      'An AI-ready MCP server and desktop workflow for inspecting, editing and validating KiCad projects with explicit engineering quality gates.',
    longDescription: `## The engineering problem

AI agents can reason about electronics, but useful KiCad automation needs more than file access. It needs project-aware context, controlled mutations, native ERC and DRC feedback, and a release path that does not confuse a fast first-pass review with engineering sign-off.

## My role

I designed and maintain the server architecture, KiCad adapter layer, agent-facing tool surface, desktop dashboard and release hardening. The work spans Python, TypeScript, Rust packaging, protocol design, security boundaries and documentation.

## The approach

The server separates MCP transport, orchestration, KiCad adapters and pure domain logic. Workflows move from project discovery through schematic and PCB operations to quality-gate reports and manufacturing exports. Mutating operations stay explicit, while capability reporting makes unsupported or GUI-only surfaces visible instead of hiding them.

## Validation and boundaries

ERC and DRC use KiCad's own engines. Manufacturing handoff is gated and produces reviewable artifacts. Signal-integrity, power-integrity, EMC and thermal helpers are documented as first-pass estimates, not substitutes for field solvers or qualified human review.

## Outcome

The project provides one installable surface for MCP clients, a local dashboard, documented client configurations and an openly tracked capability matrix. Its core value is a safer, inspectable workflow for AI-assisted EDA rather than an unreviewed one-click board generator.`,
    role: 'Creator, maintainer and systems architect',
    logo: '',
    coverImage: '/projects/kicad-mcp-pro/cover.webp',
    coverImageAlt: 'KiCad MCP Pro desktop dashboard and KiCad workflow overview',
    link: 'https://oaslananka.github.io/kicad-mcp-pro/',
    repo: 'https://github.com/oaslananka/kicad-mcp-pro',
    tags: ['Python', 'MCP', 'KiCad', 'EDA'],
    outcomes: [
      'Native KiCad ERC/DRC and manufacturing export gates',
      'stdio and Streamable HTTP transports for MCP clients',
      'Open capability and engineering-boundary documentation',
    ],
    media: [
      {
        type: 'image',
        src: '/projects/kicad-mcp-pro/cover.webp',
        alt: 'KiCad MCP Pro product overview',
        caption: 'The product surface connects agent workflows, validation and release evidence.',
        width: 1774,
        height: 887,
      },
      {
        type: 'image',
        src: '/projects/kicad-mcp-pro/schematic-build.webp',
        alt: 'Cursor building a KiCad schematic through KiCad MCP Pro',
        caption: 'A schematic workflow remains visible and reviewable inside the engineering workspace.',
        width: 1920,
        height: 1080,
      },
      {
        type: 'image',
        src: '/projects/kicad-mcp-pro/pcb-inspection.webp',
        alt: 'PCB inspection workflow in Visual Studio Code',
        caption: 'PCB inspection exposes board state before an agent proposes changes.',
        width: 1920,
        height: 1080,
      },
      {
        type: 'image',
        src: '/projects/kicad-mcp-pro/manufacturing-export.webp',
        alt: 'Manufacturing export quality gate report',
        caption: 'Release output is gated behind explicit validation and review evidence.',
        width: 1920,
        height: 1080,
      },
    ],
    links: [
      { type: 'docs', label: 'Documentation', url: 'https://oaslananka.github.io/kicad-mcp-pro/' },
      { type: 'package', label: 'PyPI package', url: 'https://pypi.org/project/kicad-mcp-pro/' },
    ],
    featured: true,
    sortOrder: 0,
  },
  {
    slug: 'sky-track-vision',
    title: 'SkyTrackVision',
    description:
      'A research framework that composes YOLOv8 perception, Kalman tracking, cascade PID control and LLM mission planning in AirSim.',
    longDescription: `## The research question

Autonomous systems need high-level planning without putting a probabilistic model directly in the real-time control loop. SkyTrackVision explores how perception, deterministic control, safety evaluation and language-model planning can be composed without erasing those boundaries.

## My role

I built the modular Python framework, AirSim integration, perception and tracking pipeline, visual-servo controller, safety gates, mission tooling and offline demo path.

## Architecture

The fast loop captures frames, runs YOLOv8 detection and tracking, smooths target state with a Kalman filter, and feeds cascade PID image-based visual servoing. A slower LLM layer issues mission-level tool calls. Every movement passes deterministic safety checks and a mission watchdog before it reaches the simulator.

## Testability

The autonomy, vision, agent and evaluation packages are independent of AirSim. Synthetic frames and sensor snapshots make the core pipeline runnable and testable without a simulator or physical drone.

## Honest scope

This is an open-source learning and research platform, not a production flight system. The recorded demo shows the current simulated workflow; it does not claim real-world deployment or autonomous safety certification.`,
    role: 'Research engineer and framework author',
    logo: '',
    coverImage: '/projects/sky-track-vision/poster.webp',
    coverImageAlt: 'SkyTrackVision simulated drone perception and tracking overlay',
    link: '',
    repo: 'https://github.com/oaslananka/sky-track-vision-dev',
    tags: ['Python', 'Computer Vision', 'YOLOv8', 'Control'],
    outcomes: [
      'AirSim-free deterministic demo and test path',
      'Separated LLM planning and real-time control loops',
      'Safety-gated movement with mission watchdog aborts',
    ],
    media: [
      {
        type: 'video',
        src: '/projects/sky-track-vision/demo.mp4',
        poster: '/projects/sky-track-vision/poster.webp',
        alt: 'SkyTrackVision AirSim perception and mission demo',
        caption: 'Recorded repository demo showing detection, tracking and flight telemetry in simulation.',
        audio: 'none',
        track: {
          kind: 'descriptions',
          src: '/projects/sky-track-vision/demo.en.vtt',
          srcLang: 'en',
          label: 'English visual descriptions',
        },
        width: 756,
        height: 424,
      },
    ],
    links: [],
    featured: true,
    sortOrder: 1,
  },
  {
    slug: 'adxl355',
    title: 'ADXL355 Driver Family',
    description:
      'A transport-agnostic ADXL355 driver family with a shared register model and consistent APIs across six languages.',
    longDescription: `## The portability problem

Sensor integrations often drift when each language reimplements register constants, signed sample decoding and calibration independently. The goal of this project is to keep the ADXL355 behavior consistent across embedded and application runtimes.

## My role

I designed the shared register specification, transport contracts, golden test vectors and package surfaces for C, C++, Python, Rust, Node.js and Go.

## Architecture

SPI and I2C access sit behind caller-provided transport interfaces. The language packages share the same register meanings and API intent while remaining idiomatic for their ecosystems. Raw 20-bit acceleration decoding, FIFO access, self-test and offset calibration are covered by the common model.

## Verification

Mock transports allow each implementation to run without hardware. Golden vectors exercise sign extension and unit conversion consistently, which makes cross-language regressions visible before a package reaches a device.

## Outcome

The repository is a reusable driver family rather than a Python-only wrapper. It demonstrates how a small hardware protocol can become a maintainable multi-language surface without coupling application code to one bus library.`,
    role: 'Driver architecture and multi-language implementation',
    logo: '',
    coverImage: '/projects/adxl355/driver-family.svg',
    coverImageAlt: 'Diagram of the ADXL355 shared register specification and six language packages',
    link: '',
    repo: 'https://github.com/oaslananka/adxl355',
    tags: ['C', 'Python', 'Rust', 'Embedded'],
    outcomes: [
      'Consistent APIs for C, C++, Python, Rust, Node.js and Go',
      'Hardware-free mock transport tests',
      'Shared golden vectors for 20-bit sample decoding',
    ],
    media: [
      {
        type: 'image',
        src: '/projects/adxl355/driver-family.svg',
        alt: 'ADXL355 driver family architecture',
        caption: 'A shared register and test model feeds six idiomatic language packages.',
        width: 1600,
        height: 900,
      },
    ],
    links: [],
    featured: true,
    sortOrder: 2,
  },
  {
    slug: 'kicad-studio-kit',
    title: 'KiCad Studio Kit',
    description:
      'A released VS Code extension for navigating KiCad workspaces, inspecting design data and connecting editor workflows to KiCad MCP Pro.',
    longDescription: `## The workflow problem

KiCad projects contain connected schematic, board, BOM and validation artifacts, while a general-purpose editor sees only files. KiCad Studio Kit adds an engineering-aware workspace surface without trying to replace KiCad itself.

## My role

I built and maintain the extension architecture, project explorer, schematic and PCB viewing surfaces, BOM and DRC panels, MCP integration contract, release automation and visual test suite.

## Product boundary

This repository owns the released VS Code extension. The KiCad MCP Pro server is developed and released separately, so extension code, server packaging and compatibility metadata retain clear ownership.

## Validation

The extension uses fixture-backed tests and visual regression coverage for its core panels. Compatibility documentation distinguishes the primary tested KiCad line from older file-level support.

## Outcome

The extension provides a focused place to inspect project state, quality gates and AI-assisted workflows while keeping source, design files and review context in one editor workspace.`,
    role: 'Extension author and product maintainer',
    logo: '',
    coverImage: '/projects/kicad-studio-kit/cover.webp',
    coverImageAlt: 'KiCad Studio Kit extension interface in Visual Studio Code',
    link: 'https://marketplace.visualstudio.com/items?itemName=oaslananka.kicadstudiokit',
    repo: 'https://github.com/oaslananka/kicad-studio-kit',
    tags: ['TypeScript', 'VS Code', 'KiCad'],
    outcomes: [
      'Released on Visual Studio Marketplace and Open VSX',
      'Dedicated schematic, PCB, BOM and quality-gate surfaces',
      'Fixture-backed visual regression coverage',
    ],
    media: [
      {
        type: 'image',
        src: '/projects/kicad-studio-kit/cover.webp',
        alt: 'KiCad Studio Kit marketplace overview',
        caption: 'The extension brings KiCad project workflows into a focused editor surface.',
        width: 1280,
        height: 520,
      },
      {
        type: 'image',
        src: '/projects/kicad-studio-kit/pcb-viewer.webp',
        alt: 'KiCad Studio Kit PCB viewer',
        caption: 'PCB inspection remains connected to the source workspace and project tree.',
        width: 1280,
        height: 720,
      },
    ],
    links: [
      { type: 'marketplace', label: 'Visual Studio Marketplace', url: 'https://marketplace.visualstudio.com/items?itemName=oaslananka.kicadstudiokit' },
      { type: 'marketplace', label: 'Open VSX', url: 'https://open-vsx.org/extension/oaslananka/kicadstudiokit' },
    ],
    featured: false,
    sortOrder: 3,
  },
  {
    slug: 'easyeda-mcp-pro',
    title: 'EasyEDA MCP Pro',
    description:
      'A profile-gated MCP server and local bridge for inspecting, validating and deliberately modifying EasyEDA Pro hardware projects.',
    longDescription: `## The integration problem

EasyEDA Pro exposes useful runtime APIs, but an AI integration needs a constrained bridge, clear read and write boundaries, and actionable validation results rather than unrestricted script execution.

## My role

I designed and maintain the TypeScript MCP server, EasyEDA Pro bridge extension, tool profiles, capability scopes, transaction model, sourcing integrations and release pipeline.

## Architecture

MCP clients connect over stdio or Streamable HTTP. The server communicates with the open EasyEDA Pro application through a local WebSocket bridge. Profile and scope gates separate diagnostics, inspection, BOM, rule checks, PCB operations and exports.

## Controlled writes

Documented API calls are distinct from raw runtime execution. Mutating methods require explicit confirmation, while raw execution remains behind multiple experimental gates. The system reports bridge state and API availability instead of pretending an unsupported operation succeeded.

## Outcome and boundary

The project supports inspection, BOM sourcing, ERC/DRC summaries and manufacturing export workflows. It is an engineering assistant, not an autonomous manufacturing sign-off authority; generated artifacts still require qualified review.`,
    role: 'Creator, bridge architect and maintainer',
    logo: '',
    coverImage: '/projects/easyeda-mcp-pro/bridge-architecture.svg',
    coverImageAlt: 'EasyEDA MCP Pro server and bridge extension architecture',
    link: '',
    repo: 'https://github.com/oaslananka/easyeda-mcp-pro',
    tags: ['TypeScript', 'MCP', 'EasyEDA', 'Hardware'],
    outcomes: [
      'Profile and capability scoped tool surface',
      'Explicit confirmation for documented mutating calls',
      'BOM, ERC/DRC and manufacturing export workflows',
    ],
    media: [
      {
        type: 'image',
        src: '/projects/easyeda-mcp-pro/bridge-architecture.svg',
        alt: 'EasyEDA MCP Pro bridge architecture',
        caption: 'A local bridge keeps AI clients separate from the EasyEDA Pro runtime.',
        width: 1600,
        height: 900,
      },
    ],
    links: [
      { type: 'package', label: 'npm package', url: 'https://www.npmjs.com/package/easyeda-mcp-pro' },
    ],
    featured: false,
    sortOrder: 4,
  },
  {
    slug: 'iot-cloud-monitor',
    title: 'IoT Cloud Monitor API',
    description:
      'A staging-ready Express REST API for authenticated, owner-scoped IoT devices and numeric telemetry stored in MongoDB.',
    longDescription: `## The backend scope

This project focuses on the service boundary behind an IoT product: authenticated users, owned devices and numeric telemetry. It is intentionally presented as a backend API rather than a finished monitoring dashboard.

## My role

I implemented the Node.js and Express API, MongoDB persistence, JWT authentication, ownership rules, automated verification and example infrastructure configuration.

## Design

Device and telemetry access is scoped to the authenticated owner. Validation, rate controls and security checks sit at the HTTP boundary, while integration tests run against isolated database infrastructure.

## Delivery status

The repository is staging-ready for local and CI verification. Example Terraform and Ansible files are references, not a complete deployment path.

## Explicit non-claims

The current project does not implement MQTT ingestion, alerts, reporting dashboards, AWS Lambda, API Gateway, container publishing or production deployment automation. Keeping those gaps visible is more useful than marketing an interface that does not exist.`,
    role: 'Backend API design and implementation',
    logo: '',
    coverImage: '/projects/iot-cloud-monitor/api-architecture.svg',
    coverImageAlt: 'IoT Cloud Monitor REST API and MongoDB architecture',
    link: '',
    repo: 'https://github.com/oaslananka/iot-cloud-monitor',
    tags: ['Node.js', 'Express', 'MongoDB', 'IoT'],
    outcomes: [
      'Owner-scoped device and telemetry records',
      'Automated tests without a local MongoDB daemon',
      'Documented staging status and production gaps',
    ],
    media: [
      {
        type: 'image',
        src: '/projects/iot-cloud-monitor/api-architecture.svg',
        alt: 'IoT Cloud Monitor API architecture',
        caption: 'The verified scope is an authenticated REST backend with MongoDB persistence.',
        width: 1600,
        height: 900,
      },
    ],
    links: [],
    featured: false,
    sortOrder: 5,
  },
];

export const defaultProjects: DefaultProject[] = baseDefaultProjects.map(
  (project) => ({
    ...project,
    longDescription: projectAuthoritySections[project.slug]
      ? `${project.longDescription.trim()}\n\n${projectAuthoritySections[project.slug]}`
      : project.longDescription,
  }),
);

export interface DefaultPost {
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  coverImage: string;
  tags: string[];
  published: boolean;
}

const baseDefaultPosts: DefaultPost[] = [
  {
    slug: 'ai-ready-mcp-server-for-kicad',
    title: 'Building an AI-Ready MCP Server for KiCad',
    excerpt:
      'Why I wrapped KiCad in a Model Context Protocol server — and how it turns schematic, PCB and manufacturing workflows into tools an AI agent can actually use.',
    coverImage: '/projects/kicad-mcp-pro/manufacturing-export.webp',
    tags: ['MCP', 'KiCad', 'EDA', 'AI'],
    published: true,
    body: [
      '# Building an AI-Ready MCP Server for KiCad',
      '',
      "Hardware design tools are powerful, but they were never built to be driven by an AI agent. When I started connecting LLMs to real electronics workflows, I kept hitting the same wall: the model could *reason* about a board, but it had no reliable, structured way to *act* on it. The Model Context Protocol (MCP) is what closed that gap.",
      '',
      '## The problem with "AI + EDA"',
      '',
      'Ask an LLM to review a schematic and it will happily hallucinate net names, part values and DRC results. The knowledge exists in the KiCad project files — it just is not exposed in a way a model can query deterministically. What you want is a set of **typed tools**: `get_schematic`, `run_erc`, `run_drc`, `export_bom`, `generate_gerbers` — each with a clear input schema and a verifiable output.',
      '',
      'That is exactly what MCP standardises. Instead of gluing a model to a CLI with brittle prompt parsing, you expose capabilities as tools and let the client (Claude, or any MCP-capable agent) call them.',
      '',
      '## What the server does',
      '',
      'The KiCad MCP server turns the design into an inspectable, automatable surface:',
      '',
      '- **Inspection** — read schematic and PCB structure, nets, footprints and design rules',
      '- **Verification-first** — run ERC/DRC and return structured violations, not screenshots',
      '- **Manufacturing** — reviewable BOM, Gerber and drill export workflows with explicit quality gates',
      '- **Assistance** — enough context for an agent to propose fixes that a human approves',
      '',
      '## Verification is the whole game',
      '',
      'The central design decision is to make release workflows **verification-first**. A completed tool call proves that an operation ran; it does not prove that a board is ready to manufacture. The server can return native ERC/DRC evidence, changed artifacts, warnings and first-pass checks so an engineer can review the result without treating an AI response as sign-off.',
      '',
      '## Why this matters',
      '',
      'Bringing MCP to EDA means the tedious, error-prone parts of hardware release — rule checks, BOM hygiene, manufacturing export — become repeatable and reviewable. The engineer stays in control and spends their time on the design decisions that actually need judgement.',
      '',
      'The implementation, capability matrix and documented engineering boundaries are available in the [KiCad MCP Pro repository](https://github.com/oaslananka/kicad-mcp-pro).',
    ].join('\n'),
  },
  {
    slug: 'production-first-edge-ai',
    title: 'Production-First Edge AI: Lessons from the Field',
    excerpt:
      'Building connected and embedded systems, including recent edge-AI products, taught me that the model is the easy part. Here is what makes field deployments survive.',
    coverImage: '/projects/sky-track-vision/poster.webp',
    tags: ['Edge AI', 'IoT', 'Embedded'],
    published: true,
    body: [
      '# Production-First Edge AI: Lessons from the Field',
      '',
      'Most edge-AI demos work beautifully on a bench and fall apart in the field. After years of delivering device-to-cloud systems — from structural and seismic monitoring to industrial and agricultural deployments — I have come to treat the model as the *easy* part. The hard part is everything around it.',
      '',
      '## Offline is normal',
      '',
      'On the bench you have Wi-Fi, power and a clean sensor. In the field you have none of those reliably. The systems that survive assume connectivity will drop, so they buffer locally, retry with backoff, sync when they can, and make **idempotent writes** so a replayed message never corrupts the record. "Store-and-forward" is not a feature; it is the default.',
      '',
      '## The full chain, owned end to end',
      '',
      'A working edge system is a chain: MCU/embedded firmware → Linux gateway → cloud ingestion → dashboards and alerts. A weakness anywhere breaks the whole thing. My typical delivery owns every link:',
      '',
      '- **Embedded**: sensor interfacing, calibration, fault recovery and watchdogs',
      '- **Gateway**: protocol bridging, secure provisioning, robust retry and time sync',
      '- **Cloud**: real-time ingestion, background workers, time-series storage',
      '- **Observability**: metrics, structured logging and operational dashboards',
      '',
      '## Production-first habits',
      '',
      'The habits that made the difference across every project:',
      '',
      '1. **Telemetry from day one** — if you cannot see it, you cannot operate it.',
      '2. **Health checks and watchdogs** — devices restart themselves before a human notices.',
      '3. **Structured logging** — logs you can query, not just tail.',
      '4. **Failure-mode analysis** — decide what happens when each part fails, on purpose.',
      '5. **Runbooks** — the deployment is not done until someone else can operate it.',
      '',
      '## On-device inference where it counts',
      '',
      'When latency, bandwidth or privacy demand it, inference moves to the edge: models trained in PyTorch or TensorFlow, exported to ONNX or TF Lite, quantised, and run on Jetson-, Coral- or Raspberry-Pi-class hardware. The win is not accuracy on a slide — it is a system that keeps making good decisions when the network is gone.',
      '',
      'Coming from a structural-engineering background, I read sensor data as physical events, not just numbers — and that framing is often what turns a fragile prototype into something you can actually deploy.',
    ].join('\n'),
  },
  {
    slug: 'safe-ai-assisted-kicad-workflows',
    title: 'Designing Safe AI-Assisted KiCad Workflows',
    excerpt:
      'A practical architecture for letting AI inspect and assist with PCB work without confusing tool execution with engineering approval.',
    coverImage: '/projects/kicad-mcp-pro/manufacturing-export.webp',
    tags: ['KiCad', 'MCP', 'Safety', 'EDA'],
    published: true,
    body: `Connecting an AI agent to KiCad is easy to demonstrate and difficult to make trustworthy. A prompt can produce a plausible component choice or routing suggestion, but a manufactured board needs evidence: exact project state, native rule checks, reviewable changes and a clear point where a qualified engineer takes responsibility.

This is the architecture I use in KiCad MCP Pro. The goal is not autonomous sign-off. It is a faster workflow in which an agent can inspect, propose, execute bounded operations and return the artifacts a human needs to make a decision.

## Start with inspection, not mutation

Before an agent proposes a schematic or PCB change, it should establish the active project, enumerate design files, inspect board settings, read symbols and footprints, and retrieve current ERC or DRC results. That context should come from tools rather than names guessed from prompt history.

An inspect-first sequence keeps the agent tied to current state, lets the user review assumptions before a write, and turns unsupported or GUI-only capabilities into explicit gaps. Every mutating workflow should also have an inspection path. If a tool can place a footprint, another tool must report its position, layer, orientation and surrounding board state.

## Make writes explicit and bounded

A broad execute-anything tool makes a demo feel powerful, but removes the boundary between intent and side effects. A safer MCP surface exposes typed domain operations: update a known field, place a known footprint, synchronize a board from a schematic, or export a defined artifact set.

The server can validate paths, project ownership, units and value ranges before KiCad sees the request. It can also distinguish an inspection profile from profiles that enable schematic, PCB or manufacturing changes. The model chooses which capability to request; the server decides whether that request is structurally permitted.

## Use native engineering engines as gates

A successful API call proves only that the call completed. It does not prove that the design is valid. After a meaningful change, the workflow should run the native checks that match the affected surface:

- ERC for schematic connectivity and electrical-rule issues.
- DRC for board geometry, clearance and connectivity issues.
- Schematic-to-PCB synchronization checks when design domains cross.
- Output validation before Gerber, drill, BOM or placement files are released.

Violations should remain structured data and the underlying reports should be exported. An agent can summarize them, but the original evidence remains available to the engineer.

## Separate estimates from sign-off

Fast calculations for impedance, current capacity, thermal behavior or electromagnetic risk are useful during iteration. They become dangerous when presented as equivalent to a field solver, laboratory validation or formal review. Tool descriptions should identify the method, assumptions and confidence boundary.

KiCad MCP Pro therefore presents its SI, PI, EMC and thermal helpers as first-pass estimates. They can identify where deeper analysis is warranted; they do not erase the need for that analysis.

## Produce a review packet, not a success message

The output of an AI-assisted release workflow should be inspectable without the conversation that created it. A useful packet includes the project revision, requested operation, changed artifacts, ERC and DRC reports, manufacturing files, warnings and assumptions that still require review.

That packet changes the role of the agent. It is not an authority declaring that a board is ready. It is an automation layer performing repeatable work and assembling evidence.

## A practical release sequence

1. Select and inspect the exact KiCad project.
2. Retrieve design intent, constraints and current violations.
3. Ask for a bounded proposal and review its assumptions.
4. Execute only the approved domain operation.
5. Reinspect changed state and run native validation.
6. Export a quality-gate report and manufacturing evidence.
7. Require qualified human review before fabrication or assembly.

The implementation, capability matrix and security documentation are available in [KiCad MCP Pro](https://github.com/oaslananka/kicad-mcp-pro).`,
  },
  {
    slug: 'edge-vision-tracking-control-pipeline',
    title: 'From Detection to Control: An Edge Vision Tracking Pipeline',
    excerpt:
      'How detection, state estimation, visual servoing, safety checks and an LLM mission layer fit together without sharing one timing loop.',
    coverImage: '/projects/sky-track-vision/poster.webp',
    tags: ['Computer Vision', 'Control', 'Edge AI', 'Robotics'],
    published: true,
    body: `Object detection is only the first stage of a useful autonomous vision system. A detector can report a target in a frame, but a controller needs a stable estimate of where it is moving, how uncertain that estimate is and whether a requested motion remains inside a safe envelope.

SkyTrackVision is a research framework I built to explore that path in AirSim. It combines YOLOv8 perception, Kalman-filtered tracking, image-based visual servoing, deterministic safety evaluation and a language-model mission layer. It is intentionally a simulation and learning platform, not a production flight controller.

## Two loops with different jobs

The system avoids placing language-model inference in the real-time control loop. It has two cadences:

- A fast deterministic loop captures frames, updates perception and tracking, computes control commands and applies safety gates.
- A slower planning loop interprets a mission and chooses high-level tools such as search, track, approach or abort.

A language model can reason about intent and sequence, but its latency and variability make it a poor source of per-frame velocity commands. A deterministic controller can meet timing constraints but should not invent the mission.

## Detection is a measurement, not state

YOLOv8 produces bounding boxes and confidence scores. Frame-to-frame boxes jitter, disappear during short occlusions and may switch identity when objects overlap. Feeding raw boxes into a controller produces noisy motion.

The tracking layer associates detections and maintains a constant-velocity Kalman estimate. It predicts target state when a measurement is late or missing, then corrects that estimate when a new detection arrives. A useful tracker also publishes uncertainty and age, because a controller should react differently to a fresh high-confidence measurement than to a prediction that has gone several frames without confirmation.

## Convert image error into bounded motion

Image-based visual servoing treats target position and apparent size as control signals. Horizontal and vertical pixel error can drive yaw and altitude, while bounding-box scale can approximate distance during an approach.

SkyTrackVision uses cascade PID control rather than an unrestricted motion vector. Each axis has explicit limits, dead zones and smoothing. Commands are bounded before they reach the simulator, reducing the effect of an aggressive detection or transient tracking error.

The controller accepts data contracts instead of importing AirSim. Synthetic detections and sensor snapshots can exercise the control law in a normal unit test.

## Safety is a parallel decision path

A controller saying move is not enough. A separate safety evaluator considers stopping distance and state before every command. A mission watchdog enforces timeout, geofence, altitude and battery constraints. Either layer can replace a requested action with an emergency abort.

This avoids asking the component that wants to finish a mission to judge the safety of its own action. Safety remains deterministic and can veto manual or LLM-originated requests.

## Keep the simulator at the boundary

The autonomy, vision, agent and evaluation packages do not require AirSim. Only the I/O bridge and live mission runtime depend on the simulator. This supports fast synthetic tests, an offline recorded demo and a live simulation path without making AirSim a prerequisite for every contributor or CI job.

## What the demo does not prove

A stable AirSim run does not validate aerodynamics, calibration, sensor latency, environmental robustness or real-world safety. A physical system would require hardware-in-the-loop testing, calibrated timing, redundant safety mechanisms and much deeper operational review.

The value of this architecture is the boundary: probabilistic perception and planning feed a deterministic, testable control and safety core. The source and recorded demo are available in the [SkyTrackVision repository](https://github.com/oaslananka/sky-track-vision-dev).`,
  },
  {
    slug: 'cross-language-sensor-driver-design',
    title: 'Designing a Cross-Language Sensor Driver Family',
    excerpt:
      'A shared register specification, transport boundary and golden vectors can keep C, Python, Rust, Node.js and Go implementations aligned.',
    coverImage: '/projects/adxl355/driver-family.svg',
    tags: ['Embedded', 'Drivers', 'Testing', 'ADXL355'],
    published: true,
    body: `A sensor driver often starts as register constants and SPI calls. The design becomes harder when the same device must serve firmware, test tooling, gateways and application services written in different languages. Copying one implementation six times creates six subtly different interpretations of the datasheet.

The ADXL355 driver family addresses that problem for C, C++, Python, Rust, Node.js and Go. The goal is not identical syntax. It is consistent device behavior, shared verification and transport independence across idiomatic packages.

## Treat the register map as a specification

Register addresses, masks, reset values, signed widths and scale factors form the protocol contract. They should be reviewed as one specification before becoming language code. A change to that model must remain visible across every package that consumes it.

The highest-risk details are usually multi-byte ordering, reserved bits, sign extension and mode-dependent behavior. The ADXL355 produces 20-bit signed samples across three bytes. An implementation must combine those bytes, discard unused bits and extend the sign before converting to physical units.

## Put the bus behind the caller

A reusable driver should not decide which SPI or I2C library an application uses. Each package accepts a small transport contract for reading and writing device registers. The application adapts its platform bus to that interface.

This lets embedded firmware keep its vendor HAL, Linux applications choose a suitable user-space bus, and tests use an in-memory fake instead of hardware. Package users also retain control over locking, chip select and error handling.

C expresses the boundary with function pointers and context. C++ wraps it with a typed interface. Rust uses traits and explicit results. Python, Node.js and Go use their own protocol or interface conventions. The surface looks native while device semantics stay aligned.

## Build golden vectors before convenience APIs

The first shared tests should cover raw protocol behavior. Golden vectors provide known register bytes and expected signed values, including zero, positive limits, negative values and boundary transitions. Every language package runs equivalent cases.

Mock transports then verify register selection, byte counts and write sequences. Hardware tests remain necessary for electrical and timing behavior, but deterministic vectors catch most interpretation drift faster and without a device attached.

## Separate raw values from engineering units

A driver should make conversion explicit. Raw samples are useful for debugging and custom calibration; engineering-unit helpers are useful for applications. Mixing both behind one ambiguous numeric return makes comparisons and scaling diagnostics difficult.

The same rule applies to configuration. Range, output data rate, filtering, FIFO behavior, self-test and calibration should use named values rather than caller-supplied magic bytes.

## Keep the common API small

Cross-language libraries become difficult to maintain when every package mirrors every convenience method. The shared contract should focus on stable device operations: initialize, identify, configure, read samples, inspect FIFO state, run self-test and apply calibration.

Language-specific helpers can sit above that layer as long as they do not change underlying meaning. This keeps a decoding or register fix reviewable across all packages.

## Coordinate release status honestly

A multi-language repository needs repeatable checks for each ecosystem, but one package may mature before another. Documentation should show actual support levels rather than imply uniform completion. The project verifies C and C++ with CTest, Rust with Cargo, Node.js with its test runner, Go with go test and Python with its own package tooling while reviewing shared vectors as one artifact.

The resulting design is less about wrapping one accelerometer and more about preserving protocol truth across runtime boundaries. The implementation is available in the [ADXL355 repository](https://github.com/oaslananka/adxl355).`,
  },
];

export const defaultPosts: DefaultPost[] = baseDefaultPosts.map((post) => ({
  ...post,
  body: articleAuthoritySections[post.slug]
    ? `${post.body.trim()}\n\n${articleAuthoritySections[post.slug]}`
    : post.body,
}));

export interface DefaultSettings {
  siteTitle: string;
  siteDescription: string;
  keywords: string[];
  defaultTheme: string;
  ogHeading: string;
}

export const defaultSettings: DefaultSettings = {
  siteTitle: 'Osman Aslan — Edge AI & Embedded Systems Engineer',
  siteDescription: authoritySettingsRefresh.siteDescription,
  keywords: [...authoritySettingsRefresh.keywords],
  defaultTheme: 'github-dark',
  ogHeading: '',
};
