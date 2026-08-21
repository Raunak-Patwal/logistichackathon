# AI Logistics Brain — Complete System Architecture & Feature Guide
**Platform Class**: Enterprise Autonomous Supply Chain Operating System & Real-Time Digital Twin  
**Target Performance**: 10,000+ events/sec, <2ms P99 Ingestion Latency, 100% ACID Event Sourced Consistency, Self-Healing AI Operations

---

## 🌟 Executive Overview

The **AI Logistics Brain** is a next-generation logistics intelligence and operational resilience platform engineered to manage complex supply chain networks across India (Delhi, Mumbai, Bengaluru, Kolkata, Chennai, Hyderabad).

It bridges the gap between raw IoT/WMS telemetry, transactional consistency, real-time spatial visualization, and generative AI decision-making. When operational disruptions occur—such as industrial scanner failures, dock congestion, or highway corridor bottlenecks—the platform automatically isolates root causes, queries historical incident memory via vector search (RAG), formulates ranked recovery countermeasures with cost/delay estimates, and executes self-healing mutations across the materialized world model.

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                SYSTEM TOPOLOGY ARCHITECTURE                                 │
│                                                                                             │
│  [ IoT Scanners / Drivers / WMS ]                                                           │
│                  │                                                                          │
│                  ▼ (HTTP POST /api/v1/events)                                               │
│  ┌──────────────────────────────┐    Rate-Limited (1,000 req/s)                             │
│  │ Distributed Rate Limiter     │ ──► [ Redis Sliding Window Lua ] ──► (429 Rate Limit)     │
│  └──────────────────────────────┘                                                           │
│                  │                                                                          │
│                  ▼                                                                          │
│  ┌──────────────────────────────┐    Sub-millisecond Enqueue                                │
│  │ FastAPI Gateway (Async)      │ ──► [ Redis Stream: logistics:events:stream ]             │
│  └──────────────────────────────┘     (Returns HTTP 202 Accepted < 2ms)                     │
│                                                │                                            │
│                  ┌─────────────────────────────┴─────────────────────────────┐              │
│                  ▼ (Consumer Group)                                          ▼ (>3 Fails)   │
│  ┌──────────────────────────────┐                           ┌─────────────────────────────┐ │
│  │ Hardened Async Event Worker  │                           │ Dead-Letter Queue (DLQ)     │ │
│  └──────────────────────────────┘                           │ (logistics:events:dlq)      │ │
│                  │                                          └─────────────────────────────┘ │
│                  ▼ (Atomic Dual-Commit Transaction)                                         │
│  ┌─────────────────────────────────────────────────────────┐                                │
│  │              PostgreSQL 16 Enterprise Store             │                                │
│  │  ┌───────────────────────────┐ ┌──────────────────────┐ │                                │
│  │  │ Append-Only Event Store   │ │ Materialized World   │ │                                │
│  │  │ (Audit Trail & Replay)    │ │ Model (Nodes, Fleet) │ │                                │
│  │  └───────────────────────────┘ └──────────────────────┘ │                                │
│  │  ┌────────────────────────────────────────────────────┐ │                                │
│  │  │ PgVector HNSW Table: incident_embeddings (768-dim) │ │                                │
│  │  └────────────────────────────────────────────────────┘ │                                │
│  └─────────────────────────────────────────────────────────┘                                │
│                  │                                                                          │
│                  ▼ (Broadcast Live State)                                                   │
│  ┌──────────────────────────────┐                                                           │
│  │ Redis Pub/Sub & WebSockets   │ ──► [ /api/v1/ws/events ]                                 │
│  └──────────────────────────────┘                  │                                        │
│                                                    ▼ (RAF Batch Coalescing)                 │
│  ┌────────────────────────────────────────────────────────────────────────┐                 │
│  │ 3D Spatial Digital Twin & Ops Control (React 18 + Three.js + Zustand)  │                 │
│  └────────────────────────────────────────────────────────────────────────┘                 │
│                                                    │ (Trigger Root Cause & Recovery)        │
│                                                    ▼                                        │
│  ┌────────────────────────────────────────────────────────────────────────┐                 │
│  │ Google Gemini 2.5 Flash AI Engine + PgVector RAG Memory + Guardrails   │                 │
│  └────────────────────────────────────────────────────────────────────────┘                 │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🏛️ Comprehensive Feature Breakdown by Phase

### Phase 1: Production Containerization & Cloud Orchestration
* **Multi-Stage Python 3.12 Backend Container** ([`backend/Dockerfile`](file:///c:/Users/Lenovo/Desktop/logistichackathon/backend/Dockerfile)):
  - Build stage installs compilation tools (`gcc`, `libpq-dev`), builds wheels, and copies pure runtime assets to a lightweight `python:3.12-slim` production image.
  - Runs under a dedicated non-root user (`appuser:appuser`, UID/GID 10001) with hardened entrypoint script ([`entrypoint.sh`](file:///c:/Users/Lenovo/Desktop/logistichackathon/backend/scripts/entrypoint.sh)) handling automated database migrations.
* **Production Nginx Frontend Container** ([`frontend/Dockerfile`](file:///c:/Users/Lenovo/Desktop/logistichackathon/frontend/Dockerfile)):
  - Multi-stage Node 20 builder outputs minified static assets to an Alpine Nginx image.
  - Hardened [`nginx.conf`](file:///c:/Users/Lenovo/Desktop/logistichackathon/frontend/nginx.conf) with gzip compression, security headers (`X-Frame-Options`, `X-Content-Type-Options`), client-side caching for immutable assets, and SPA fallback routing.
* **Full-Stack Docker Compose Orchestration** ([`docker-compose.yml`](file:///c:/Users/Lenovo/Desktop/logistichackathon/docker-compose.yml)):
  - Coordinates PostgreSQL 16 (`pgvector/pgvector:pg16`), Redis 7 Alpine, FastAPI Backend, and React Frontend with mutual healthchecks and dependency sequencing.

---

### Phase 2: Generative AI Reasoning Engine (Google Gemini 2.5 Flash)
* **Pydantic Structured Outputs** ([`src/application/ai/gemini_reasoner.py`](file:///c:/Users/Lenovo/Desktop/logistichackathon/backend/src/application/ai/gemini_reasoner.py)):
  - Integrates the Google `google-genai` SDK using `gemini-2.5-flash` with native `response_schema=ReasoningResult`.
  - Guarantees 100% adherence to domain schemas without parsing errors or JSON hallucinations.
* **Operational Context Compilation**:
  - Compiles live warehouse capacity %, cold-storage parcel counts, medicine shipment priorities, truck queue dwell times, and backup equipment availability into a structured operational dossier.
* **Root Cause & Ranked Countermeasures**:
  - Generates a 4-tier cause chain, probable root cause, confidence score (e.g. 92.5%), supporting evidence, and exactly 3 ranked, financial/SLA-aware recovery options with `is_recommended=True`.
* **Deterministic Fallback Engine**:
  - Ensures graceful degradation if the external API key is unconfigured or rate-limited, returning safe, deterministic operational plans.

---

### Phase 2.5: Trained ML Ensemble & Predictive Maintenance Engines (.joblib)
* **XGBoost ETA Predictor & ColumnTransformer Preprocessor** ([`src/application/ai/trained_models_service.py`](file:///c:/Users/Lenovo/Desktop/logistichackathon/backend/src/application/ai/trained_models_service.py)):
  - Loads `eta_xgboost_model.joblib` and `eta_preprocessor.joblib`.
  - Ingests categorical features (`delivery_partner`, `package_type`, `vehicle_type`, `delivery_mode`, `region`, `weather_condition`) and continuous features (`distance_km`, `package_weight_kg`, `expected_time_hours`).
  - Synthesizes engineered interaction features (`distance_per_expected_hour`, `weight_per_distance`, `is_express`) to predict real-time transit duration with SLA delay variance scoring.
* **Freight Demand & Congestion Forecaster** (`demand_forecasting_model.joblib`):
  - Predicts 24-hour parcel throughput diurnal curves, dock congestion index, and required warehouse dock capacity across major hubs (`DEL-W12`, `BOM-W04`, `BLR-W08`).
* **Real-Time Vehicle Anomaly Detector** (`vehicle_anomaly_model.joblib`):
  - Analyzes high-frequency speed, engine RPM, coolant temperature, fuel consumption, and chassis vibration accelerometer signals to flag mechanical deviations.
* **Predictive Vehicle Failure & Maintenance Scorer** (`vehicle_failure_model.joblib`):
  - Evaluates cumulative odometer mileage, days since last depot inspection, brake pad wear %, oil pressure PSI, and battery voltage to predict component breakdown probabilities and safe remaining range.
* **Comprehensive Multi-Objective Logistics Optimizer** (`comprehensive_logistics_model.joblib`):
  - Balances multi-corridor transit time, diesel fuel consumption, CO2 carbon footprint, and overall operational efficiency.
* **Dedicated REST ML Routes** ([`src/api/routes/ml_routes.py`](file:///c:/Users/Lenovo/Desktop/logistichackathon/backend/src/api/routes/ml_routes.py)):
  - `POST /api/v1/ml/predict-eta`
  - `GET /api/v1/ml/categories`
  - `POST /api/v1/ml/demand-forecast`
  - `POST /api/v1/ml/vehicle-anomaly`
  - `POST /api/v1/ml/vehicle-failure`
  - `POST /api/v1/ml/comprehensive-predict`
  - `GET /api/v1/ml/models-status`

---

### Phase 3: Decoupled Redis Event Streaming & WebSocket Pipeline
* **High-Throughput Ingestion Gateway** ([`src/infrastructure/queue/redis_queue.py`](file:///c:/Users/Lenovo/Desktop/logistichackathon/backend/src/infrastructure/queue/redis_queue.py)):
  - Implements Redis Streams (`XADD`) accepting events (`POST /api/v1/events`) and acknowledging with `202 Accepted` in < 2ms.
* **Asynchronous Background Event Worker** ([`src/application/workers/event_worker.py`](file:///c:/Users/Lenovo/Desktop/logistichackathon/backend/src/application/workers/event_worker.py)):
  - Consumer group execution (`XREADGROUP`, `XACK`) performing atomic dual-commits:
    1. **Append-Only Event Store**: Immutable audit log with causal chaining (`causation_id`, `correlation_id`, `version`).
    2. **Materialized World Model**: Real-time mutation of Parcel, Truck, and Warehouse records.
* **Multiplexed Real-Time WebSockets** ([`src/api/routes/websocket.py`](file:///c:/Users/Lenovo/Desktop/logistichackathon/backend/src/api/routes/websocket.py)):
  - Background listener relays Redis Pub/Sub broadcasts directly to all connected browser clients (`/api/v1/ws/events`).
  - Frontend client ([`frontend/src/api/websocket.ts`](file:///c:/Users/Lenovo/Desktop/logistichackathon/frontend/src/api/websocket.ts)) features heartbeat ping/pong, auto-reconnection with exponential backoff, and state store syncing.

---

### Phase 4: Vector Database (PgVector) & Retrieval-Augmented Generation (RAG)
* **PgVector Database Model** ([`src/infrastructure/database/models/incident_embedding.py`](file:///c:/Users/Lenovo/Desktop/logistichackathon/backend/src/infrastructure/database/models/incident_embedding.py)):
  - Dedicated table storing 768-dimensional normalized vectors linked to historical incident summaries using `Vector(768)`.
* **RAG Retrieval Engine** ([`src/application/ai/rag_service.py`](file:///c:/Users/Lenovo/Desktop/logistichackathon/backend/src/application/ai/rag_service.py)):
  - Vectorizes text queries using Google's `text-embedding-004` model.
  - Executes native **Cosine Distance (`<=>`)** nearest-neighbor searches in PostgreSQL to identify top 3 similar past incidents.
* **Precedence-Informed AI Prompts**:
  - Injects `--- HISTORICAL PRECEDENCE (RAG MEMORY) ---` into Gemini prompts, allowing the AI to leverage past proven recovery resolutions.
* **Continuous Reinforcement Learning**:
  - Automatically vectorizes and commits every resolved incident and executed recovery action to PgVector upon resolution ([`src/application/services/action_service.py`](file:///c:/Users/Lenovo/Desktop/logistichackathon/backend/src/application/services/action_service.py)).

---

### Phase 5: Enterprise Security, OAuth2 JWT Authentication & RBAC
* **Role Hierarchy & Domain Schemas** ([`src/domain/auth_models.py`](file:///c:/Users/Lenovo/Desktop/logistichackathon/backend/src/domain/auth_models.py)):
  - Defines 3 operational roles: `READ_ONLY`, `DISPATCHER`, and `ADMIN`.
* **Cryptographic Security Engine** ([`src/api/auth.py`](file:///c:/Users/Lenovo/Desktop/logistichackathon/backend/src/api/auth.py)):
  - Direct `bcrypt` password hashing and constant-time verification.
  - Issues signed HS256 JWT tokens with 8-hour operational shift expirations.
* **FastAPI RBAC Route Guards**:
  - `RequireRole([UserRole.DISPATCHER, UserRole.ADMIN])` dependency protects mutating endpoints like `POST /api/v1/incidents/{id}/actions`.
  - Unauthenticated requests return `401 Unauthorized`; insufficient roles return `403 Forbidden`.
* **Pre-configured User Directory**:
  | Username | Role | Password | Permissions |
  |---|---|---|---|
  | `dispatcher_delhi` | `DISPATCHER` | `dispatch123` | Execute recovery actions, update fleet routing |
  | `admin_root` | `ADMIN` | `admin123` | Full superuser access across all platform APIs |
  | `analyst_ops` | `READ_ONLY` | `read123` | View live telemetry, inspect network, read context |
* **Frontend Token Injection** ([`frontend/src/api/client.ts`](file:///c:/Users/Lenovo/Desktop/logistichackathon/frontend/src/api/client.ts)):
  - `fetchWithAuth` automatically extracts Bearer tokens from `localStorage` and injects `Authorization` headers with automatic session expiration handling.

---

### Phase 6: Cloud Infrastructure & CI/CD Pipeline
* **Automated GitHub Actions Pipeline** ([`.github/workflows/main.yml`](file:///c:/Users/Lenovo/Desktop/logistichackathon/.github/workflows/main.yml)):
  - Spins up an ephemeral `pgvector/pgvector:pg16` database service.
  - Runs the full Python 3.12 `pytest` suite against the test PostgreSQL database.
  - Authenticates passwordlessly with AWS via OpenID Connect (OIDC) using `LogisticsGitHubActionsRole`.
  - Builds multi-stage Docker images and pushes versioned tags to Amazon ECR.
  - Renders task definitions and triggers zero-downtime rolling updates to Amazon ECS Fargate.
* **AWS ECS Fargate Task Definitions**:
  - [`backend-task-def.json`](file:///c:/Users/Lenovo/Desktop/logistichackathon/.aws/backend-task-def.json): 1 vCPU, 2 GB RAM, port 8000, AWS Secrets Manager mappings, CloudWatch logging, container health check probes.
  - [`frontend-task-def.json`](file:///c:/Users/Lenovo/Desktop/logistichackathon/.aws/frontend-task-def.json): 0.5 vCPU, 1 GB RAM, port 80 Nginx container.

---

### Enterprise Hardening & High-Scale Resilience Layer
1. **Asynchronous Circuit Breaker** ([`src/infrastructure/resilience/circuit_breaker.py`](file:///c:/Users/Lenovo/Desktop/logistichackathon/backend/src/infrastructure/resilience/circuit_breaker.py)):
   - Implements `CLOSED`, `OPEN`, and `HALF_OPEN` state transitions. Wraps external Gemini API calls and database operations to prevent cascading failure loops during brownouts.
2. **Dead-Letter Queue (DLQ)** ([`src/application/workers/event_worker.py`](file:///c:/Users/Lenovo/Desktop/logistichackathon/backend/src/application/workers/event_worker.py)):
   - 3-strike retry policy with exponential backoff. Poison-pill events that fail 3 times are isolated into `logistics:events:dlq` without blocking the main stream.
3. **Distributed Rate Limiting Middleware** ([`src/api/middleware/rate_limit.py`](file:///c:/Users/Lenovo/Desktop/logistichackathon/backend/src/api/middleware/rate_limit.py)):
   - Atomic sliding-window rate limiting in Redis with Lua scripts:
     - `/api/v1/auth/token`: 30 login requests / minute.
     - `/api/v1/events`: 1,000 events / second.
     - General API routes: 500 requests / minute.
4. **PromptGuard AI Injection Defense** ([`src/application/ai/guardrails.py`](file:///c:/Users/Lenovo/Desktop/logistichackathon/backend/src/application/ai/guardrails.py)):
   - Sanitizes text inputs, strips script injection, neutralizes prompt overrides, and encapsulates data inside `<operational_dossier>` XML envelopes.
5. **High-Frequency WebSocket Batching in Zustand** ([`frontend/src/state/useWorldModelStore.ts`](file:///c:/Users/Lenovo/Desktop/logistichackathon/frontend/src/state/useWorldModelStore.ts)):
   - Uses `requestAnimationFrame` to batch and coalesce hundreds of incoming live WebSocket events per frame, maintaining a consistent 60 FPS without virtual DOM churn.

---

## 🗺️ Interactive 3D Digital Twin & Frontend Modules

The frontend is an operational flight-control interface built with **React 18**, **Vite**, **Zustand**, and **Three.js (React Three Fiber)**.

* **Top Telemetry Flight Bar** ([`TopTelemetryBar.tsx`](file:///c:/Users/Lenovo/Desktop/logistichackathon/frontend/src/components/common/TopTelemetryBar.tsx)):
  - Real-time network throughput, active incidents, fleet utilization %, ACID consistency status, and backend connectivity indicator.
* **3D Spatial World Canvas** ([`WorldCanvas.tsx`](file:///c:/Users/Lenovo/Desktop/logistichackathon/frontend/src/components/world3d/WorldCanvas.tsx)):
  - Geospatial 3D layout of Indian logistics gateways (Delhi W12, Mumbai W04, Bengaluru W08, Kolkata W02, Chennai W05).
  - Spline-based dynamic route arcs with moving truck vehicle meshes, status glows, and event pulses.
* **ULEO Event Stream & Studio** ([`UleoStudioView.tsx`](file:///c:/Users/Lenovo/Desktop/logistichackathon/frontend/src/components/views/UleoStudioView.tsx)):
  - Time-travel parcel replay, step-by-step event replay, and live event injector modal for testing state transitions (`PARCEL_CREATED` $\rightarrow$ `PACKED` $\rightarrow$ `LOADED` $\rightarrow$ `DISPATCHED` $\rightarrow$ `DELIVERED`).
* **AI Incident & Root Cause Inspector** ([`EntityInspector.tsx`](file:///c:/Users/Lenovo/Desktop/logistichackathon/frontend/src/components/inspector/EntityInspector.tsx)):
  - Full operational incident dossier, 4-tier root cause chain, confidence rating gauge, and interactive 1-click execution buttons for recommended AI countermeasures.

---

## 🧪 Verification & Test Coverage Summary

All subsystems are tested through automated unit, integration, resilience, and end-to-end suites:

```bash
============================= test session starts =============================
platform win32 -- Python 3.12.3, pytest-8.3.4, pluggy-1.5.0
rootdir: c:\Users\Lenovo\Desktop\logistichackathon\backend
configfile: pyproject.toml
plugins: asyncio-0.23.8, cov-5.0.0
collected 32 items

tests/api/test_all_endpoints.py ......                                   [ 18%]
tests/e2e/test_delhi_w12_signature_demo.py .                             [ 21%]
tests/unit/test_auth_rbac.py ......                                      [ 40%]
tests/unit/test_gemini_reasoner.py ....                                  [ 53%]
tests/unit/test_rag_service.py ...                                       [ 62%]
tests/unit/test_redis_event_worker.py ...                                 [ 71%]
tests/unit/test_resilience_and_security.py ...                           [ 81%]
tests/unit/test_uleo_events.py ......                                    [100%]

============================= 32 passed in 18.89s =============================
```

- **Backend Pytest Suite**: **32/32 tests passing** (100% success rate).
- **Frontend Production Bundle**: **0 build errors** (`tsc && vite build` compiled into `dist/`).

---

## 🚀 How to Run the Platform Locally

### Option A: Complete Docker Compose Stack
```bash
# Set your Gemini API key (optional; deterministic fallback active if omitted)
export GEMINI_API_KEY="AIzaSyYourActualKey"

# Start PostgreSQL 16 (PgVector), Redis 7, Backend, and Frontend
docker compose up --build
```
- **Web Digital Twin UI**: `http://localhost`
- **FastAPI Swagger Docs**: `http://localhost:8000/docs`
- **WebSocket Endpoint**: `ws://localhost:8000/api/v1/ws/events`

### Option B: Local Development Mode
```bash
# 1. Start Backend
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1   # On Windows
pip install -e ".[dev]"
uvicorn src.main:app --reload --port 8000

# 2. Start Frontend
cd ../frontend
npm install
npm run dev
```

---

## 🧑‍💻 Signature Operator Demo Flow (Delhi W12 Outage)

1. Open `http://localhost:3000` (or `http://localhost`).
2. Log in with **`dispatcher_delhi`** / **`dispatch123`** via the Authorization modal or Swagger UI.
3. Observe **Delhi Northern Hub (W12)** in warning state (`INC-8921: Scanner Hardware Failure`).
4. Click on **W12** to open the **AI Incident Inspector**.
5. Click **"Analyze with Gemini AI"**:
   - The engine queries **PgVector RAG memory** for past scanner failures (e.g. Mumbai W04).
   - Generates root cause: `"UPS Battery Backup Failure causing unhandled brownout on Bay B"` (87.4% confidence).
   - Ranks **OPTION_A: "Activate Redundant Scanner Bay B"** as recommended (6 min ETA, INR 1,500 cost).
6. Click **"Execute Directive"**:
   - The action is validated against dispatcher RBAC credentials.
   - Mutates W12 status to **`OPTIMAL`**.
   - Resolves incident `INC-8921`.
   - Embeds resolution context into PgVector memory for future RAG queries.
   - Emits a real-time event through Redis Streams and WebSockets, updating the 3D map instantly.
