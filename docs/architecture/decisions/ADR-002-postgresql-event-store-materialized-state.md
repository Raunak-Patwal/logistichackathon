# ADR-002: PostgreSQL as Unified Event Store and Materialized World Model

## Status
**Accepted**

## Date
2026-08-17

## Context
A logistics intelligence brain requires two fundamental data representations:
1. **Event History (Immutable Audit Log)**: An unalterable record of all occurrences (`PARCEL_SCANNED`, `TRUCK_DEPARTED`, `DELAY_REPORTED`) for complete auditability, replayability, and historical forensics.
2. **Operational World Model (Materialized State)**: The current operational belief of the world (where is Parcel X right now? What is the current fuel and location of Truck Y?) for fast, low-latency relational querying and dashboard visualization.

We need a database architecture that supports both representations reliably without premature infrastructure sprawl (e.g. introducing Kafka, Neo4j, Cassandra, or Redis simultaneously).

## Decision
We choose **PostgreSQL 16** as our unified data store, holding both:
1. **`events` table**: Append-only, immutable event log containing structured event metadata, entity IDs, timestamps, and JSONB payloads.
2. **`world_model_*` tables**: Materialized entity tables (`parcels`, `shipments`, `trucks`, `drivers`, `warehouses`) updated transactionally as events are processed.

```text
Incoming ULEO Event
        ↓
[Database Transaction BEGIN]
  ├── Append to `events` table (Immutable Log)
  └── Update/Upsert `world_model_*` table (Current Operational State)
[Database Transaction COMMIT]
```

Key mechanics:
* **Atomic Dual-Write**: The event append and the state materialization happen within the *same* PostgreSQL transaction. This eliminates out-of-sync states between the event log and the operational world model.
* **Idempotency Index**: Unique constraint on `(event_id)` ensures duplicate events are detected immediately and rejected safely.
* **Optimistic Locking**: Materialized entity tables contain `version` counters to prevent lost updates during concurrent event processing.

## Alternatives Considered
1. **Full Event Sourcing (No materialized tables, replaying on read)**:
   * *Rejected*: Complex query latency for operational dashboards, requiring complex snapshotting mechanisms and asynchronous read projections.
2. **Kafka + PostgreSQL (Distributed Streaming)**:
   * *Rejected*: Introduces dual-write failure modes, distributed consistency lag, and high operational overhead unnecessary for Phase 1.
3. **Document Store / NoSQL (MongoDB)**:
   * *Rejected*: Lacks strong relational constraints, ACID multi-table transactions across entities, and mature SQL query capabilities.

## Consequences
### Positive
* **Zero Discrepancy Risk**: Events and materialized state are atomically committed in a single ACID transaction.
* **Simplicity & Operational Excellence**: Single database engine to deploy, back up, and monitor.
* **High Performance**: PostgreSQL easily handles thousands of events/sec on modest hardware with proper B-Tree/GIN indexes.
* **Auditability & Replayability**: Complete operational history is preserved indefinitely in the `events` table.

### Negative / Tradeoffs
* Write throughput is bounded by single-node PostgreSQL write capacity (sufficient for hackathon and early production scale).
* In later phases with extreme high-throughput IoT telematics, time-series partitioning (TimescaleDB / PostgreSQL native partitioning) may be required.
