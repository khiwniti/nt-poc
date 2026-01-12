# Implementation Plan: Enterprise Facility Manager (Microservices Architecture)

**Branch**: `001-enterprise-facility-manager` | **Date**: 2026-01-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-enterprise-facility-manager/spec.md`

## Summary

Transform the current React facility monitoring POC into a **production-ready, enterprise-grade microservices-based 3D facility management system**. The system consists of 5 independently deployable services on Railway: **Frontend** (React SPA), **Backend** (API + SSE), **MLOps** (MLflow + RUL prediction), **Database** (PostgreSQL + TimescaleDB), and **Sensor Simulator** (replaceable data generator).

Core features include real-time monitoring of 100+ facilities with 2-second update latency, interactive 3D zone visualizations maintaining 30+ FPS, intelligent alert management with **LINE OA notifications**, AI-powered insights via conversational interface (web + LINE), **ML-powered battery RUL (Remaining Useful Life) prediction**, ISO-compliant reporting with version control, and geospatial overview with regional filtering.

**Technical Approach**: Migrate from monolithic POC to microservices architecture with React 18.3 frontend, Python/Node.js backend, MLflow-based ML pipeline, and PostgreSQL database. All services containerized for Railway deployment with clear service boundaries, API contracts, and fault isolation. Sensor simulator provides realistic test data and is completely replaceable with real sensors via configuration change.

## Technical Context

### Frontend Service
**Language/Version**: TypeScript 5.8.2
**Primary Dependencies**:
- React 18.3.1 (UI framework - functional components only)
- Three.js 0.165.0 + @react-three/fiber 8.16.8 + @react-three/drei 9.108.4 (3D visualization)
- @google/genai 1.34.0 (AI integration via backend proxy)
- Leaflet 1.9.4 (Map visualization)
- Zustand 4.5+ (State management - research decision)
- Lucide-react 0.294.0 (Icons)

**Build Tool**: Vite 6.2+
**Testing**: Vitest + React Testing Library (unit/integration), Playwright (E2E) - research decision
**Storage**: IndexedDB via Dexie.js for offline support and caching - research decision
**Target Platform**: Modern web browsers (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+) with WebGL support
**Bundle Size**: <500KB gzipped

### Backend Service
**Language**: Python 3.11+ with FastAPI **OR** Node.js 20+ with Express.js (to be determined in Phase 0 research)
**API Framework**: FastAPI (Python) or Express.js (Node.js) with OpenAPI/Swagger documentation
**Real-time**: Server-Sent Events (SSE) for sensor data streaming - research decision
**Authentication**: JWT-based with refresh tokens
**External Integrations**:
- **LINE Messaging API** for notifications and chatbot
- **Google Gemini API** for AI insights (proxied from frontend)
- Health check endpoints (/health, /ready) for Railway

### MLOps Service
**Language**: Python 3.11+
**ML Framework**: MLflow 2.10+ for experiment tracking, model registry, and deployment
**ML Libraries**: scikit-learn, XGBoost, or PyTorch for RUL prediction models
**Model**: Battery Remaining Useful Life (RUL) predictor using sensor time-series data
**Data Pipeline**: Prefect or Airflow for training orchestration (to be determined in Phase 0 research)
**Model Serving**: MLflow Model Serving or FastAPI wrapper
**Monitoring**: Model drift detection, prediction confidence tracking

### Database Service
**Primary Database**: PostgreSQL 15+ with TimescaleDB extension for time-series sensor data
**Schema Management**: Alembic (Python) or Knex (Node.js) for versioned migrations
**Backup Strategy**: Automated daily backups with point-in-time recovery (Railway managed)
**Performance**: Indexed queries for real-time data access, partitioned time-series tables

### Sensor Simulator Service
**Language**: Python 3.11+ **OR** Node.js 20+ (to be determined in Phase 0 research)
**Purpose**: Generate realistic sensor data for testing and development
**API Compliance**: MUST match real sensor API contract exactly (same endpoints, payloads, timing)
**Replaceability**: MUST be swappable with real sensors via configuration change only (no code changes in production services)
**Data Generation**: Configurable failure modes, realistic signal patterns, time-series simulation

### Deployment Architecture
**Platform**: Railway (single workspace with 5 separate services)
**Containerization**: Docker for all services
**Networking**: Internal Railway networking for inter-service communication
**Public Access**: Frontend and Backend only (API Gateway pattern)
**Service Discovery**: Environment variables (BACKEND_URL, MLOPS_URL, DATABASE_URL, SIMULATOR_URL)
**Deployment Strategy**: Zero-downtime with health checks, rolling updates, automated rollback

### Performance Goals
- **Initial Load**: <3 seconds on 3G connection for critical dashboard
- **3D Rendering**: 30+ FPS with 50 zones
- **Real-time Updates**: <2 seconds latency from sensor event to UI update
- **AI Response**: <5 seconds for chat queries
- **ML Inference**: <1 second for RUL prediction (95th percentile)
- **LINE Notifications**: <10 seconds from alert trigger to LINE delivery
- **Bundle Size**: Frontend <500KB gzipped

### Constraints
- MUST support 100 facilities with real-time monitoring
- MUST handle 1000 concurrent users
- MUST maintain 99.9% uptime for core features (Backend + Database)
- MUST provide fallbacks for 3D, AI, and ML failures
- MUST comply with ISO-27001/22301/50001 reporting standards
- MUST ensure Sensor Simulator is completely replaceable with real sensors
- MUST respect LINE API rate limits (500 messages/hour per user)
- MUST isolate service failures (one service failure cannot cascade)

### Scale/Scope
- 100 facilities across 5 regions (Northern, Northeastern, Central, Eastern, Southern Thailand)
- 10-50 zones per facility
- 10,000 alerts/day capacity
- 1000 concurrent users
- 100+ RUL predictions/hour for battery health monitoring
- Existing codebase: ~15KB TypeScript (POC phase, needs production hardening + backend + ML services)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Component-Based Architecture
**Status**: ✅ PASS
**Evidence**: Existing component structure follows principle (components/Dashboard/, Map/, Chat/, Reports/, etc.)
**Action**: Maintain structure, ensure new features follow pattern

### II. Type Safety First (NON-NEGOTIABLE)
**Status**: ⚠️ REVIEW REQUIRED
**Evidence**: types.ts exists (117 lines) with core types (Branch, Alert, Report, Zone, Sensor)
**Gap**: Missing types for MetricHistory, ChatSession, User entity, RUL predictions, LINE messages
**Action**: Expand types.ts and create shared/types/ for cross-service type definitions in Phase 1

### III. 3D Performance & Optimization
**Status**: ⚠️ VALIDATION REQUIRED
**Evidence**: Existing Battery3DView and Mall3DView components use Three.js
**Gap**: No React.memo, no geometry instancing, no throttling observed in codebase
**Action**:
- **MUST** implement memoization for 3D components before production
- **MUST** implement InstancedMesh geometry instancing (research decision)
- **MUST** add performance monitoring (Web Vitals + Sentry)
- **MUST** implement progressive loading for complex scenes
**Justification**: POC→Production transition, essential for 30+ FPS requirement

### IV. Observability & Monitoring
**Status**: ❌ VIOLATION - MUST ADDRESS
**Evidence**: No logging infrastructure, error boundaries, or telemetry detected
**Gap**: Critical for production facility monitoring system with microservices
**Action**:
- **MUST** implement error boundary components (Priority: P1)
- **MUST** add logging service abstraction with structured logs (Priority: P1)
- **MUST** integrate Sentry for error tracking across all services (Priority: P1)
- **MUST** add distributed tracing for inter-service calls (Priority: P2)
- **MUST** add user action telemetry for critical paths (Priority: P2)
- **MUST** monitor ML model performance and drift (Priority: P1 for MLOps)
**Justification**: Non-negotiable for production enterprise system - microservices architecture requires comprehensive observability

### V. Progressive Enhancement & Graceful Degradation
**Status**: ❌ VIOLATION - MUST ADDRESS
**Evidence**: No fallback UI components, no error recovery mechanisms
**Gap**: 3D failures would break UX, AI unavailability would block features, ML service downtime would halt predictions, LINE API failures would block notifications
**Action**:
- **MUST** implement 2D fallback for 3D visualizations (Priority: P1)
- **MUST** implement AI service error handling with manual alternatives (Priority: P1)
- **MUST** add offline detection and graceful degradation (Priority: P2)
- **MUST** implement fallback notification channels when LINE unavailable (email, in-app) (Priority: P1)
- **MUST** gracefully handle ML service unavailability (show cached predictions or skip) (Priority: P2)
**Justification**: Emergency facility management scenarios require system resilience - service failures cannot prevent core monitoring

### VI. Microservices Architecture & Service Isolation *(NEW - Constitution v2.0.0)*
**Status**: ⚠️ DESIGN REQUIRED
**Evidence**: Current POC is monolithic frontend, no backend/ML/simulator services exist
**Gap**: Need to design service boundaries, API contracts, inter-service communication, and Railway deployment
**Action**:
- **MUST** define clear service boundaries and domain responsibilities (Phase 0 research)
- **MUST** design API contracts with OpenAPI 3.0 specs (Phase 1)
- **MUST** implement circuit breakers and timeouts for inter-service calls (Phase 2)
- **MUST** ensure Sensor Simulator API exactly matches real sensor contract (Phase 1)
- **MUST** containerize all services with Docker (Phase 2)
- **MUST** configure Railway workspace with 5 services (Phase 2)
**Justification**: Foundation for scalable, maintainable system with independent deployment and failure isolation

### VII. MLOps & Predictive Analytics *(NEW - Constitution v2.0.0)*
**Status**: ⚠️ DESIGN REQUIRED
**Evidence**: No ML infrastructure exists, need to build from scratch
**Gap**: Need RUL prediction model, MLflow setup, training pipeline, model serving
**Action**:
- **MUST** research RUL prediction algorithms and datasets (Phase 0 research)
- **MUST** set up MLflow tracking server on Railway (Phase 1)
- **MUST** design training pipeline with data versioning (Phase 1)
- **MUST** implement model serving API with confidence intervals (Phase 2)
- **MUST** add model drift detection and retraining triggers (Phase 2)
**Justification**: Battery RUL prediction is mission-critical for maintenance planning and preventing facility downtime

### VIII. External Integrations & Notifications *(NEW - Constitution v2.0.0)*
**Status**: ⚠️ DESIGN REQUIRED
**Evidence**: No LINE OA integration exists, only in-app notifications
**Gap**: Need LINE Messaging API integration, webhook handling, rate limiting, fallback mechanisms
**Action**:
- **MUST** research LINE Messaging API capabilities and rate limits (Phase 0 research)
- **MUST** design webhook endpoint for bidirectional chat (Phase 1)
- **MUST** implement rate limiting with exponential backoff (Phase 2)
- **MUST** ensure chatbot parity between web and LINE (same AI backend) (Phase 2)
- **MUST** add fallback notification channels (email, in-app) (Phase 2)
**Justification**: LINE is dominant messaging platform in Thailand - mobile-first notifications critical for facility managers

### Gate Decision
**Status**: ⚠️ CONDITIONAL PASS with extensive research and design phase required
**Proceed to Phase 0**: YES - critical research needed for microservices architecture, MLOps, LINE OA
**Production Deployment**: BLOCKED until all 8 principles satisfied
**Re-check After Phase 1**: REQUIRED - validate service boundaries, API contracts, ML pipeline design

## Project Structure

### Documentation (this feature)

```text
specs/001-enterprise-facility-manager/
├── plan.md              # This file (/speckit.plan output) - UPDATED for microservices
├── research.md          # Phase 0: Technical decisions (NEEDS UPDATE for new services)
├── data-model.md        # Phase 1: Entity schemas (NEEDS UPDATE for RUL, LINE messages)
├── quickstart.md        # Phase 1: Developer onboarding (NEEDS UPDATE for services)
├── contracts/           # Phase 1: API specifications (NEEDS MAJOR UPDATE)
│   ├── api-contracts.yaml        # OpenAPI 3.0 REST API spec (Backend service)
│   ├── sse-events.yaml           # Server-Sent Events specification
│   ├── mlops-api.yaml            # MLOps service inference API
│   ├── simulator-api.yaml        # Sensor Simulator API (MUST match real sensors)
│   ├── line-webhook.yaml         # LINE OA webhook specifications
│   └── ai-chat-protocol.md       # AI service integration contract
├── checklists/          # Quality validation
│   └── requirements.md  # Spec validation (already completed ✅)
└── tasks.md             # Phase 2: Implementation tasks (/speckit.tasks - NEEDS REGENERATION)
```

### Source Code (monorepo structure)

**Target Structure** (after migration):

```text
facility-manager/                     # Repository root (monorepo)
│
├── frontend/                         # Frontend Service (React SPA)
│   ├── src/
│   │   ├── components/              # React components (existing POC structure)
│   │   │   ├── Auth/                # LoginForm.tsx
│   │   │   ├── Chat/                # AIChatWidget.tsx
│   │   │   ├── Dashboard/           # FacilityPanel, GlobalOverview, IntelligenceHub
│   │   │   ├── Map/                 # ThailandMap.tsx
│   │   │   ├── Reports/             # ReportManager.tsx
│   │   │   ├── Settings/            # SettingsPage.tsx
│   │   │   ├── Utility/             # UtilityCenter.tsx
│   │   │   └── ui/                  # AlertSystem.tsx, reusable primitives
│   │   ├── services/                # API clients for backend
│   │   │   ├── apiClient.ts        # REST API client
│   │   │   ├── sseClient.ts        # SSE connection manager
│   │   │   ├── geminiService.ts    # AI integration (proxied via backend)
│   │   │   └── mlopsClient.ts      # RUL prediction API client
│   │   ├── store/                   # Zustand state management
│   │   │   ├── facilitySlice.ts
│   │   │   ├── alertSlice.ts
│   │   │   └── index.ts
│   │   ├── db/                      # IndexedDB (Dexie.js)
│   │   │   ├── schema.ts
│   │   │   └── operations.ts
│   │   ├── hooks/                   # Custom React hooks
│   │   │   ├── useEventSource.ts   # SSE hook
│   │   │   └── useRULPrediction.ts # ML prediction hook
│   │   ├── contexts/                # React contexts
│   │   │   └── ErrorContext.tsx
│   │   ├── types.ts                 # TypeScript types (existing 117 lines + expansions)
│   │   ├── constants.ts             # Application constants
│   │   └── main.tsx                 # Entry point
│   ├── tests/                       # Vitest + Playwright tests
│   │   ├── unit/
│   │   ├── integration/
│   │   └── e2e/
│   ├── public/                      # Static assets
│   ├── Dockerfile                   # Frontend container
│   ├── nginx.conf                   # Production web server config
│   ├── package.json
│   ├── vite.config.ts
│   ├── vitest.config.ts
│   └── playwright.config.ts
│
├── backend/                          # Backend Service (API + SSE)
│   ├── src/                         # (Python) or (Node.js) - TBD in Phase 0
│   │   ├── api/                     # REST endpoint handlers
│   │   │   ├── facilities.py       # Facility CRUD
│   │   │   ├── zones.py            # Zone data for 3D
│   │   │   ├── alerts.py           # Alert management
│   │   │   ├── reports.py          # ISO report operations
│   │   │   ├── chat.py             # AI chat sessions
│   │   │   └── line_webhook.py     # LINE OA webhook handler
│   │   ├── models/                  # Database models (ORM)
│   │   │   ├── facility.py
│   │   │   ├── zone.py
│   │   │   ├── sensor.py
│   │   │   ├── alert.py
│   │   │   ├── report.py
│   │   │   ├── user.py
│   │   │   ├── metric_history.py
│   │   │   └── chat_session.py
│   │   ├── services/                # Business logic
│   │   │   ├── alert_service.py
│   │   │   ├── rul_service.py      # Calls MLOps service
│   │   │   └── notification_service.py  # LINE OA integration
│   │   ├── realtime/                # SSE handlers
│   │   │   ├── sse_manager.py
│   │   │   └── sensor_stream.py
│   │   ├── integrations/            # External API clients
│   │   │   ├── line_client.py      # LINE Messaging API
│   │   │   ├── gemini_client.py    # Google Gemini API
│   │   │   └── mlops_client.py     # MLOps service client
│   │   ├── middleware/              # Auth, logging, error handling
│   │   │   ├── auth.py             # JWT verification
│   │   │   └── logging.py          # Structured logging
│   │   ├── config/                  # Configuration
│   │   │   ├── settings.py         # Environment variables
│   │   │   └── database.py         # DB connection
│   │   └── main.py                  # FastAPI/Express app entry
│   ├── tests/                       # pytest or jest tests
│   ├── migrations/                  # Alembic/Knex migrations
│   ├── Dockerfile                   # Backend container
│   ├── requirements.txt (or package.json)
│   └── alembic.ini (or knexfile.js)
│
├── mlops/                            # MLOps Service (MLflow + Model Serving)
│   ├── src/
│   │   ├── training/                # Model training scripts
│   │   │   ├── train_rul.py        # RUL model training
│   │   │   ├── preprocess.py       # Data preprocessing
│   │   │   └── evaluate.py         # Model evaluation
│   │   ├── inference/               # Model serving API
│   │   │   ├── predict_api.py      # FastAPI inference endpoint
│   │   │   └── model_loader.py     # Load model from MLflow
│   │   ├── monitoring/              # Model drift detection
│   │   │   ├── drift_detector.py
│   │   │   └── metrics_tracker.py
│   │   └── mlflow/                  # MLflow configuration
│   │       ├── mlflow_config.py
│   │       └── experiments/         # Experiment tracking
│   ├── models/                      # Serialized model artifacts
│   ├── data/                        # Training datasets
│   │   ├── raw/
│   │   ├── processed/
│   │   └── validation/
│   ├── notebooks/                   # Jupyter notebooks for exploration
│   ├── tests/                       # Model tests
│   ├── Dockerfile                   # MLOps container
│   ├── requirements.txt
│   └── mlflow_tracking_uri.txt      # MLflow server config
│
├── sensor-simulator/                 # Sensor Simulator Service
│   ├── src/                         # (Python) or (Node.js) - TBD in Phase 0
│   │   ├── generators/              # Signal generation logic
│   │   │   ├── temperature_gen.py
│   │   │   ├── humidity_gen.py
│   │   │   ├── power_gen.py
│   │   │   ├── battery_gen.py      # Battery degradation simulation for RUL
│   │   │   └── failure_modes.py    # Configurable failure scenarios
│   │   ├── api/                     # Sensor API implementation
│   │   │   ├── readings_endpoint.py  # MUST match real sensor API
│   │   │   └── health_check.py
│   │   └── config/                  # Simulation scenarios
│   │       ├── scenarios.yaml       # Pre-configured test scenarios
│   │       └── sensor_config.yaml   # Sensor metadata
│   ├── tests/                       # API contract tests
│   ├── Dockerfile                   # Simulator container
│   └── requirements.txt (or package.json)
│
├── shared/                           # Shared code across services
│   ├── contracts/                   # OpenAPI specs, JSON schemas
│   │   ├── openapi/
│   │   └── schemas/
│   └── types/                       # Shared TypeScript/Python types
│       ├── facility.ts / .py
│       ├── alert.ts / .py
│       └── rul_prediction.ts / .py
│
├── docs/                             # Project documentation
│   ├── architecture/                # Architecture decision records (ADRs)
│   │   ├── 001-microservices.md
│   │   ├── 002-mlops-pipeline.md
│   │   ├── 003-line-integration.md
│   │   └── 004-railway-deployment.md
│   ├── api/                         # API documentation (generated from OpenAPI)
│   └── deployment/                  # Railway deployment guides
│       ├── railway-setup.md
│       ├── service-configuration.md
│       └── rollback-procedures.md
│
├── specs/                            # Feature specifications (SpecKit)
│   └── 001-enterprise-facility-manager/  # This feature
│
├── .github/                          # CI/CD workflows
│   └── workflows/
│       ├── frontend-ci.yml
│       ├── backend-ci.yml
│       ├── mlops-ci.yml
│       └── deploy-railway.yml
│
├── docker-compose.yml                # Local development environment
├── railway.json                      # Railway configuration
└── README.md                         # Project overview
```

**Structure Decision**: Monorepo with service separation for Railway deployment. All services in single repository with clear boundaries. Docker Compose for local development, Railway for production deployment.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

### IV. Observability & Monitoring - VIOLATION JUSTIFIED
**Complexity Added**: Sentry integration, structured logging, distributed tracing, error boundaries
**Justification**: Production enterprise system monitoring critical infrastructure requires comprehensive observability. Microservices architecture mandates distributed tracing to debug inter-service issues. Cost: Sentry $1-3K/month, development time: 2-3 weeks.
**Mitigation**: Start with basic Sentry + structured logging (Phase 2), add distributed tracing in Phase 3 after core features stable.

### V. Progressive Enhancement - VIOLATION JUSTIFIED
**Complexity Added**: 2D fallback UI, offline support with IndexedDB, fallback notification channels, ML service unavailability handling
**Justification**: Emergency facility management cannot depend on 3D rendering, AI, or external APIs. Facility managers need core monitoring even when advanced features fail. Cost: Additional 2D components, IndexedDB implementation, fallback logic throughout application.
**Mitigation**: Implement fallbacks incrementally per user story. 2D fallback with US1 (monitoring), AI fallback with US4 (AI chat), LINE fallback with notification implementation.

### VI. Microservices Architecture - NEW REQUIREMENT
**Complexity Added**: 5 separate services, Docker containers, inter-service communication, API contracts, service discovery, Railway configuration
**Justification**: Scalability, independent deployment, fault isolation, team autonomy. Sensor simulator must be replaceable. ML pipeline requires separate service for resource isolation. Cost: Infrastructure complexity, additional development/deployment overhead.
**Mitigation**: Start with 3 core services (Frontend, Backend, Database) in Phase 2. Add MLOps in Phase 3, Sensor Simulator in Phase 4. Use Railway's managed services to reduce operational complexity.

### VII. MLOps & Predictive Analytics - NEW REQUIREMENT
**Complexity Added**: MLflow setup, RUL prediction model, training pipeline, model serving API, drift detection
**Justification**: Battery RUL prediction is mission-critical for maintenance planning and preventing facility downtime. ML models require systematic lifecycle management (versioning, monitoring, retraining).
**Mitigation**: Start with simple RUL model (XGBoost regression) in Phase 3. Add advanced models and automated retraining in Phase 4. Use MLflow's managed features to minimize custom infrastructure.

### VIII. External Integrations - NEW REQUIREMENT
**Complexity Added**: LINE Messaging API, webhook handling, rate limiting, bidirectional chat, fallback channels
**Justification**: LINE is dominant messaging platform in Thailand. Mobile-first notifications critical for facility managers in emergency scenarios. Chatbot parity (web + LINE) provides consistent UX.
**Mitigation**: Implement LINE notifications first (Phase 2), add bidirectional chat in Phase 3. Implement rate limiting and fallbacks in Phase 4.

## Phase 0: Research & Technical Decisions

**Objective**: Resolve all "NEEDS CLARIFICATION" items and new architectural questions for microservices/MLOps/LINE OA

### Research Tasks (to be executed in parallel)

1. **Backend Language & Framework Decision**
   - **Question**: Python (FastAPI) vs. Node.js (Express.js) for backend service?
   - **Criteria**: TypeScript/JavaScript ecosystem consistency (favors Node.js), ML integration ease (favors Python), team expertise, performance benchmarks
   - **Output**: Decision document with rationale, selected stack, migration path from POC

2. **MLOps Pipeline Architecture**
   - **Question**: How to design RUL prediction model, training pipeline, and serving infrastructure?
   - **Research**:
     - RUL prediction algorithms (survival analysis, regression, LSTM time-series)
     - MLflow setup on Railway (tracking server, model registry, deployment)
     - Training data requirements (battery sensor time-series, degradation patterns)
     - Model serving options (MLflow native, FastAPI wrapper, batch vs. real-time)
     - Model monitoring and drift detection strategies
   - **Output**: MLOps architecture document with model design, pipeline diagram, monitoring strategy

3. **LINE OA Integration Strategy**
   - **Question**: How to integrate LINE Messaging API for notifications and bidirectional chat?
   - **Research**:
     - LINE Messaging API capabilities and rate limits (500 messages/hour per user)
     - Webhook setup for receiving LINE messages
     - Push notification vs. multicast messaging
     - LINE chatbot vs. AI chat widget - ensuring parity
     - Fallback notification channels (email, SMS, in-app)
   - **Output**: LINE integration document with API flow diagrams, rate limiting strategy, fallback mechanisms

4. **Sensor Simulator API Contract**
   - **Question**: How to design sensor API that simulator and real sensors both implement?
   - **Research**:
     - Real sensor hardware capabilities (assuming exists or will exist)
     - API endpoint design (REST vs. MQTT vs. custom protocol)
     - Data format specifications (JSON schema, units, timestamps)
     - Replaceability requirements (configuration-based switching)
     - Simulation scenarios (normal operation, failure modes, degradation)
   - **Output**: Sensor API contract (OpenAPI spec), replaceability design document

5. **Railway Deployment Configuration**
   - **Question**: How to configure Railway workspace with 5 services, networking, and secrets?
   - **Research**:
     - Railway service configuration (Dockerfile, railway.json)
     - Internal networking for service-to-service communication
     - Environment variable management for service discovery
     - Database setup (PostgreSQL + TimescaleDB on Railway)
     - Zero-downtime deployment strategies
     - Cost estimation for 5 services + database
   - **Output**: Railway deployment guide with configuration examples, networking diagram, cost breakdown

6. **Real-Time Data Architecture (SSE vs. WebSockets)** *(existing research task - needs update for backend)*
   - **Question**: SSE vs. WebSockets for real-time sensor data streaming?
   - **Research**: Already determined SSE in previous research - confirm compatibility with backend choice
   - **Output**: Update research.md with backend-specific SSE implementation guide

7. **Testing Strategy** *(existing research task - needs update for microservices)*
   - **Question**: How to test microservices architecture (unit, integration, E2E, contract tests)?
   - **Research**: Vitest for frontend already decided - add contract testing strategy (Pact or similar), E2E testing across services
   - **Output**: Update research.md with microservices testing strategy

8. **State Management** *(existing research task - confirmed Zustand)*
   - **Question**: State management for React frontend?
   - **Research**: Already determined Zustand - confirm compatibility with SSE and IndexedDB
   - **Output**: Update research.md with Zustand integration patterns for real-time data

9. **Data Persistence** *(existing research task - confirmed IndexedDB)*
   - **Question**: Offline support and caching strategy?
   - **Research**: Already determined IndexedDB + Dexie.js - confirm schema design for all entities
   - **Output**: Update research.md with complete IndexedDB schema for offline support

10. **Performance Monitoring** *(existing research task - needs update for microservices)*
    - **Question**: How to monitor performance across all services?
    - **Research**: Sentry + Lighthouse CI + Web Vitals already decided for frontend - add backend/ML monitoring
    - **Output**: Update research.md with distributed monitoring strategy (APM, tracing)

11. **3D Optimization Techniques** *(existing research task - confirmed InstancedMesh)*
    - **Question**: Three.js optimization for 50 zones at 30+ FPS?
    - **Research**: Already determined InstancedMesh geometry instancing - confirm implementation details
    - **Output**: Update research.md with InstancedMesh implementation guide

### Research Output

All research findings will be consolidated into **research.md** with decision rationale, alternatives considered, and implementation guidelines.

## Phase 1: Design & Contracts

**Prerequisites**: research.md complete with all decisions finalized

### Deliverables

1. **data-model.md** - NEEDS UPDATE for microservices
   - Existing entities: Facility, Zone, Sensor, Alert, Report, User, MetricHistory, ChatSession
   - **NEW entities**: RULPrediction, LINEMessage, LINEUser, SensorReading (simulator schema)
   - Relationships and foreign keys
   - Validation rules from requirements
   - State transitions (alert status, report workflow, model lifecycle)
   - Database schema for PostgreSQL + TimescaleDB

2. **contracts/** - NEEDS MAJOR UPDATE for all services
   - **api-contracts.yaml**: Backend REST API (OpenAPI 3.0)
     - Facility endpoints: GET /facilities, GET /facilities/{id}, GET /facilities/{id}/zones
     - Alert endpoints: GET /alerts, POST /alerts, PATCH /alerts/{id}/status
     - Report endpoints: GET /reports, POST /reports, GET /reports/{id}, PUT /reports/{id}
     - Chat endpoints: POST /chat/sessions, POST /chat/sessions/{id}/messages
     - Metrics endpoints: GET /metrics/history
     - **NEW**: LINE webhook endpoint: POST /webhooks/line
   - **sse-events.yaml**: Server-Sent Events specification
     - Event types: facility_update, alert_created, sensor_reading, rul_prediction
   - **mlops-api.yaml**: MLOps service inference API (OpenAPI 3.0)
     - POST /predict/rul - Battery RUL prediction endpoint
     - GET /models - List available models
     - GET /models/{id}/metrics - Model performance metrics
   - **simulator-api.yaml**: Sensor Simulator API (MUST match real sensor contract)
     - POST /sensors/readings - Submit sensor reading
     - GET /sensors/{id}/readings - Query sensor history
     - GET /health - Health check
   - **line-webhook.yaml**: LINE OA webhook specifications
     - POST /webhooks/line - Receive LINE messages
     - Message types: text, follow, unfollow

3. **quickstart.md** - NEEDS MAJOR UPDATE for microservices
   - Local development setup (Docker Compose)
   - Service-by-service setup instructions
   - Environment variable configuration
   - Database migration commands
   - MLflow server setup
   - LINE OA testing with ngrok
   - Test data seeding (via Sensor Simulator)

4. **Agent context update**:
   - Run `.specify/scripts/bash/update-agent-context.sh claude`
   - Add technologies: FastAPI/Express.js, MLflow, LINE Messaging API, Railway, TimescaleDB

## Phase 2: Implementation Planning

**Prerequisites**: Phase 1 complete, all design artifacts validated

### Task Generation (/speckit.tasks)

Generate **tasks.md** with implementation tasks organized by:
1. **Service-based phases**: Setup → Shared Infrastructure → Frontend → Backend → MLOps → Simulator → Integration
2. **User story phases** (within Frontend): US1 (monitoring) → US2 (3D) → US3 (alerts) → US4 (AI) → US5 (reports) → US6 (geospatial)
3. **Cross-cutting phases**: LINE OA integration, testing, deployment, polish

**Task organization principles**:
- Each service can be implemented independently after shared infrastructure
- Frontend user stories are independently testable
- MLOps service can be developed in parallel with backend
- Sensor Simulator developed last (provides test data for all services)

## Notes

- **Migration Strategy**: Start with existing POC frontend, build backend/database first, then migrate frontend to use backend API, then add MLOps and Sensor Simulator
- **Service Development Order**: Database → Backend → Frontend (migration) → MLOps → Sensor Simulator
- **Critical Path**: Backend + Database + Frontend US1 + Frontend US2 = MVP (8-10 weeks)
- **LINE OA Integration**: Can be added incrementally after MVP (notifications first, bidirectional chat later)
- **ML Pipeline**: RUL prediction can be developed in parallel with core features, integrated in Phase 3

## Re-Evaluation Triggers

Re-run constitution check if:
- Backend language decision changes architecture assumptions
- Railway cost projections exceed budget constraints
- LINE API rate limits prove insufficient for scale requirements
- Real sensor API contract becomes available and differs from assumptions
- ML model accuracy doesn't meet production requirements

---

**Status**: Phase 0 research required | **Next Step**: Execute 11 parallel research tasks → Consolidate findings into research.md
