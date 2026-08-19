# Mentor & Architecture Defense Question Bank

This document compiles foundational questions and concise, technically rigorous answers for architecture reviews, mentor check-ins, and hackathon judging.

---

### Q1: Why not build a microservices architecture from day one?
**Answer:**
> "Microservices introduce distributed data consistency challenges (e.g. distributed transactions, eventual consistency lag) and high DevOps overhead before domain boundaries have stabilized. By building a Modular Monolith with strict hexagonal/clean architecture boundaries, we gain atomic transactional integrity, zero network hop latency, and rapid development speed. Because our domain interfaces and repositories are strictly decoupled from infrastructure, any module can be extracted into an independent microservice in the future if scaling requirements demand it."

---

### Q2: How do you guarantee the operational state and the event audit log don't get out of sync?
**Answer:**
> "We execute the append to the immutable `events` table and the update to the materialized `world_model_*` entity tables within the exact same PostgreSQL ACID database transaction. Either both succeed atomically or both roll back. This completely eliminates dual-write drift and ensures 100% data consistency without distributed consensus protocols."

---

### Q3: How does the system handle duplicate event delivery (e.g., network retries)?
**Answer:**
> "We enforce idempotency at two defensive layers:
> 1. **Application Layer Check**: The ingestion pipeline checks whether the incoming `event_id` has already been recorded in the Event Store before executing domain rules.
> 2. **Database Constraint**: A unique index on `events.event_id` guarantees that even under concurrent duplicate requests, duplicate insertion fails deterministically and returns a safe, idempotent response without mutating the state twice."

---

### Q4: Why is the Domain layer strictly decoupled from frameworks like FastAPI and SQLAlchemy?
**Answer:**
> "Decoupling domain models from third-party frameworks preserves business logic purity. Our state machines and business rules (e.g., parcel cannot be marked delivered unless it was in transit) are pure Python. This allows unit tests to execute in milliseconds without spinning up a database or HTTP server, and protects core business rules from framework version changes or migration churn."

---

### Q5: What is ULEO and why is it needed?
**Answer:**
> "ULEO stands for **Universal Logistics Event Ontology**. Real-world logistics ecosystems receive incompatible event schemas from GPS trackers, WMS scanners, ERPs, and carrier APIs. ULEO provides a normalized canonical event schema with strict metadata (correlation ID, causation ID, entity type, timestamp, payload) so that the core Logistics Brain processes all events uniformly regardless of source."

---

### Q6: How does the system prevent invalid state transitions (e.g. jumping from CREATED to DELIVERED)?
**Answer:**
> "We enforce an explicit finite state machine within our domain aggregates. Direct assignment like `parcel.status = 'DELIVERED'` is forbidden. Instead, state transitions occur exclusively through domain methods (e.g. `parcel.apply_transition(event)`), which validate that the requested transition is legal according to domain invariants before transitioning."
