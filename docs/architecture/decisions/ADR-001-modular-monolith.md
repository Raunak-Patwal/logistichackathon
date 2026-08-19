# ADR-001: Adoption of Modular Monolith Architecture

## Status
**Accepted**

## Date
2026-08-17

## Context
Logistics intelligence systems require clear domain separation (Parcels, Shipments, Trucks, Drivers, Warehouses, Events). When designing such platforms, a common early mistake is prematurely adopting a distributed microservices architecture. Microservices introduce severe distributed systems overhead:
* Network latency between microservices.
* Complex distributed transactions (2PC, Saga patterns) across database boundaries.
* High DevOps and deployment complexity.
* Difficult local testing and end-to-end debugging.

Conversely, an unstructured monolithic application ("spaghetti monolith") quickly results in tight coupling, leaked database abstractions, and impossible refactoring.

## Decision
We will build the **AI Logistics Brain** as a **Modular Monolith** using Clean Architecture / Hexagonal Architecture principles.

The codebase will be organized into distinct internal architectural layers:
```text
API → Application → Domain ← Infrastructure
```

Key rules:
1. **Pure Domain**: The `domain/` package has zero third-party framework dependencies (no FastAPI, SQLAlchemy, Redis, or Pydantic).
2. **Clear Interfaces**: Application orchestrators interact with persistence exclusively through repository interfaces (Dependency Inversion Principle).
3. **Cohesive Subdomains**: Domain entities (Parcel, Truck, Shipment, Warehouse) reside in isolated subdirectories with explicit public APIs.
4. **Single Shared Process & Database**: All modules run within a single process and communicate via in-memory method calls, while sharing a single PostgreSQL transactional database.

## Alternatives Considered
1. **Microservices from Day 1**:
   * *Rejected*: Premature decomposition without stable domain boundaries causes severe friction, network overhead, and complex eventual consistency issues during rapid hackathon/Phase 1 development.
2. **Standard Layered MVC (Django/Rails style)**:
   * *Rejected*: Direct coupling between API controllers, ORM models, and database fields leads to domain logic leaking into SQL queries and view serializers.

## Consequences
### Positive
* **High Developer Velocity**: Single codebase, immediate in-process debugging, instant feedback loops.
* **Strong Invariants & ACID Consistency**: Transactions can span related entities atomically in a single PostgreSQL commit without distributed sagas.
* **Extraction-Ready**: Because boundaries and repository interfaces are strictly enforced, individual subdomains (e.g. Ingestion Service, Tracking Service) can be extracted into standalone services in the future without domain refactoring.
* **Exceptional Testability**: Domain rules can be tested in sub-milliseconds without mocking databases or spinning up network services.

### Negative / Tradeoffs
* Developers must remain disciplined to not bypass module boundaries (e.g., calling infrastructure directly from domain logic).
* All subdomains scale together in a single deployable unit for now.
