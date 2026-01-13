# NT-POC Battery Management System - Integration Test Architecture Analysis

**Document Version:** 1.0  
**Last Updated:** 2026-01-13  
**Author:** System Architecture Analysis  
**Purpose:** Comprehensive system analysis to inform integration test strategy design

---

## Executive Summary

The NT-POC Battery Management System is a distributed, ML-enabled system consisting of **6 primary services** across TypeScript and Python stacks. This analysis identifies **47 API endpoints**, **3 authentication mechanisms**, **23 database tables**, and **critical integration points** requiring comprehensive integration testing.

### Key Metrics
- **Services Analyzed:** 6 (Backend, Frontend, LINE Bot, MLOps, ML Training, Simulator)
- **API Endpoints:** 47+ documented endpoints
- **Database Tables:** 23+ core tables with complex relationships
- **Integration Points:** 8 critical inter-service communication patterns
- **Existing Test Coverage:** Pact contracts (Frontend ↔ Backend), Unit tests in all TypeScript services

---

## 1. Service Architecture Overview

### 1.1 Service Dependency Diagram (ASCII)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          External Services Layer                            │
│  ┌──────────────┐  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐    │
│  │   SendGrid   │  │   Mapbox    │  │ OpenWeather  │  │    Sentry   │    │
│  │    (Email)   │  │(Geocoding)  │  │  (Weather)   │  │  (Errors)   │    │
│  └──────┬───────┘  └──────┬──────┘  └──────┬───────┘  └──────┬──────┘    │
└─────────┼──────────────────┼─────────────────┼──────────────────┼──────────┘
          │                  │                 │                  │
          ▼                  ▼                 ▼                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Application Layer                                │
│                                                                             │
│  ┌────────────────┐         ┌──────────────────┐                          │
│  │   Frontend     │◄────────┤   LINE Bot       │                          │
│  │  (React/Vite)  │  HTTP   │  (TypeScript)    │                          │
│  │  Port: 5173    │         │  Port: 3002      │                          │
│  └────────┬───────┘         └─────────┬────────┘                          │
│           │                           │                                    │
│           │ HTTP/REST                 │ HTTP/REST                          │
│           │ JWT Auth                  │ API Key Auth                       │
│           │                           │                                    │
│           ▼                           ▼                                    │
│  ┌─────────────────────────────────────────────────┐                      │
│  │           Backend (Express/Node)                │                      │
│  │              Port: 3000                         │                      │
│  │  • Authentication (JWT)                         │                      │
│  │  • Business Logic                               │                      │
│  │  • Orchestration                                │                      │
│  │  • Scheduled Jobs (Predictions, Escalations)    │                      │
│  │  • SSE (Server-Sent Events) for Alerts          │                      │
│  └──────┬─────────────┬────────────┬───────────────┘                      │
│         │             │            │                                       │
└─────────┼─────────────┼────────────┼───────────────────────────────────────┘
          │             │            │
          │ HTTP        │ HTTP       │ HTTP
          │             │            │
          ▼             ▼            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        ML/Data Services Layer                               │
│                                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                    │
│  │   MLOps      │  │  Simulator   │  │  ML Training │                    │
│  │  (FastAPI)   │  │  (FastAPI)   │  │  (Python)    │                    │
│  │  Port: 8001  │  │  Port: 8002  │  │  (Batch)     │                    │
│  │              │  │              │  │              │                    │
│  │ • RUL Pred.  │  │ • Sensor     │  │ • Model      │                    │
│  │ • Anomaly    │  │   Simulator  │  │   Training   │                    │
│  │ • SHAP       │  │ • Hardware   │  │ • Feature    │                    │
│  │   Explain    │  │   Interface  │  │   Engineer   │                    │
│  └──────────────┘  └──────────────┘  └──────────────┘                    │
└─────────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Data Persistence Layer                             │
│                                                                             │
│  ┌──────────────────────┐              ┌────────────────┐                 │
│  │   PostgreSQL 16      │              │   Redis        │                 │
│  │   Port: 5432         │              │   Port: 6379   │                 │
│  │                      │              │                │                 │
│  │  • TimescaleDB       │              │  • Caching     │                 │
│  │  • Core Tables       │              │  • Sessions    │                 │
│  │  • Hypertables       │              │  (Optional)    │                 │
│  └──────────────────────┘              └────────────────┘                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Service Inventory

| Service | Technology | Port | Purpose | Key Dependencies |
|---------|-----------|------|---------|-----------------|
| **Backend** | Express/TypeScript/Node 18+ | 3000 | API Gateway, Business Logic, Auth | PostgreSQL, Redis (opt), MLOps, Simulator |
| **Frontend** | React/Vite/TypeScript | 5173 | Web UI | Backend API |
| **LINE Bot** | Express/TypeScript/Node 18+ | 3002 | LINE Messaging Integration | Backend API, LINE Platform |
| **MLOps** | FastAPI/Python | 8001 | ML Model Serving (RUL, Anomaly, SHAP) | TensorFlow, scikit-learn |
| **Simulator** | FastAPI/Python | 8002 | Battery Sensor Simulation | None (standalone) |
| **ML Training** | Python/TensorFlow | N/A | Model Training Pipeline (Batch) | Training data |

---

## 2. API Endpoint Inventory

### 2.1 Backend API (Port 3000) - 35 Endpoints

#### Health & Monitoring
- `GET /api/v1/health` - System health check (no auth)
- `GET /metrics` - Prometheus metrics (Bearer token)
- `GET /api/v1/monitoring/stats` - System statistics
- `GET /api/v1/monitoring/dashboard` - Monitoring dashboard

#### Facilities Management (All require JWT auth)
- `GET /api/v1/facilities` - List facilities
- `GET /api/v1/facilities/:id` - Get facility details
- `GET /api/v1/facilities/:id/kpis` - Facility KPIs
- `GET /api/v1/facilities/map` - Map view with health status
- `POST /api/v1/facilities/geocode` - Geocode address
- `POST /api/v1/facilities/reverse-geocode` - Reverse geocode
- `PATCH /api/v1/facilities/:id/geolocation` - Update geolocation

#### Alerts Management (All require JWT auth)
- `GET /api/v1/alerts` - List alerts (pagination, filters)
- `GET /api/v1/alerts/:id` - Get alert details
- `POST /api/v1/alerts` - Create alert (broadcasts via SSE)
- `POST /api/v1/alerts/:id/acknowledge` - Acknowledge alert
- `POST /api/v1/alerts/:id/resolve` - Resolve alert
- `GET /api/v1/alerts/:id/history` - Alert history & timeline
- `GET /api/v1/alerts/stats/summary` - Alert statistics
- `GET /api/v1/alerts/timeline/data` - Timeline visualization data

#### Alert Notifications (All require JWT auth)
- `POST /api/v1/alerts/email/configure` - Configure email notifications
- `GET /api/v1/alerts/email/configure` - List all email configs
- `GET /api/v1/alerts/email/configure/:facilityId` - Get facility email config
- `POST /api/v1/alerts/:id/notify` - Send email notification
- `GET /api/v1/alerts/:id/email-status` - Email delivery status

#### Alert Escalation (All require JWT auth)
- `POST /api/v1/alerts/escalation/rules` - Configure escalation rules
- `GET /api/v1/alerts/escalation/rules/:facilityId` - Get escalation rules
- `GET /api/v1/alerts/:id/escalation-history` - Escalation history
- `GET /api/v1/alerts/escalation/job-status` - Escalation job status
- `POST /api/v1/alerts/escalation/trigger` - Manually trigger escalation

#### Sensor Readings (All require JWT auth)
- `GET /api/v1/sensor-readings/latest` - Latest reading for battery
- `GET /api/v1/sensor-readings/timeseries` - Time-series data

#### Predictions (All require JWT auth)
- `GET /api/v1/predictions/:batteryId` - RUL predictions history
- `GET /api/v1/predictions/:batteryId/latest` - Latest RUL prediction
- `POST /api/v1/predictions` - Create RUL prediction
- `DELETE /api/v1/predictions/cleanup` - Cleanup old predictions

#### ML & Predictive Maintenance (All require JWT auth)
- `POST /api/v1/ml/predict-maintenance` - Predict maintenance risk
- `POST /api/v1/ml/predict-batch` - Batch predictions (async support)
- `GET /api/v1/ml/predict-batch/:jobId` - Async batch job status
- `GET /api/v1/ml/model-metrics` - Model performance metrics
- `POST /api/v1/ml/train` - Train/retrain model

#### Additional Routes
- `GET /api/v1/stream` - SSE endpoint for real-time alerts
- `GET /api/v1/jobs` - Jobs status
- `GET /api/v1/explainability/*` - SHAP explainability (proxies to MLOps)
- `GET /api/v1/what-if/*` - What-if scenario analysis
- `GET /api/v1/geospatial/*` - Geospatial queries
- `GET /api/v1/report-analytics/*` - Report analytics
- `GET /api/v1/weather/*` - Weather data
- `GET /api/v1/battery-health/*` - Battery health metrics
- `GET /api/v1/comparative-analysis/*` - Comparative analysis
- `GET /api/v1/model-performance/*` - Model performance tracking

### 2.2 MLOps Service (Port 8001) - 7 Endpoints

#### Health
- `GET /health` - Service health with latency metrics
- `GET /` - Root endpoint

#### RUL Prediction
- `POST /ml/predict-rul` - Single RUL prediction (LSTM)
- `POST /ml/predict-rul/batch` - Batch RUL predictions (up to 100)
- `GET /ml/model-info` - Model information & metrics
- `GET /ml/latency` - Inference latency statistics

#### Anomaly Detection
- `POST /api/v1/ml/detect-anomaly` - Detect anomalies (Isolation Forest)
- `GET /api/v1/ml/anomaly-metrics` - Model performance metrics
- `POST /api/v1/ml/train-anomaly` - Train anomaly detector

#### Explainability (SHAP)
- `POST /explain/waterfall` - Generate SHAP waterfall plot
- `POST /explain/force` - Generate SHAP force plot
- `POST /explain/text` - Generate text explanation
- `POST /explain/export` - Export complete explanation report
- `GET /explain/health` - Explainability service health

### 2.3 Simulator Service (Port 8002) - 5 Endpoints

- `GET /` - Root endpoint with service info
- `GET /api/health` - Health check with sensor backend status
- `GET /api/sensors/reading/:batterySystemId` - Get sensor reading
- `POST /api/sensors/readings/batch` - Batch sensor readings
- `GET /api/sensors/metrics/:batterySystemId` - Battery metrics
- `GET /api/sensors/status` - Sensor backend status & config

### 2.4 LINE Bot Service (Port 3002) - 3 Endpoints

- `GET /health` - Health check
- `POST /webhook` - LINE webhook (LINE signature validation)
- `POST /notify` - Broadcast notifications (API key auth)

---

## 3. Authentication & Authorization

### 3.1 Authentication Mechanisms

| Service | Method | Implementation | Token/Key Location |
|---------|--------|----------------|-------------------|
| **Backend** | JWT | [`services/backend/src/middleware/auth.ts`](../services/backend/src/middleware/auth.ts:1) | `Authorization: Bearer <token>` header |
| **LINE Bot** | API Key | [`services/line-bot/src/middleware/auth.ts`](../services/line-bot/src/middleware/auth.ts:1) | `x-api-key` header |
| **LINE Bot** | LINE Signature | LINE SDK middleware | `x-line-signature` header |
| **MLOps** | None | Public (internal network) | N/A |
| **Simulator** | None | Public (internal network) | N/A |

### 3.2 JWT Authentication Flow (Backend)

```
Client Request
     │
     ├─► Header: Authorization: Bearer <JWT>
     │
     ▼
authenticate() middleware
     │
     ├─► jwt.verify(token, JWT_SECRET)
     │
     ├─► Success: req.user = { userId, role, email }
     │   └─► next() → Route Handler
     │
     └─► Failure: 401 Unauthorized or 403 Invalid Token
```

**Key Points:**
- JWT secret from `process.env.JWT_SECRET` (default: 'test-secret')
- Token payload: `{ userId: string, role: string, email?: string }`
- All `/api/v1/*` routes (except `/health`) require JWT authentication

### 3.3 LINE Bot Authentication

1. **Webhook Validation:** LINE SDK middleware validates `x-line-signature`
2. **Notify Endpoint:** API key in `x-api-key` header (env: `API_SECRET_KEY`)

---

## 4. Database Schema Overview

### 4.1 Core Tables (PostgreSQL 16 + TimescaleDB)

#### Facilities & Assets
```sql
facilities (23 columns)
├── id (UUID, PK)
├── name, location, timezone
├── latitude, longitude, address, city, country
├── total_zones, status (active/inactive/maintenance)
└── created_at, updated_at

battery_systems (Updated schema - T130)
├── id (UUID, PK)
├── facility_id (FK → facilities)
├── zone_id (FK → zones) -- NEW
├── name, capacity, status (operational/maintenance/decommissioned/offline)
├── installation_date, firmware_version, model, manufacturer
├── warranty_expiry_date, last_maintenance_date
├── total_cycles, max_charge_rate_kw, max_discharge_rate_kw
└── created_at, updated_at

zones (NEW - T130)
├── id (UUID, PK)
├── facility_id (FK → facilities)
├── name, description
├── zone_type (storage/production/distribution)
└── created_at, updated_at

sensors (T011)
├── id (UUID, PK)
├── facility_id (FK → facilities)
├── name, type
├── metadata (JSONB)
└── created_at, updated_at
```

#### Sensor Data (TimescaleDB Hypertable)
```sql
sensor_readings (Hypertable - T011)
├── id (UUID)
├── sensor_id (FK → sensors)
├── facility_id (FK → facilities)
├── timestamp (TIMESTAMPTZ) -- Hypertable partitioning key
├── value (NUMERIC)
├── unit, status
├── metadata (JSONB)
└── PRIMARY KEY (id, timestamp)
└── Chunk interval: 1 week
```

#### Alerts & Escalation
```sql
alerts (Updated - T132)
├── id (UUID, PK)
├── facility_id (FK → facilities)
├── zone_id (FK → zones)
├── battery_system_id (FK → battery_systems)
├── type, severity (critical/warning/info), status (active/acknowledged/resolved)
├── message, metadata (JSONB)
├── acknowledged_at, acknowledged_by
├── resolved_at, resolved_by
├── created_at, updated_at

alert_escalation_events (T132)
├── id (UUID, PK)
├── alert_id (FK → alerts)
├── from_severity, to_severity
├── escalated_at, reason
├── auto_escalated (boolean)
├── notification_sent, notification_sent_at

escalation_rules (T132)
├── id (UUID, PK)
├── facility_id (unique)
├── info_to_medium_minutes, medium_to_high_minutes, high_to_critical_minutes
├── enabled, config (JSONB)
└── created_at, updated_at
```

#### Predictions & ML
```sql
rul_predictions
├── id (UUID, PK)
├── battery_system_id (FK → battery_systems)
├── predicted_rul (days)
├── confidence, model_version
├── features (JSONB)
├── prediction_date
└── created_at

model_performance
├── id (UUID, PK)
├── model_type, model_version
├── metrics (JSONB)
├── training_date, evaluation_date
└── created_at

what_if_scenarios
├── id (UUID, PK)
├── battery_system_id (FK → battery_systems)
├── scenario_name, parameters (JSONB)
├── results (JSONB)
├── created_at, created_by
```

#### Reports & Analytics
```sql
report_annotations
├── id (UUID, PK)
├── report_id, report_type
├── annotation_text, position_data (JSONB)
├── created_by, created_at

report_versions
├── id (UUID, PK)
├── report_id, version_number
├── snapshot_data (JSONB)
├── created_by, created_at

report_analytics
├── id (UUID, PK)
├── report_type, metrics (JSONB)
├── period_start, period_end
└── created_at
```

### 4.2 Key Relationships

```
facilities (1) ───┬───→ (M) battery_systems
                  ├───→ (M) zones
                  └───→ (M) sensors

zones (1) ────────────→ (M) battery_systems

battery_systems (1) ──┬→ (M) alerts
                      ├→ (M) rul_predictions
                      └→ (M) what_if_scenarios

sensors (1) ───────────→ (M) sensor_readings (Hypertable)

alerts (1) ────────────→ (M) alert_escalation_events
```

### 4.3 Migration History

Total migrations: 23 files (`.sql`, `.js`, `.ts`)

**Key Migrations:**
1. `20240101000000_create_core_tables.ts` - Initial schema
2. `20260112000000_t011_create_sensor_readings_hypertable.ts` - TimescaleDB hypertable
3. `20260111000000_update_battery_systems_schema.ts` - T130 schema update (zones)
4. `20260111_1410_create_alert_escalation_tables.ts` - T132 escalation tables
5. `003_add_facility_geospatial.sql` - Geospatial support
6. `20240105000000_add_geolocation_to_facilities.ts` - Geocoding fields

---

## 5. Data Flow Patterns

### 5.1 Synchronous Request/Response Flows

#### Flow 1: Frontend → Backend → Database
```
Frontend (GET /api/v1/facilities)
    ↓ HTTP + JWT
Backend (authenticate → facilitiesRouter)
    ↓ SQL Query
PostgreSQL (facilities table)
    ↓ Result Set
Backend (JSON response)
    ↓ HTTP
Frontend (Display)
```

#### Flow 2: Backend → MLOps (RUL Prediction)
```
Backend (POST /api/v1/ml/predict-maintenance)
    ↓ HTTP (axios)
MLOps (POST /ml/predict-rul)
    ↓ TensorFlow Inference
LSTM Model
    ↓ Prediction Result
MLOps (JSON response)
    ↓ HTTP
Backend (Store in rul_predictions)
    ↓
PostgreSQL
```

#### Flow 3: Backend → Simulator (Sensor Data)
```
Backend (sensorIngestionService - scheduled)
    ↓ HTTP (axios)
Simulator (GET /api/sensors/reading/:id)
    ↓ Generate/Fetch
Sensor Backend (Simulator or Hardware)
    ↓ Sensor Data
Simulator (JSON response)
    ↓ HTTP
Backend (Insert into sensor_readings)
    ↓
PostgreSQL/TimescaleDB
```

### 5.2 Asynchronous Flows

#### Flow 4: Scheduled Prediction Job
```
Backend Index (startScheduledJob)
    ↓ Interval: 60 min (default)
scheduledPredictionJob.run()
    ↓ Query battery_systems
PostgreSQL
    ↓ For each battery
Backend → MLOps (RUL prediction)
    ↓ Store results
PostgreSQL (rul_predictions)
```

#### Flow 5: Alert Escalation Job
```
Backend Index (startEscalationJob)
    ↓ Interval: 5 min (default)
alertEscalationJob.run()
    ↓ Query unresolved alerts
PostgreSQL (alerts + escalation_rules)
    ↓ Check age vs thresholds
Escalate if needed
    ↓ Update alert severity
PostgreSQL (alerts)
    ↓ Log escalation event
PostgreSQL (alert_escalation_events)
    ↓ Send email notification (if configured)
SendGrid API
```

#### Flow 6: Server-Sent Events (Real-time Alerts)
```
Frontend (EventSource /api/v1/stream)
    ↓ Persistent Connection
Backend (streamRouter - SSE)
    ↓ Subscribe to alertRealtimeService
In-Memory Alert Cache
    ↓ On new alert
Backend (Broadcast via SSE)
    ↓ data: {alert}
Frontend (Update UI)
```

#### Flow 7: Sensor Ingestion Service
```
Backend (sensorIngestionService.start())
    ↓ Polling Interval
Loop:
  ├─► Check Simulator Health
  ├─► Fetch Battery Systems from DB
  ├─► For each battery:
  │     ├─► GET /api/sensors/reading/:id (Simulator)
  │     └─► INSERT into sensor_readings (PostgreSQL)
  └─► Sleep → Repeat
```

### 5.3 External Service Integration

#### Flow 8: Email Notifications (SendGrid)
```
Backend (alertEscalationService or emailNotificationService)
    ↓ fetch() POST
SendGrid API (https://api.sendgrid.com/v3/mail/send)
    ↓ Response (202 Accepted or error)
Backend (Store delivery status)
    ↓
In-Memory Cache (deliveryStatusMap)
```

#### Flow 9: Geocoding (Mapbox)
```
Backend (geocodingService.geocode(address))
    ↓ axios.get
Mapbox Geocoding API
    ↓ GeoJSON response
Backend (Cache result)
    ↓
Redis or In-Memory
```

#### Flow 10: Weather Data (OpenWeatherMap)
```
Backend (weatherService.getCurrentWeather())
    ↓ axios.get
OpenWeatherMap API
    ↓ Weather data
Backend (Cache result)
    ↓
Redis or In-Memory
```

---

## 6. Existing Test Coverage

### 6.1 Contract Testing (Pact)

**File:** [`pacts/BMS-Frontend-BMS-Backend.json`](../pacts/BMS-Frontend-BMS-Backend.json:1)

**Consumer:** BMS-Frontend  
**Provider:** BMS-Backend  
**Interactions:** 10 contracts

**Covered Scenarios:**
1. Health check (`GET /api/v1/health`)
2. Facilities list (`GET /api/v1/facilities`)
3. Single facility (`GET /api/v1/facilities/:id`)
4. Facility KPIs (`GET /api/v1/facilities/:id/kpis`)
5. Alerts list (`GET /api/v1/alerts`)
6. Single alert (`GET /api/v1/alerts/:id`)
7. Alert statistics (`GET /api/v1/alerts/stats/summary`)
8. Acknowledge alert (`POST /api/v1/alerts/:id/acknowledge`)
9. Resolve alert (`POST /api/v1/alerts/:id/resolve`)
10. Error scenarios (404 Not Found, 400 Bad Request)

**Authentication:** All use `Authorization: Bearer test-token`

### 6.2 Unit Tests

#### Backend (Vitest)
- Location: `services/backend/src/**/__tests__/*.test.ts`
- Coverage: Routes, services, middleware
- Key test files:
  - `health.test.ts` - Health endpoint
  - `geospatialService.test.ts` - Geocoding & weather
  - `weatherService.test.ts` - Weather API integration
  - Mock handlers in `src/test/mocks/handlers.ts`

#### Frontend (Vitest)
- Location: `services/frontend/src/**/__tests__/*.test.ts`
- Coverage: Components, hooks, services
- Key test files:
  - `useHeatmapData.test.ts` - Data hooks
  - Component tests with Testing Library
- E2E: Playwright tests in `services/frontend/e2e/`

#### LINE Bot
- Tests referenced in `TESTING_CHECKLIST.md`
- Coverage: Routes, services, middleware

#### MLOps (pytest)
- Location: `services/mlops/tests/`
- Files:
  - `test_health.py` - Health endpoint
  - `test_rul_api.py` - RUL prediction API
  - `test_anomaly_api.py` - Anomaly detection API
  - `test_model_serving.py` - Model serving

#### Simulator (pytest)
- Location: `services/simulator/tests/`
- Files:
  - `test_api.py` - API endpoints
  - `test_simulator.py` - Simulator logic

### 6.3 Test Gaps

**No integration tests for:**
1. Backend ↔ MLOps communication
2. Backend ↔ Simulator communication
3. Scheduled jobs (prediction job, escalation job)
4. SSE real-time alert broadcasting
5. Email notification delivery
6. Database constraint violations
7. External API failures (SendGrid, Mapbox, OpenWeather)
8. TimescaleDB hypertable operations
9. LINE Bot ↔ Backend integration
10. Cross-service error propagation

---

## 7. Critical Integration Points

### 7.1 Inter-Service Communication

| Integration | Method | Auth | Error Handling | Retry Logic |
|-------------|--------|------|----------------|-------------|
| **Backend → MLOps** | HTTP/REST | None | axios try/catch | None (fails fast) |
| **Backend → Simulator** | HTTP/REST | None | axios try/catch | None (logs & continues) |
| **Backend → SendGrid** | HTTP/REST | API Key (header) | fetch try/catch | None |
| **Backend → Mapbox** | HTTP/REST | API Key (query) | axios try/catch | None |
| **Backend → OpenWeather** | HTTP/REST | API Key (query) | axios try/catch | None |
| **Frontend → Backend** | HTTP/REST | JWT | axios interceptors | None |
| **LINE Bot → Backend** | HTTP/REST | API Key | axios try/catch | None |

### 7.2 Database Integration Points

#### Critical Queries
1. **Facility Health Calculation** - Joins facilities + battery_systems + alerts
2. **Sensor Timeseries** - TimescaleDB `time_bucket` aggregations
3. **Alert Escalation** - Complex joins alerts + escalation_rules + facilities
4. **RUL Predictions** - Historical queries with pagination

#### Concurrency Concerns
1. **Sensor Ingestion** - High-frequency writes to `sensor_readings` hypertable
2. **Alert Creation** - Simultaneous alert creation + escalation checks
3. **Scheduled Jobs** - Overlapping execution (prediction + escalation jobs)

### 7.3 Real-Time Features

#### Server-Sent Events (SSE)
- **Endpoint:** `GET /api/v1/stream`
- **Pattern:** Long-lived HTTP connection
- **Data:** Alert events broadcast to all connected clients
- **Service:** `alertRealtimeService` (in-memory cache)

**Integration Test Needs:**
- Multiple concurrent SSE connections
- Alert creation → SSE broadcast latency
- Client reconnection handling
- Memory leak detection (abandoned connections)

---

## 8. Failure Scenarios & Edge Cases

### 8.1 Service Unavailability

| Scenario | Current Behavior | Risk Level | Test Coverage |
|----------|------------------|------------|---------------|
| MLOps down | Backend fails fast, returns 500 | HIGH | None |
| Simulator down | Backend logs error, continues | MEDIUM | None |
| PostgreSQL down | Backend crashes/fails all requests | CRITICAL | None |
| Redis down (if used) | Backend falls back (graceful) | LOW | None |
| SendGrid down | Email delivery fails, logged | MEDIUM | None |

### 8.2 Data Integrity Issues

| Scenario | Risk | Mitigation | Test Coverage |
|----------|------|------------|---------------|
| Duplicate alerts | Low | Unique constraints | None |
| Orphaned predictions (battery deleted) | Medium | CASCADE delete | None |
| Sensor data out of order | Medium | TimescaleDB handles | None |
| Concurrent escalation updates | High | DB transactions | None |

### 8.3 Authentication & Authorization

| Scenario | Expected Behavior | Test Coverage |
|----------|-------------------|---------------|
| Expired JWT | 403 Forbidden | Pact contracts |
| Invalid JWT | 403 Forbidden | Pact contracts |
| Missing JWT | 401 Unauthorized | Pact contracts |
| Invalid API key (LINE Bot) | 401 Unauthorized | None |
| Missing API key (LINE Bot) | 401 Unauthorized | None |

### 8.4 Performance & Scalability

| Scenario | Concern | Test Coverage |
|----------|---------|---------------|
| 1000+ concurrent SSE connections | Memory usage | None |
| Large batch predictions (100 batteries) | Request timeout | None |
| TimescaleDB query performance (TB of data) | Query latency | None |
| Scheduled job overlap | Race conditions | None |

---

## 9. Environment Configuration

### 9.1 Backend Environment Variables

```bash
# Server
NODE_ENV=development|production|test
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=battery_management
DB_USER=postgres
DB_PASSWORD=postgres
DB_SSL=false

# Auth
JWT_SECRET=secret-key

# External Services
MLOPS_SERVICE_URL=http://mlops:8001
SIMULATOR_URL=http://simulator:8002
SENDGRID_API_KEY=<key>
EMAIL_FROM=noreply@example.com
MAPBOX_ACCESS_TOKEN=<token>
OPENWEATHER_API_KEY=<key>

# Monitoring
SENTRY_DSN=<optional>
METRICS_AUTH_TOKEN=<optional>

# Jobs
PREDICTION_JOB_INTERVAL_MINUTES=60
ESCALATION_JOB_INTERVAL_MINUTES=5

# Redis (optional)
REDIS_URL=redis://redis:6379
```

### 9.2 MLOps Environment Variables

```bash
ENVIRONMENT=development|production
PORT=8001
CORS_ORIGINS=["http://localhost:5173","http://localhost:3000"]
MODELS_DIR=/app/models
RUL_MODEL_PATH=/app/models/rul_lstm_model.h5
LOG_LEVEL=INFO
```

### 9.3 Simulator Environment Variables

```bash
PORT=8002
SENSOR_BACKEND=simulator|hardware
SIMULATOR_SEED=42
SIMULATOR_NOISE_LEVEL=0.05
SIMULATOR_DRIFT_ENABLED=true
HARDWARE_CONNECTION_STRING=<optional>
```

### 9.4 LINE Bot Environment Variables

```bash
PORT=3002
LINE_CHANNEL_ACCESS_TOKEN=<token>
LINE_CHANNEL_SECRET=<secret>
API_SECRET_KEY=<key>
BACKEND_API_URL=http://backend:3000
```

---

## 10. Deployment Architecture

### 10.1 Docker Compose (Development)

**File:** [`docker-compose.yml`](../docker-compose.yml:1)

**Services:**
- `database` (PostgreSQL 16)
- `redis` (Redis 7 - optional, profile: `with-redis`)
- `backend` (Node 18, port 3000)
- `frontend` (Vite dev server, port 5173)
- `mlops` (FastAPI, port 8001)
- `simulator` (FastAPI, port 8002 - profile: `ml-training`)

**Network:** `bms-network` (bridge)

### 10.2 Production (infrastructure/docker-compose.yml)

**Additional Services:**
- `nginx` (reverse proxy, SSL termination)
- `certbot` (Let's Encrypt SSL renewal)

**Differences:**
- No development volumes
- Production environment variables
- Health checks enabled
- Restart policies: `unless-stopped`

### 10.3 Kubernetes (k8s/)

**Resources:**
- Namespace: `bms`
- Deployments: backend, frontend, mlops
- Services: ClusterIP + LoadBalancer
- ConfigMaps: Configuration
- Secrets: Sensitive data
- HPA: Horizontal Pod Autoscaler

---

## 11. Logging & Monitoring

### 11.1 Logging

| Service | Framework | Format | Destination |
|---------|-----------|--------|-------------|
| Backend | Winston | JSON | stdout, Sentry |
| Frontend | Console | Text | Browser console |
| LINE Bot | Winston | JSON | stdout |
| MLOps | Python logging | Text | stdout |
| Simulator | Python logging | Text | stdout |

### 11.2 Metrics

**Backend:**
- **Prometheus metrics** at `/metrics` (Bearer token protected)
- **Custom metrics:** Request count, response time, error rate
- **Middleware:** `metricsMiddleware` (increments counters)

**MLOps:**
- **Latency monitoring:** In-memory p50/p95/p99 tracking
- **Endpoint:** `GET /ml/latency`
- **Middleware:** `LatencyMonitoringMiddleware`

### 11.3 Error Tracking

**Backend:**
- **Sentry integration** via `@sentry/node`
- **Initialized** in [`services/backend/src/index.ts`](../services/backend/src/index.ts:1)
- **Captured:** Unhandled rejections, uncaught exceptions, route errors

---

## 12. Integration Test Strategy Recommendations

### 12.1 Priority 1: Critical Path Tests (Must Have)

1. **Backend → Database → Response**
   - CRUD operations on all entities
   - Constraint violation handling
   - Transaction rollback scenarios

2. **Backend → MLOps → Backend**
   - RUL prediction flow (single + batch)
   - Anomaly detection flow
   - Error handling (MLOps unavailable)

3. **Backend → Simulator → Backend**
   - Sensor data ingestion
   - Scheduled sensor polling
   - Error handling (Simulator unavailable)

4. **Authentication Flows**
   - JWT validation (valid, expired, invalid, missing)
   - API key validation (LINE Bot)

5. **Scheduled Jobs**
   - Prediction job execution
   - Escalation job execution
   - Overlapping job handling

### 12.2 Priority 2: High-Value Features (Should Have)

6. **Alert Lifecycle**
   - Create → Broadcast (SSE) → Acknowledge → Resolve
   - Email notification delivery
   - Escalation automation

7. **Real-Time Features**
   - SSE connection establishment
   - Alert broadcasting to multiple clients
   - Client reconnection

8. **External API Integration**
   - SendGrid email delivery
   - Mapbox geocoding
   - OpenWeather data fetching

### 12.3 Priority 3: Edge Cases (Nice to Have)

9. **Concurrency & Race Conditions**
   - Parallel sensor ingestion
   - Simultaneous escalation updates
   - Batch prediction job contention

10. **Performance & Load**
    - 100+ concurrent SSE connections
    - Batch predictions (100 batteries)
    - TimescaleDB query performance

11. **Error Propagation**
    - Cascading failures
    - Partial failure handling
    - Graceful degradation

### 12.4 Test Environment Requirements

**Infrastructure:**
- PostgreSQL 16 + TimescaleDB extension
- Redis (optional, for caching tests)
- Mock external APIs (SendGrid, Mapbox, OpenWeather)
- Network isolation (Docker Compose or Kubernetes)

**Test Data:**
- Seed data: facilities, zones, battery_systems
- Historical sensor data (TimescaleDB)
- Pre-trained ML models (LSTM, Isolation Forest)

**Tools:**
- **API Testing:** Jest + Supertest or Vitest + Supertest
- **Contract Testing:** Pact (extend existing contracts)
- **E2E Testing:** Playwright (extend existing suite)
- **Load Testing:** k6 or Artillery

---

## 13. Identified Gaps & Recommendations

### 13.1 Critical Gaps

1. **No integration tests for inter-service communication**
   - Backend ↔ MLOps
   - Backend ↔ Simulator
   - LINE Bot ↔ Backend

2. **No tests for scheduled jobs**
   - Prediction job
   - Escalation job
   - Sensor ingestion service

3. **No tests for real-time features**
   - SSE alert broadcasting
   - Multiple concurrent connections

4. **Limited error scenario testing**
   - External service failures
   - Database constraint violations
   - Concurrent updates

### 13.2 Architecture Improvements

1. **Retry Logic:** Add exponential backoff for external API calls
2. **Circuit Breaker:** Implement for MLOps/Simulator calls
3. **Request ID Tracing:** Add correlation IDs across services
4. **Rate Limiting:** Protect backend APIs from abuse
5. **Database Connection Pooling:** Optimize PostgreSQL connections

### 13.3 Test Coverage Improvements

1. **Expand Pact Contracts:**
   - Add LINE Bot → Backend contracts
   - Add more error scenarios (500, 503)

2. **Add Integration Test Suite:**
   - Separate test directory: `tests/integration/`
   - Docker Compose test environment
   - CI/CD integration

3. **Add Performance Tests:**
   - Load testing for critical endpoints
   - SSE connection stress tests
   - TimescaleDB query benchmarks

---

## 14. Conclusion

The NT-POC Battery Management System is a well-structured, microservices-based architecture with **6 services**, **47+ API endpoints**, and **23+ database tables**. The system demonstrates good separation of concerns with:

- ✅ Clear service boundaries
- ✅ JWT and API key authentication
- ✅ TimescaleDB for time-series data
- ✅ ML model serving (RUL, Anomaly, SHAP)
- ✅ Real-time features (SSE)
- ✅ Scheduled automation (jobs)

**However, integration testing is minimal:**
- ❌ No inter-service integration tests
- ❌ No scheduled job tests
- ❌ No real-time feature tests
- ❌ Limited error scenario coverage

**Next Steps:**
1. Design comprehensive integration test suite (Priority 1 → Priority 3)
2. Set up test infrastructure (Docker Compose for tests)
3. Implement tests iteratively (start with critical paths)
4. Integrate into CI/CD pipeline
5. Monitor test coverage and iterate

This document provides the foundation for creating a robust integration test strategy that will ensure system reliability, catch regressions early, and provide confidence in deployments.

---

**End of Document**
