export interface GlossaryTerm {
  term: string;
  definition: string;
}

export interface GlossaryGroup {
  title: string;
  terms: readonly GlossaryTerm[];
}

export const GLOSSARY_GROUPS: readonly GlossaryGroup[] = [
  {
    title: 'Edge AI and computer vision',
    terms: [
      {
        term: 'Edge AI',
        definition:
          'Machine-learning inference performed close to the sensor or device, reducing latency, bandwidth use, and dependence on continuous cloud connectivity.',
      },
      {
        term: 'ONNX Runtime',
        definition:
          'A cross-platform inference runtime used to execute models exported to the Open Neural Network Exchange format.',
      },
      {
        term: 'Visual servoing',
        definition:
          'A control method that converts image-space error, such as target position or size, into bounded motion commands.',
      },
      {
        term: 'Kalman filter',
        definition:
          'A recursive estimator that combines a motion model with noisy measurements to maintain a smoothed state and uncertainty estimate.',
      },
    ],
  },
  {
    title: 'Embedded and connected systems',
    terms: [
      {
        term: 'Embedded system',
        definition:
          'Purpose-built computing hardware and software integrated into a larger physical product, commonly with strict timing, memory, power, or reliability constraints.',
      },
      {
        term: 'IoT',
        definition:
          'Internet of Things: connected devices that sense, process, and exchange operational data with gateways or cloud services.',
      },
      {
        term: 'Store-and-forward',
        definition:
          'A reliability pattern that persists data locally during an outage and transmits it later using ordered, idempotent retries.',
      },
      {
        term: 'Watchdog',
        definition:
          'A timer or supervisory mechanism that detects a stalled component and initiates a controlled recovery action.',
      },
    ],
  },
  {
    title: 'Hardware engineering and automation',
    terms: [
      {
        term: 'EDA',
        definition:
          'Electronic Design Automation: software used to create, inspect, validate, and manufacture schematics and printed circuit boards.',
      },
      {
        term: 'ERC',
        definition:
          'Electrical Rules Check: schematic validation that detects connectivity, pin-type, power, and electrical-rule violations.',
      },
      {
        term: 'DRC',
        definition:
          'Design Rules Check: PCB validation for geometry, clearance, connectivity, and fabrication constraints.',
      },
      {
        term: 'MCP',
        definition:
          'Model Context Protocol: a typed tool and resource interface through which an AI client can inspect or invoke bounded capabilities.',
      },
      {
        term: 'Verification-first workflow',
        definition:
          'An automation approach that returns native checks, changed artifacts, warnings, and assumptions for review instead of treating successful execution as engineering approval.',
      },
    ],
  },
];
