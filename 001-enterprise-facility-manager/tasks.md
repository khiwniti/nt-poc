# Tasks: Enterprise Facility Manager

**Feature**: 001-enterprise-facility-manager  
**Total Tasks**: 235  
**Last Updated**: 2026-01-09

## Progress Tracking

- **Phase 1: Setup** (25 tasks) - 0% complete
- **Phase 2: Foundational** (20 tasks) - 0% complete  
- **Phase 3: US1 - Real-Time Monitoring (P1)** (35 tasks) - 0% complete
- **Phase 4: US2 - 3D Visualization (P1)** (20 tasks) - 0% complete
- **Phase 5: US3 - Alert Management (P2)** (25 tasks) - 0% complete
- **Phase 6: US4 - AI Integration (P2)** (20 tasks) - 0% complete
- **Phase 7: US4 - MLOps Pipeline (P2)** (30 tasks) - 0% complete
- **Phase 8: US5 - Reporting (P3)** (20 tasks) - 0% complete
- **Phase 9: US6 - Geospatial (P3)** (15 tasks) - 0% complete
- **Phase 10: Polish** (25 tasks) - 0% complete

**Total**: 0/235 tasks complete (0%)

---

## Dependencies

**Story Completion Order**:
1. Phase 1 (Setup) → Phase 2 (Foundational) MUST complete first
2. Phase 3 (US1) + Phase 4 (US2) can run in parallel (both P1)
3. Phase 5 (US3) depends on Phase 3 (alerts need monitoring data)
4. Phase 6 (US4) + Phase 7 (US4-MLOps) can run in parallel
5. Phase 8 (US5) + Phase 9 (US6) independent, can run in parallel
6. Phase 10 (Polish) runs after all user stories complete

**Critical Path**: Setup → Foundational → US1 → US3 → US4 → Polish

---

## Implementation Strategy

**MVP Scope** (Recommended First Delivery):
- Phase 1: Setup
- Phase 2: Foundational  
- Phase 3: US1 (Real-Time Monitoring) - Core value proposition

**Incremental Delivery**:
- **Release 1 (MVP)**: US1 only - Real-time dashboard with facility monitoring
- **Release 2**: + US2 (3D Visualization) - Spatial intelligence
- **Release 3**: + US3 (Alert Management) + US4 (AI + MLOps) - Intelligence layer
- **Release 4**: + US5 (Reporting) + US6 (Geospatial) - Compliance and regional view

---

## Phase 1: Setup

**Goal**: Initialize all 5 microservices with proper project structure, dependencies, and configuration.

**Services**: Frontend, Backend, MLOps, Database, Simulator

### Infrastructure Setup

- [ ] T001 Create monorepo structure with services/ directory
- [ ] T002 [P] Initialize Frontend service (React 18 + Vite + TypeScript) in services/frontend/
- [ ] T003 [P] Initialize Backend service (Node.js 20 + Express + TypeScript) in services/backend/
- [ ] T004 [P] Initialize MLOps service (Python 3.11 + FastAPI) in services/mlops/
- [ ] T005 [P] Initialize Simulator service (Python 3.11 + FastAPI) in services/simulator/
- [ ] T006 Create Docker Compose file for local development in docker-compose.yml
- [ ] T007 Create Railway configuration file in railway.toml with 5 services

### Database Setup

- [ ] T008 Set up PostgreSQL 16 + TimescaleDB extension (local + Railway)
- [ ] T009 Create database migration system in services/backend/migrations/
- [ ] T010 Write Migration 01: Core entities (Facility, Zone, Sensor, Region, User)
- [ ] T011 Write Migration 02: TimescaleDB hypertable for SensorReading
- [ ] T012 Write Migration 03: Alert system with notification tracking
- [ ] T013 Write Migration 04: RULPrediction entity for MLOps
- [ ] T014 Write Migration 05: LINE integration (LINEUser, LINEMessage)
- [ ] T015 Write Migration 06: Report entity with version control
- [ ] T016 Write Migration 07: Performance indexes and optimizations
- [ ] T017 Configure TimescaleDB retention policies (90 days) and continuous aggregates

### Authentication & Security

- [ ] T018 Implement JWT authentication middleware in services/backend/src/middleware/auth.ts
- [ ] T019 Implement API key authentication for internal services in services/backend/src/middleware/apiKey.ts
- [ ] T020 Configure CORS policy in services/backend/src/middleware/cors.ts
- [ ] T021 Implement rate limiting (1000 req/min) in services/backend/src/middleware/rateLimit.ts

### Monitoring & Error Tracking

- [ ] T022 Set up Sentry for Backend service in services/backend/src/config/sentry.ts
- [ ] T023 Set up Sentry for Frontend service in services/frontend/src/config/sentry.ts
- [ ] T024 Set up Sentry for MLOps service in services/mlops/app/config/sentry.py
- [ ] T025 Create health check endpoints for all 5 services at /api/health

---

## Phase 2: Foundational

**Goal**: Build blocking prerequisites needed by all user stories (data models, state management, API clients).

**Blocks**: All user story phases

### Backend Core Services

- [ ] T026 Create database connection pool in services/backend/src/config/database.ts
- [ ] T027 Implement Facility model in services/backend/src/models/Facility.ts
- [ ] T028 Implement Zone model in services/backend/src/models/Zone.ts
- [ ] T029 Implement Sensor model in services/backend/src/models/Sensor.ts
- [ ] T030 Implement Region model in services/backend/src/models/Region.ts
- [ ] T031 Implement User model in services/backend/src/models/User.ts
- [ ] T032 [P] Create FacilityService in services/backend/src/services/FacilityService.ts
- [ ] T033 [P] Create ZoneService in services/backend/src/services/ZoneService.ts
- [ ] T034 [P] Create SensorService in services/backend/src/services/SensorService.ts

### Frontend Core Infrastructure

- [ ] T035 Set up React Router in services/frontend/src/App.tsx
- [ ] T036 Create facilityStore with Zustand in services/frontend/src/stores/facilityStore.ts
- [ ] T037 Create sensorStore with Zustand in services/frontend/src/stores/sensorStore.ts
- [ ] T038 Create uiStore with Zustand in services/frontend/src/stores/uiStore.ts
- [ ] T039 Create authStore with Zustand in services/frontend/src/stores/authStore.ts
- [ ] T040 Implement API client with Axios in services/frontend/src/services/apiClient.ts
- [ ] T041 Create Layout component in services/frontend/src/components/Layout/Layout.tsx

### Simulator Core

- [ ] T042 Implement realistic sensor data generation in services/simulator/app/simulator/generator.py
- [ ] T043 Create SSE stream endpoint (GET /api/v1/sensors/stream) in services/simulator/app/routes/stream.py
- [ ] T044 Implement "normal" baseline scenario in services/simulator/app/scenarios/normal.py
- [ ] T045 Configure Backend → Simulator integration via SENSOR_API_URL environment variable

---

## Phase 3: US1 - Real-Time Facility Monitoring Dashboard (P1)

**Goal**: Enable facility managers to monitor operational status, environmental conditions, and alerts across all facilities in real-time.

**Independent Test**: Open dashboard → verify all facility statuses display → simulate metric changes → confirm updates appear within 2 seconds.

### Backend API Endpoints

- [ ] T046 [US1] Implement GET /api/v1/facilities endpoint in services/backend/src/routes/facilities.ts
- [ ] T047 [US1] Implement POST /api/v1/facilities endpoint in services/backend/src/routes/facilities.ts
- [ ] T048 [US1] Implement GET /api/v1/facilities/:id endpoint in services/backend/src/routes/facilities.ts
- [ ] T049 [US1] Implement PATCH /api/v1/facilities/:id endpoint in services/backend/src/routes/facilities.ts
- [ ] T050 [US1] Implement GET /api/v1/facilities/:facilityId/zones endpoint in services/backend/src/routes/zones.ts
- [ ] T051 [US1] Implement GET /api/v1/sensors endpoint with filtering in services/backend/src/routes/sensors.ts
- [ ] T052 [US1] Implement GET /api/v1/sensors/:sensorId/readings endpoint with TimescaleDB queries in services/backend/src/routes/sensors.ts
- [ ] T053 [US1] Implement aggregation queries (hourly, daily) in services/backend/src/services/SensorService.ts

### Real-Time Streaming (SSE)

- [ ] T054 [US1] Implement SensorReading model with TimescaleDB in services/backend/src/models/SensorReading.ts
- [ ] T055 [US1] Create SSE endpoint (GET /api/v1/facilities/:facilityId/stream) in services/backend/src/routes/sse.ts
- [ ] T056 [US1] Implement SSE event publishing (sensor_update events) in services/backend/src/services/SSEService.ts
- [ ] T057 [US1] Configure Redis pub/sub for multi-server SSE in services/backend/src/config/redis.ts
- [ ] T058 [US1] Add heartbeat mechanism (30-second intervals) in services/backend/src/services/SSEService.ts

### Frontend Dashboard

- [ ] T059 [US1] Create Dashboard route (/) in services/frontend/src/pages/Dashboard/Dashboard.tsx
- [ ] T060 [US1] Implement FacilityCard component with status indicators in services/frontend/src/components/FacilityCard/FacilityCard.tsx
- [ ] T061 [US1] Implement MetricsPanel component (power, temp, humidity, PUE, occupancy) in services/frontend/src/components/MetricsPanel/MetricsPanel.tsx
- [ ] T062 [US1] Create RegionFilter component (5 regions) in services/frontend/src/components/RegionFilter/RegionFilter.tsx
- [ ] T063 [US1] Implement facility status color-coding (green/yellow/red) in services/frontend/src/utils/statusColors.ts
- [ ] T064 [US1] Add trend indicators (increasing/decreasing arrows) in services/frontend/src/components/TrendIndicator/TrendIndicator.tsx
- [ ] T065 [US1] Set up SSE connection in facilityStore in services/frontend/src/stores/facilityStore.ts
- [ ] T066 [US1] Implement real-time metric updates (<2s latency) in services/frontend/src/hooks/useRealtimeUpdates.ts
- [ ] T067 [US1] Create FacilityDetail panel component in services/frontend/src/components/FacilityDetail/FacilityDetail.tsx
- [ ] T068 [US1] Create ZoneList component in services/frontend/src/components/ZoneList/ZoneList.tsx
- [ ] T069 [US1] Create SensorDetail component in services/frontend/src/components/SensorDetail/SensorDetail.tsx
- [ ] T070 [US1] Add loading states and error boundaries in services/frontend/src/components/ErrorBoundary/ErrorBoundary.tsx

### Simulator Integration

- [ ] T071 [P] [US1] Generate realistic temperature data (19-35°C) in services/simulator/app/simulator/temperature.py
- [ ] T072 [P] [US1] Generate realistic humidity data (30-80%) in services/simulator/app/simulator/humidity.py
- [ ] T073 [P] [US1] Generate realistic pressure data (990-1020 hPa) in services/simulator/app/simulator/pressure.py
- [ ] T074 [P] [US1] Generate realistic air quality index (0-500 AQI) in services/simulator/app/simulator/air_quality.py
- [ ] T075 [P] [US1] Generate realistic battery health data in services/simulator/app/simulator/battery.py
- [ ] T076 [US1] Implement configurable update intervals (default 5000ms) in services/simulator/app/config/settings.py
- [ ] T077 [US1] Add noise and drift simulation in services/simulator/app/simulator/noise.py

### Seed Data

- [ ] T078 [US1] Create seed script with 10 facilities across 5 regions in services/backend/seeds/facilities.sql
- [ ] T079 [US1] Create seed script with 50 zones (5 per facility) in services/backend/seeds/zones.sql
- [ ] T080 [US1] Create seed script with 200 sensors (20 per facility) in services/backend/seeds/sensors.sql

---

## Phase 4: US2 - Interactive 3D Facility Visualization (P1)

**Goal**: Enable facility managers to visualize facility internal structure and zone status in 3D with spatial intelligence.

**Independent Test**: Open facility → click "View in 3D" → verify all zones render with correct colors → click zone → see sensor details → navigate smoothly at 30+ FPS.

### Backend 3D Support

- [ ] T081 [US2] Add 3D position fields (x, y, z) to Zone model in services/backend/src/models/Zone.ts
- [ ] T082 [US2] Add 3D dimensions fields (width, height, depth) to Zone model in services/backend/src/models/Zone.ts
- [ ] T083 [US2] Update Zone endpoints to return 3D data in services/backend/src/routes/zones.ts

### Frontend 3D Engine

- [ ] T084 [US2] Install Three.js dependencies (@react-three/fiber, @react-three/drei) in services/frontend/package.json
- [ ] T085 [US2] Create 3D view route (/facilities/:id/3d) in services/frontend/src/pages/Facility3D/Facility3D.tsx
- [ ] T086 [US2] Create Scene3D component with Canvas in services/frontend/src/components/Scene3D/Scene3D.tsx
- [ ] T087 [US2] Implement ZoneBox component (3D boxes) in services/frontend/src/components/Scene3D/ZoneBox.tsx
- [ ] T088 [US2] Implement zone color-coding by status in services/frontend/src/utils/zone3DColors.ts
- [ ] T089 [US2] Add OrbitControls for navigation in services/frontend/src/components/Scene3D/Controls.tsx
- [ ] T090 [US2] Implement zone click interaction in services/frontend/src/components/Scene3D/ZoneBox.tsx
- [ ] T091 [US2] Create ZoneTooltip component with sensor data in services/frontend/src/components/Scene3D/ZoneTooltip.tsx
- [ ] T092 [US2] Implement smooth color transitions on updates in services/frontend/src/components/Scene3D/ZoneBox.tsx

### Performance Optimization

- [ ] T093 [US2] Implement InstancedMesh for repeated geometries (10-50x FPS improvement) in services/frontend/src/components/Scene3D/InstancedZones.tsx
- [ ] T094 [US2] Add LOD (Level of Detail) for large facilities in services/frontend/src/components/Scene3D/LODZones.tsx
- [ ] T095 [US2] Implement FPS monitoring (target 30+) in services/frontend/src/components/Scene3D/Stats.tsx
- [ ] T096 [US2] Add 2D fallback for rendering failures in services/frontend/src/components/Facility2D/Facility2D.tsx
- [ ] T097 [US2] Implement Three.js object pooling in services/frontend/src/utils/objectPool.ts
- [ ] T098 [US2] Optimize bundle size (code splitting for 3D) in services/frontend/vite.config.ts
- [ ] T099 [US2] Configure WebGL settings for performance in services/frontend/src/components/Scene3D/Scene3D.tsx
- [ ] T100 [US2] Add performance profiling in dev mode in services/frontend/src/utils/performance.ts

---

## Phase 5: US3 - Intelligent Alert Management (P2)

**Goal**: Enable facility managers to efficiently manage incoming alerts, understand their context and severity, and track alert history.

**Depends On**: Phase 3 (US1) for facility monitoring data

**Independent Test**: Generate various alerts → verify filtering works → mark alerts as read → navigate to affected facilities → confirm alert persistence across sessions.

### Backend Alert System

- [ ] T101 [US3] Implement Alert model in services/backend/src/models/Alert.ts
- [ ] T102 [US3] Create alert generation service in services/backend/src/services/AlertService.ts
- [ ] T103 [US3] Implement threshold checking logic in services/backend/src/services/AlertService.ts
- [ ] T104 [US3] Add alert severity calculation (critical, warning, info) in services/backend/src/services/AlertService.ts
- [ ] T105 [US3] Implement alert categorization (equipment, energy, security) in services/backend/src/services/AlertService.ts
- [ ] T106 [US3] Implement GET /api/v1/alerts endpoint with filtering in services/backend/src/routes/alerts.ts
- [ ] T107 [US3] Implement POST /api/v1/alerts endpoint in services/backend/src/routes/alerts.ts
- [ ] T108 [US3] Implement PATCH /api/v1/alerts/:alertId endpoint (mark read/resolved) in services/backend/src/routes/alerts.ts
- [ ] T109 [US3] Create SSE alert_created event publishing in services/backend/src/services/SSEService.ts
- [ ] T110 [US3] Add alert pagination (50 per page) in services/backend/src/routes/alerts.ts
- [ ] T111 [US3] Implement alert retention and archiving (90 days) in services/backend/src/services/AlertService.ts

### LINE OA Integration

- [ ] T112 [US3] Register LINE Official Account at developers.line.biz
- [ ] T113 [US3] Implement LINEUser model in services/backend/src/models/LINEUser.ts
- [ ] T114 [US3] Implement LINEMessage model in services/backend/src/models/LINEMessage.ts
- [ ] T115 [US3] Implement webhook endpoint (POST /api/v1/line/webhook) in services/backend/src/routes/line.ts
- [ ] T116 [US3] Implement webhook signature verification (HMAC-SHA256) in services/backend/src/middleware/lineSignature.ts
- [ ] T117 [US3] Implement account linking endpoint (POST /api/v1/line/link) in services/backend/src/routes/line.ts
- [ ] T118 [US3] Generate 6-digit linking codes with 1-hour expiration in services/backend/src/services/LINEService.ts
- [ ] T119 [US3] Implement Flex Message templates for alerts in services/backend/src/templates/lineFlexMessages.ts
- [ ] T120 [US3] Implement notification preferences endpoint (PATCH /api/v1/line/preferences) in services/backend/src/routes/line.ts
- [ ] T121 [US3] Add rate limiting (500 msg/hr per user) in services/backend/src/services/LINEService.ts
- [ ] T122 [US3] Add exponential backoff for LINE API failures in services/backend/src/services/LINEService.ts
- [ ] T123 [US3] Implement email fallback mechanism in services/backend/src/services/NotificationService.ts

### Frontend Alert UI

- [ ] T124 [US3] Create alertStore with Zustand in services/frontend/src/stores/alertStore.ts
- [ ] T125 [US3] Create AlertDropdown component with unread badge in services/frontend/src/components/AlertDropdown/AlertDropdown.tsx
- [ ] T126 [US3] Implement alert filtering UI (severity, category) in services/frontend/src/components/AlertDropdown/AlertFilters.tsx
- [ ] T127 [US3] Add navigation to facility from alert in services/frontend/src/components/AlertDropdown/AlertItem.tsx
- [ ] T128 [US3] Implement alert status indicators (red for critical) in services/frontend/src/utils/alertColors.ts

### Simulator Test Scenarios

- [ ] T129 [P] [US3] Implement "alert_trigger" scenario in services/simulator/app/scenarios/alert_trigger.py
- [ ] T130 [P] [US3] Implement "temperature_spike" scenario (HVAC failure) in services/simulator/app/scenarios/temperature_spike.py

---

## Phase 6: US4 - AI Integration (P2)

**Goal**: Provide AI assistance to understand complex patterns, get recommendations, and receive predictive insights via conversational interface.

**Independent Test**: Open AI chat → ask about facility status → verify response within 5 seconds → ask for recommendations → execute suggested action → confirm system responds.

### Backend AI Service

- [ ] T131 [US4] Set up Google Gemini API integration in services/backend/src/config/gemini.ts
- [ ] T132 [US4] Implement ChatSession model in services/backend/src/models/ChatSession.ts
- [ ] T133 [US4] Implement POST /api/v1/chat/message endpoint in services/backend/src/routes/chat.ts
- [ ] T134 [US4] Build facility context aggregation in services/backend/src/services/ChatService.ts
- [ ] T135 [US4] Create action execution engine (navigate, filter, generate report) in services/backend/src/services/ActionExecutor.ts
- [ ] T136 [US4] Implement conversation history management in services/backend/src/services/ChatService.ts
- [ ] T137 [US4] Add AI response caching for common queries in services/backend/src/cache/aiCache.ts
- [ ] T138 [US4] Implement graceful AI service fallback in services/backend/src/services/ChatService.ts

### Frontend Chat Widget

- [ ] T139 [US4] Create chatStore with Zustand in services/frontend/src/stores/chatStore.ts
- [ ] T140 [US4] Create ChatWidget component in services/frontend/src/components/ChatWidget/ChatWidget.tsx
- [ ] T141 [US4] Implement MessageList with streaming in services/frontend/src/components/ChatWidget/MessageList.tsx
- [ ] T142 [US4] Create MessageInput component in services/frontend/src/components/ChatWidget/MessageInput.tsx
- [ ] T143 [US4] Implement action execution in frontend in services/frontend/src/services/actionExecutor.ts
- [ ] T144 [US4] Add loading indicators for AI responses in services/frontend/src/components/ChatWidget/LoadingIndicator.tsx
- [ ] T145 [US4] Implement conversation persistence in services/frontend/src/stores/chatStore.ts
- [ ] T146 [US4] Add error handling and retry logic in services/frontend/src/services/chatClient.ts

### LINE Bidirectional Chat

- [ ] T147 [US4] Route LINE user messages to Gemini in services/backend/src/services/LINEService.ts
- [ ] T148 [US4] Send AI responses back to LINE in services/backend/src/services/LINEService.ts
- [ ] T149 [US4] Handle LINE webhook events (message, follow, unfollow) in services/backend/src/routes/line.ts
- [ ] T150 [US4] Implement quiet hours enforcement in services/backend/src/services/LINEService.ts

---

## Phase 7: US4 - MLOps Pipeline (P2)

**Goal**: Implement battery Remaining Useful Life (RUL) prediction using ML models with MLflow tracking.

**Parallel With**: Phase 6 (US4 AI Integration)

**Independent Test**: Send sensor data → receive RUL prediction within 1 second → verify confidence intervals → trigger alert when RUL < 100 cycles.

### MLflow Setup

- [ ] T151 [US4] Set up MLflow tracking server on Railway in services/mlops/mlflow_server/
- [ ] T152 [US4] Configure experiment tracking for battery_rul_prediction in services/mlops/app/config/mlflow.py
- [ ] T153 [US4] Implement model registry integration in services/mlops/app/models/registry.py

### Feature Engineering

- [ ] T154 [P] [US4] Implement voltage statistics extraction (mean, std, min, max) in services/mlops/app/features/voltage.py
- [ ] T155 [P] [US4] Implement current statistics extraction in services/mlops/app/features/current.py
- [ ] T156 [P] [US4] Implement temperature statistics extraction in services/mlops/app/features/temperature.py
- [ ] T157 [US4] Implement cycle-based features (5 features) in services/mlops/app/features/cycles.py
- [ ] T158 [US4] Implement temporal features (5 features) in services/mlops/app/features/temporal.py
- [ ] T159 [US4] Implement health indicators (5 features) in services/mlops/app/features/health.py
- [ ] T160 [US4] Implement POST /api/v1/features/engineer endpoint in services/mlops/app/routes/features.py
- [ ] T161 [US4] Validate feature ranges and quality in services/mlops/app/features/validator.py

### Model Training

- [ ] T162 [US4] Implement XGBoost training pipeline in services/mlops/app/training/xgboost_trainer.py
- [ ] T163 [US4] Set up hyperparameter tuning in services/mlops/app/training/hyperparameters.py
- [ ] T164 [US4] Implement model evaluation (MAE, RMSE, R², MAPE) in services/mlops/app/training/evaluator.py
- [ ] T165 [US4] Create model versioning system (semantic versioning) in services/mlops/app/models/versioning.py
- [ ] T166 [US4] Implement model promotion workflow in services/mlops/app/models/promotion.py
- [ ] T167 [US4] Implement POST /api/v1/training/jobs endpoint in services/mlops/app/routes/training.py
- [ ] T168 [US4] Implement LSTM training pipeline (Phase 2) in services/mlops/app/training/lstm_trainer.py

### Prediction Service

- [ ] T169 [US4] Implement RULPrediction model in Backend in services/backend/src/models/RULPrediction.ts
- [ ] T170 [US4] Implement POST /api/v1/predictions/rul endpoint in MLOps in services/mlops/app/routes/predictions.py
- [ ] T171 [US4] Implement batch prediction endpoint in services/mlops/app/routes/predictions.py
- [ ] T172 [US4] Add prediction caching in services/mlops/app/cache/predictions.py
- [ ] T173 [US4] Implement confidence interval calculation in services/mlops/app/models/confidence.py
- [ ] T174 [US4] Create alert trigger for low RUL (<100 cycles) in services/backend/src/services/AlertService.ts
- [ ] T175 [US4] Integrate MLOps client in Backend in services/backend/src/clients/MLOpsClient.ts

### Monitoring & Drift Detection

- [ ] T176 [US4] Implement PSI calculation for drift detection in services/mlops/app/monitoring/drift.py
- [ ] T177 [US4] Set up drift alerting (PSI > 0.2) in services/mlops/app/monitoring/alerts.py
- [ ] T178 [US4] Track inference latency (<1s target) in services/mlops/app/monitoring/latency.py
- [ ] T179 [US4] Monitor prediction distribution in services/mlops/app/monitoring/distribution.py
- [ ] T180 [US4] Implement automated retraining on drift in services/mlops/app/training/auto_retrain.py

### Frontend Integration

- [ ] T181 [US4] Display RUL predictions in sensor details in services/frontend/src/components/SensorDetail/RULPrediction.tsx
- [ ] T182 [US4] Add RUL trend visualization in services/frontend/src/components/SensorDetail/RULChart.tsx

---

## Phase 8: US5 - ISO-Compliant Reporting (P3)

**Goal**: Enable facility managers and compliance officers to generate detailed incident reports meeting ISO standards.

**Independent Test**: Create new report → select ISO standard → author content with structured blocks → auto-generate report from alert → track version history → export PDF.

### Backend Report System

- [ ] T183 [US5] Implement Report model with version control in services/backend/src/models/Report.ts
- [ ] T184 [US5] Implement GET /api/v1/reports endpoint with filtering in services/backend/src/routes/reports.ts
- [ ] T185 [US5] Implement POST /api/v1/reports endpoint in services/backend/src/routes/reports.ts
- [ ] T186 [US5] Implement PATCH /api/v1/reports/:reportId endpoint in services/backend/src/routes/reports.ts
- [ ] T187 [US5] Add ISO standard selection (ISO-27001, ISO-22301, ISO-50001) in services/backend/src/models/Report.ts
- [ ] T188 [US5] Implement classification levels (Public, Internal, Confidential, Restricted) in services/backend/src/models/Report.ts
- [ ] T189 [US5] Create structured block storage (JSON) in services/backend/src/models/ReportBlock.ts
- [ ] T190 [US5] Implement version history tracking in services/backend/src/services/ReportService.ts
- [ ] T191 [US5] Add AI report draft generation from alerts in services/backend/src/services/ReportService.ts
- [ ] T192 [US5] Implement PDF export with watermarks in services/backend/src/services/PDFService.ts
- [ ] T193 [US5] Add audit logging for report modifications in services/backend/src/middleware/auditLog.ts

### Frontend Report Editor

- [ ] T194 [US5] Create reportStore with Zustand in services/frontend/src/stores/reportStore.ts
- [ ] T195 [US5] Create ReportList route (/reports) in services/frontend/src/pages/ReportList/ReportList.tsx
- [ ] T196 [US5] Create ReportEditor route (/reports/:id) in services/frontend/src/pages/ReportEditor/ReportEditor.tsx
- [ ] T197 [US5] Implement block-based content editor in services/frontend/src/components/ReportEditor/BlockEditor.tsx
- [ ] T198 [US5] Add block types (headings, paragraphs, lists, code, AI insights) in services/frontend/src/components/ReportEditor/blocks/
- [ ] T199 [US5] Create ReportList component with filters in services/frontend/src/components/ReportList/ReportList.tsx
- [ ] T200 [US5] Implement report status workflow in services/frontend/src/components/ReportEditor/StatusWorkflow.tsx
- [ ] T201 [US5] Add auto-save functionality in services/frontend/src/hooks/useAutoSave.ts
- [ ] T202 [US5] Implement version history viewer in services/frontend/src/components/ReportEditor/VersionHistory.tsx

---

## Phase 9: US6 - Geospatial Facility Overview (P3)

**Goal**: Enable facility managers to visualize facility locations on a geographical map of Thailand with regional insights.

**Parallel With**: Phase 8 (US5)

**Independent Test**: Open map view → verify all facilities on Thailand map → click facility marker → see details → filter by region → confirm real-time status updates.

### Backend Map Support

- [ ] T203 [US6] Add GPS coordinates (latitude, longitude) to Facility model in services/backend/src/models/Facility.ts
- [ ] T204 [US6] Create map data aggregation endpoint (GET /api/v1/facilities/map) in services/backend/src/routes/facilities.ts

### Frontend Map Integration

- [ ] T205 [US6] Install map library (Leaflet) in services/frontend/package.json
- [ ] T206 [US6] Create MapView route (/map) in services/frontend/src/pages/MapView/MapView.tsx
- [ ] T207 [US6] Create MapView component in services/frontend/src/components/MapView/MapView.tsx
- [ ] T208 [US6] Implement facility markers with color-coding in services/frontend/src/components/MapView/FacilityMarker.tsx
- [ ] T209 [US6] Add marker clustering at different zoom levels in services/frontend/src/components/MapView/MarkerCluster.tsx
- [ ] T210 [US6] Create FacilityPopup component in services/frontend/src/components/MapView/FacilityPopup.tsx
- [ ] T211 [US6] Implement region filtering on map in services/frontend/src/components/MapView/RegionFilter.tsx
- [ ] T212 [US6] Add real-time marker updates in services/frontend/src/components/MapView/MapView.tsx
- [ ] T213 [US6] Implement map navigation controls in services/frontend/src/components/MapView/MapControls.tsx
- [ ] T214 [US6] Add Thailand base map with regions in services/frontend/src/components/MapView/ThailandMap.tsx
- [ ] T215 [US6] Optimize marker rendering performance in services/frontend/src/components/MapView/MarkerOptimizer.tsx

---

## Phase 10: Polish & Cross-Cutting Concerns

**Goal**: Comprehensive testing, performance optimization, deployment, and documentation.

**Runs After**: All user story phases complete

### Testing

- [ ] T216 [P] Write Backend API unit tests (Vitest) in services/backend/tests/unit/
- [ ] T217 [P] Write Backend integration tests in services/backend/tests/integration/
- [ ] T218 [P] Write Frontend component tests (RTL) in services/frontend/tests/unit/
- [ ] T219 [P] Write SSE connection tests in services/backend/tests/integration/sse.test.ts
- [ ] T220 [P] Write Pact contract tests (Backend ↔ Simulator) in services/backend/tests/contract/
- [ ] T221 Write dashboard E2E tests (Playwright) in services/frontend/tests/e2e/dashboard.spec.ts
- [ ] T222 Write 3D visualization E2E tests in services/frontend/tests/e2e/3d.spec.ts
- [ ] T223 Write alert management E2E tests in services/frontend/tests/e2e/alerts.spec.ts
- [ ] T224 Write AI chat E2E tests in services/frontend/tests/e2e/chat.spec.ts
- [ ] T225 Write report creation E2E tests in services/frontend/tests/e2e/reports.spec.ts
- [ ] T226 Write map interaction E2E tests in services/frontend/tests/e2e/map.spec.ts

### Performance Optimization

- [ ] T227 Optimize bundle size (target <500KB gzipped) in services/frontend/vite.config.ts
- [ ] T228 Implement code splitting per route in services/frontend/src/App.tsx
- [ ] T229 Add lazy loading for heavy components (3D, Map) in services/frontend/src/utils/lazyLoad.ts
- [ ] T230 Configure Web Vitals monitoring (LCP, INP, CLS) in services/frontend/src/config/webVitals.ts

### Deployment

- [ ] T231 Deploy all services to Railway
- [ ] T232 Run database migrations on Railway
- [ ] T233 Configure environment variables for production
- [ ] T234 Set up Sentry distributed tracing across all services
- [ ] T235 Create RUNBOOK.md for troubleshooting in docs/RUNBOOK.md

---

## Parallel Execution Examples

### Phase 3 (US1) - 12 Parallel Opportunities:
- Backend endpoints (T046-T053) can be built simultaneously
- Simulator data generators (T071-T075) can be built simultaneously  
- Frontend components (T059-T070) can be built with mocked APIs

### Phase 4 (US2) - 5 Parallel Opportunities:
- Frontend 3D components (T086-T092) can be built in parallel
- Performance optimizations (T093-T098) independent tasks

### Phase 5 (US3) - 8 Parallel Opportunities:
- LINE integration tasks (T113-T123) independent from alert system
- Simulator scenarios (T129-T130) can run in parallel

### Phase 6-7 (US4) - Full Parallel:
- AI Integration (T131-T150) and MLOps Pipeline (T151-T182) can run completely in parallel

### Phase 8-9 (US5, US6) - Full Parallel:
- Reporting (T183-T202) and Geospatial (T203-T215) completely independent

### Phase 10 - All Tests Parallel:
- All test tasks (T216-T226) can run simultaneously

---

## Summary

**Total Tasks**: 235  
**MVP Scope**: Phase 1-3 (106 tasks) - Setup + Foundational + US1  
**Full P1 Delivery**: Phase 1-4 (126 tasks) - Add US2  
**Full P2 Delivery**: Phase 1-7 (201 tasks) - Add US3-US4  
**Full Feature Set**: All 235 tasks

**Parallel Opportunities**: 40+ tasks can run simultaneously within their phases  
**Independent Stories**: US5, US6 completely independent (can be deferred)  
**Critical Path**: Setup → Foundational → US1 → US3 → US4 (blocks most value)

**Recommended First Delivery** (MVP):
- Phase 1: Setup (25 tasks)
- Phase 2: Foundational (20 tasks)
- Phase 3: US1 - Real-Time Monitoring (35 tasks)
- **Total**: 80 tasks for core value delivery

This provides a complete, working facility monitoring dashboard with real-time updates before building 3D, alerts, AI, or compliance features.
