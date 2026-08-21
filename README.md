# AI Logistics Brain

**AI Logistics Brain** is an end-to-end, network-level operational logistics intelligence platform designed to observe, understand, reason over, predict, and optimize supply-chain operations in real time.

---

## 🧠 Core Intelligence Lifecycle

The platform implements a continuous, closed-loop intelligence cycle:

```text
External Event (WMS/IoT/GPS) 
  → 1. OBSERVE (ULEO Ingestion, Idempotency Guard, Atomic Dual-Commit)
  → 2. UNDERSTAND (Context Builder, Multi-Entity Blast Radius, Cold-Chain Risk)
  → 3. REASON (AI Root Cause Analysis & Causation Chain)
  → 4. PREDICT (Cascading Congestion & SLA Risk Projection)
  → 5. DECIDE (Ranked Recovery Options & Financial Trade-Off Matrix)
  → 6. ACT (Operator Execution, ACTION_EXECUTED Event, World Model Sync)
```

---

## 🏛️ Architectural Guarantees & ADRs

1. **Pure Domain Layer (Rule 1)**: All domain models, aggregates, invariants, and Finite State Machines in `src/domain/` have zero dependencies on FastAPI, SQLAlchemy, or HTTP transports.
2. **Authoritative Backend (Rule 2)**: The FastAPI backend and PostgreSQL database serve as the single source of truth for all entity state, event logs, and operational metrics.
3. **Canonical ULEO v0.1 Event Ontology (Rule 3)**: Standardized event envelope containing typed `EventMetadata` (`event_id`, `timestamp`, `source`, `correlation_id`, `causation_id`, `idempotency_key`) and structured payloads.
4. **Immutable Append-Only Event Store (Rule 4)**: The `event_store` table is strictly append-only; historical events are never modified or deleted.
5. **Atomic Dual-Commit (ADR-002 / Rule 5)**: Every domain event and its corresponding materialized world-model state mutation are committed in the **exact same PostgreSQL ACID transaction**, preventing split-brain states.
6. **Deterministic Idempotency Guard (Rule 6)**: The database unique index on `event_store.idempotency_key` guarantees that duplicated external event transmissions never mutate state twice.
7. **Strict State Machine Invariants (Rule 7)**: Parcels enforce deterministic transitions (`CREATED` $\rightarrow$ `PACKED` $\rightarrow$ `LOADED` $\rightarrow$ `DISPATCHED` $\rightarrow$ `DELIVERED`). Illegal transitions trigger structured `INVALID_STATE_TRANSITION` errors and rollback.
8. **Point-in-Time Event Replay (Rule 9)**: `EventReplayService` folds over immutable historical events to deterministically reconstruct an entity's exact aggregate state at any step without reading materialized tables.

---

## 📁 Repository Structure

```text
logistichackathon/
├── backend/                     # FastAPI + SQLAlchemy 2.0 Async + PostgreSQL 16
│   ├── src/
│   │   ├── domain/              # Pure domain models (Parcel, Incident, ULEO, Value Objects)
│   │   ├── application/         # Services (Parcel, ContextBuilder, Reasoning, EventReplay, Action)
│   │   ├── infrastructure/      # Repositories, Database Models, Session Management, Seeder
│   │   ├── api/                 # REST Routes (/events, /parcels, /trucks, /incidents, /network)
│   │   ├── config/              # Typed Pydantic Settings
│   │   └── main.py              # Application Entrypoint & Lifespan Handlers
│   ├── tests/                   # 27 Unit, Integration, API, and E2E Tests
│   └── pyproject.toml           # Backend dependencies and tools
│
├── frontend/                    # Vite + React 18 + Three.js / R3F + Zustand + TailwindCSS
│   ├── src/
│   │   ├── components/world3d/  # 3D Digital Twin (India Map, Hubs, Trucks, Particle Pulses)
│   │   ├── components/views/    # Operational Cockpit Views (World, Stream, Graph, Incidents, Studio)
│   │   ├── domain/              # TypeScript ULEO ontology & state machine validators
│   │   ├── store/               # Zustand World Model & Event Stores
│   │   └── api/                 # REST Client with live backend sync & simulation fallback
│
├── docs/                        # Architecture specs, C4 diagrams, ADRs, and Mentor Defense Q&A
└── docker-compose.yml           # Multi-container orchestration (PostgreSQL 16)
```

---

## 🚀 Quickstart Guide

### 1. Run Backend
```bash
cd backend
python -m venv .venv
# On Windows:
.venv\Scripts\Activate.ps1
# On Linux/macOS:
source .venv/bin/activate

pip install -e ".[dev]"
uvicorn src.main:app --reload --port 8000
```
- API Documentation (Swagger UI): `http://localhost:8000/docs`
- Health Check: `http://localhost:8000/health`

### 2. Run Frontend
```bash
cd frontend
npm install
npm run dev
```
- Cockpit UI: `http://localhost:5173`

---

## 🎬 Signature Demo: Delhi W12 Scanner Outage

To demonstrate the full 6-phase intelligence lifecycle:

1. **Observe**: Scanner failure event occurs at Delhi Northern Super-Hub (W12).
2. **Understand**: Context Builder compiles incident dossier (`INC-8921`):
   - Storage capacity reaches 95%
   - 18 cold-storage parcels and 12 medicine shipments buffered
   - 18 trucks at risk of delay
3. **Reason**: AI Reasoning Engine computes Root Cause Analysis:
   - Primary Cause: *UPS Battery Backup Failure causing unhandled brownout on Bay B*
   - Confidence: *87.4%*
4. **Decide**: AI Decision Matrix presents 3 ranked recovery options:
   - **Option A (Recommended)**: *Activate Redundant Scanner Bay B* (ETA 6m, Cost ₹1,500, Risk: Low)
   - **Option B**: *Shift Outbound Loading to Dock 4* (ETA 18m, Cost ₹4,200, Risk: Medium)
   - **Option C**: *Divert Inbound Trucks to Jaipur* (ETA 45m, Cost ₹18,500, Risk: High)
5. **Act**: Dispatcher executes Option A:
   - API commits `ACTION_EXECUTED` domain event to `event_store`.
   - `WarehouseRecord.status` is restored to `OPTIMAL`.
   - Incident `INC-8921` is marked `RESOLVED`.
   - 3D Digital Twin triggers green recovery pulse and parcel flow resumes.

---

## 🧪 Automated Testing

Run the full pytest suite (Unit, Integration, API, Trained ML Models, Resilience, and E2E):
```bash
pytest backend -v
```

All 39 test cases pass out of the box with 100% success rate across all domains, Scikit-Learn & XGBoost ML pipelines, RAG vector searches, JWT authentications, circuit breakers, and rate limiters.

---

## 📖 Complete Master Documentation
For the complete technical guide explaining all architectural layers, phases, APIs, data flows, and code examples, see:
👉 [SYSTEM_ARCHITECTURE_AND_FEATURE_GUIDE.md](file:///c:/Users/Lenovo/Desktop/logistichackathon/SYSTEM_ARCHITECTURE_AND_FEATURE_GUIDE.md)

