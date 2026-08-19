/**
 * AI Logistics Brain — Phase 1 to Phase 6 Roadmap Model
 * Reflects the closed-loop intelligence lifecycle:
 * OBSERVE → UNDERSTAND → REASON → PREDICT → DECIDE → COMMUNICATE
 */

export interface PhaseDefinition {
  id: number;
  slug: string;
  name: string;
  subtitle: string;
  status: 'ACTIVE' | 'DORMANT' | 'PLANNED';
  badgeLabel: string;
  description: string;
  coreCapabilities: string[];
  architecturalComponents: string[];
  inputContract: string;
  outputContract: string;
  demoScenario: {
    title: string;
    description: string;
    triggerLabel: string;
  };
}

export const SYSTEM_PHASES: PhaseDefinition[] = [
  {
    id: 1,
    slug: 'observe',
    name: 'PHASE 1: OBSERVE',
    subtitle: 'Immutable Event Ingestion & Materialized World Model',
    status: 'ACTIVE',
    badgeLabel: 'ACTIVE • PRODUCTION READY',
    description:
      'Ingests heterogeneous external logistics events (WMS, Scanners, GPS Telematics, ERP) normalized via ULEO v0.1. Guarantees transactional idempotency, pure domain invariants, and atomic dual-commit to PostgreSQL Event Store and Materialized State.',
    coreCapabilities: [
      'Universal Logistics Event Ontology (ULEO v0.1) Normalization',
      'Atomic Dual-Commit (PostgreSQL event_store + world_model_*)',
      'Deterministic Finite State Machine Invariant Validation',
      'Idempotency Guard & Deduplication Index',
      'Sub-millisecond State Query Projections',
    ],
    architecturalComponents: [
      'FastAPI Ingestion Gateway',
      'Pydantic ULEO Validation Pipeline',
      'Pure Domain State Machine Aggregates',
      'PostgreSQL 16 Unified Storage Engine',
    ],
    inputContract: 'Heterogeneous JSON (GPS pings, scanner barcodes, WMS status updates)',
    outputContract: 'Normalized ULEO Domain Events + Materialized World Model Tables',
    demoScenario: {
      title: 'Full Lifecycle Parcel Event Progression',
      description: 'Emit CREATED → PACKED → LOADED → DISPATCHED → DELIVERED with real-time 3D spatial twin sync.',
      triggerLabel: 'Inject Lifecycle Batch',
    },
  },
  {
    id: 2,
    slug: 'understand',
    name: 'PHASE 2: UNDERSTAND',
    subtitle: 'Context Assembly & Relational Dependency Graph',
    status: 'DORMANT',
    badgeLabel: 'DORMANT MODULE • NEXT ITERATION',
    description:
      'Aggregates multi-entity context across parcels, trucks, staging bays, and local environmental variables (weather, capacity) to generate rich operational incident dossiers.',
    coreCapabilities: [
      'Multi-hop Entity Graph Traversal',
      'Operational Context Builder Service',
      'Warehouse Congestion & Staging Saturation Indexing',
      'Cold-Chain & High-Priority Manifest Aggregation',
    ],
    architecturalComponents: [
      'ContextBuilderService',
      'Relational Dependency Graph Engine',
      'External Telematics & Weather Enricher',
    ],
    inputContract: 'Incident ID + Entity References + Historical Event Window',
    outputContract: 'Structured LogisticsContext JSON with impacted blast radius',
    demoScenario: {
      title: 'Delhi W12 Scanner Outage Blast Radius',
      description: 'Query contextual dependency tree for Delhi W12 showing 18 affected trucks and 95% capacity spike.',
      triggerLabel: 'Simulate Context Assembly',
    },
  },
  {
    id: 3,
    slug: 'reason',
    name: 'PHASE 3: REASON',
    subtitle: 'Anomaly Detection, Root-Cause Analysis & Bottlenecks',
    status: 'DORMANT',
    badgeLabel: 'DORMANT MODULE • PLANNED',
    description:
      'Detects unspoken operational anomalies — such as dwell-time violations, phantom delays, scanner desynchronization, and root-cause attribution across distributed nodes.',
    coreCapabilities: [
      'Spatial-Temporal Anomaly Classification',
      'Dwell-Time Distribution Deviation Analysis',
      'Cascading Failure Root-Cause Identification',
      'Correlated Sensor Drift Detection',
    ],
    architecturalComponents: [
      'Anomaly Reasoning Engine',
      'Statistical Process Control Evaluator',
      'Cross-Hub Topology Analyzer',
    ],
    inputContract: 'Materialized World Model Stream + Contextual Graph',
    outputContract: 'Classified Anomalies with Confidence Score & Root-Cause Chains',
    demoScenario: {
      title: 'Dwell Time Anomaly Detection',
      description: 'Simulate truck stuck at Mumbai W04 staging dock exceeding 90-minute threshold.',
      triggerLabel: 'Simulate Reason Engine',
    },
  },
  {
    id: 4,
    slug: 'predict',
    name: 'PHASE 4: PREDICT',
    subtitle: 'ETA Forecasting, Congestion Simulation & Failure Forecasts',
    status: 'DORMANT',
    badgeLabel: 'DORMANT MODULE • PLANNED',
    description:
      'Simulates future network states 30–240 minutes ahead based on live traffic, weather patterns, historical driver pacing, and terminal queue depths.',
    coreCapabilities: [
      'Probabilistic Dynamic ETA Estimation',
      'Downstream Warehouse Queue Buildup Forecasting',
      'Network-wide SLA Breach Likelihood Scoring',
      'Route Weather Disruption Modeling',
    ],
    architecturalComponents: [
      'Spatial-Temporal Forecasting Network',
      'Monte Carlo Queue Simulator',
      'Highway Corridor Velocity Forecaster',
    ],
    inputContract: 'Current World Model State + Historical Baseline Trajectories',
    outputContract: 'Future Network State Projections (t + 15m, 30m, 60m, 120m)',
    demoScenario: {
      title: 'Corridor Congestion ETA Delay Prediction',
      description: 'Forecast 45-minute delay on Delhi-Mumbai Corridor due to monsoon weather front.',
      triggerLabel: 'Simulate Prediction Model',
    },
  },
  {
    id: 5,
    slug: 'decide',
    name: 'PHASE 5: DECIDE',
    subtitle: 'Autonomous Countermeasure Generation & Dispatch Optimization',
    status: 'DORMANT',
    badgeLabel: 'DORMANT MODULE • PLANNED',
    description:
      'Formulates actionable operational countermeasures (dynamic rerouting, load shifting, backup scanner reassignment, air-bridge escalation) with cost-benefit trade-offs.',
    coreCapabilities: [
      'Constrained Multi-Objective Optimization',
      'Dynamic Carrier & Route Rerouting',
      'Buffer Inventory Load Redistribution',
      'Automated SLA Risk Mitigation Strategies',
    ],
    architecturalComponents: [
      'Operational Decision Matrix',
      'Linear / Mixed-Integer Programming Optimizer',
      'Human-in-the-Loop Policy Engine',
    ],
    inputContract: 'Predicted Bottlenecks + Constraint Matrix (Cost, SLA, Capacity)',
    outputContract: 'Ranked Operational Directives with Expected Savings',
    demoScenario: {
      title: 'Autonomous Reroute Recommendation',
      description: 'Generate dynamic detour for Truck T-184 via Western Bypass to avoid Mumbai port gridlock.',
      triggerLabel: 'Simulate Decision Matrix',
    },
  },
  {
    id: 6,
    slug: 'communicate',
    name: 'PHASE 6: COMMUNICATE',
    subtitle: 'Multi-Agent Closed-Loop Dispatch & Execution',
    status: 'DORMANT',
    badgeLabel: 'DORMANT MODULE • PLANNED',
    description:
      'Executes decisions across the physical ecosystem via conversational multi-agent systems, SMS/Push driver alerts, automated WMS priority reordering, and ERP webhooks.',
    coreCapabilities: [
      'Autonomous Driver Push Notifications & Turn-by-Turn Rerouting',
      'Automated WMS Rescheduling Commands',
      'Customer Proactive Delivery Re-estimation Advisories',
      'Audit Log of Autonomous vs Operator Actions',
    ],
    architecturalComponents: [
      'Multi-Agent Communication Gateway',
      'Outbound Telephony / SMS Dispatcher',
      'Partner ERP Webhook Engine',
    ],
    inputContract: 'Approved Decision Directives from Phase 5',
    outputContract: 'Outbound API Triggers + Driver Acknowledgment Receipts',
    demoScenario: {
      title: 'Automated Driver Dispatch Broadcast',
      description: 'Dispatch rerouting directive and mobile notification to Driver Rajesh Kumar (T-184).',
      triggerLabel: 'Simulate Autonomous Dispatch',
    },
  },
];
