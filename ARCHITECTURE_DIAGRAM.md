# NT-POC System Architecture Diagram

**Production Fleet:** 1,944 batteries | 9 data centers | 4 services

---

## 🏗️ High-Level Architecture

```
┌───────────────────────────────────────────────────────────────────────┐
│                         Railway Cloud Platform                         │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │                        Frontend Service                          │  │
│  │  ┌──────────────────────────────────────────────────────────┐   │  │
│  │  │  Nginx (Port 80)                                         │   │  │
│  │  │  ├─ React Dashboard (SPA)                               │   │  │
│  │  │  ├─ 3D Battery Visualization (Three.js)                 │   │  │
│  │  │  ├─ Geospatial Maps (Mapbox/Leaflet)                    │   │  │
│  │  │  ├─ Real-time Updates (Polling)                         │   │  │
│  │  │  └─ Pagination (50 batteries/page)                      │   │  │
│  │  └──────────────────────────────────────────────────────────┘   │  │
│  └────────────────────────┬──────────────────────────────────────┬──┘  │
│                           │                                       │     │
│                           │ HTTPS                                 │     │
│                           ▼                                       │     │
│  ┌─────────────────────────────────────────────────────────────┐ │     │
│  │                       Backend Service                        │ │     │
│  │  ┌──────────────────────────────────────────────────────┐   │ │     │
│  │  │  Express.js (Port 3000)                              │   │ │     │
│  │  │  ├─ REST API (/api/v1/*)                            │   │ │     │
│  │  │  ├─ Health Check (/api/v1/health)                   │   │ │     │
│  │  │  ├─ Prometheus Metrics (/metrics)                   │   │ │     │
│  │  │  └─ Background Jobs                                 │   │ │     │
│  │  │     ├─ Sensor Ingestion (10s interval)              │   │ │     │
│  │  │     ├─ Prediction Job (60min interval)              │   │ │     │
│  │  │     └─ Alert Escalation (5min interval)             │   │ │     │
│  │  └──────────────────────────────────────────────────────┘   │ │     │
│  └────────────┬─────────────────────────┬──────────────────────┘ │     │
│               │                         │                         │     │
│               │ TCP                     │ HTTPS                   │     │
│               ▼                         ▼                         │     │
│  ┌─────────────────────────┐  ┌──────────────────────────────┐  │     │
│  │  PostgreSQL + TimescaleDB│  │    Simulator Service         │  │     │
│  │  ┌─────────────────────┐│  │  ┌──────────────────────────┐│  │     │
│  │  │ Tables:             ││  │  │ FastAPI (Port 8001)      ││  │     │
│  │  │ • facilities        ││  │  │ ├─ Sensor Readings      ││  │     │
│  │  │ • battery_systems   ││  │  │ ├─ Batch Endpoint       ││  │     │
│  │  │ • zones (strings)   ││  │  │ ├─ LRU Cache (500)      ││  │     │
│  │  │ • sensor_readings   ││  │  │ └─ Parallel Workers(10) ││  │     │
│  │  │   (hypertable)      ││  │  └──────────────────────────┘│  │     │
│  │  │ • rul_predictions   ││  └──────────────────────────────┘  │     │
│  │  │ • alerts            ││                                     │     │
│  │  └─────────────────────┘│                                     │     │
│  └─────────────────────────┘                                     │     │
│               │                                                   │     │
│               │ HTTPS                                            │     │
│               ▼                                                   │     │
│  ┌─────────────────────────────────────────────────────────────┐ │     │
│  │                       MLOps Service                          │ │     │
│  │  ┌──────────────────────────────────────────────────────┐   │ │     │
│  │  │  FastAPI (Port 8001)                                 │   │ │     │
│  │  │  ├─ RUL Prediction (/ml/predict-rul)                │   │ │     │
│  │  │  ├─ Batch Prediction (/ml/predict-rul/batch)        │   │ │     │
│  │  │  ├─ SHAP Explainability (/ml/explain)               │   │ │     │
│  │  │  ├─ LSTM Model (TensorFlow/Keras)                   │   │ │     │
│  │  │  ├─ Model Cache (4 models)                          │   │ │     │
│  │  │  └─ Internal Batching (batch_size=50)               │   │ │     │
│  │  └──────────────────────────────────────────────────────┘   │ │     │
│  └─────────────────────────────────────────────────────────────┘ │     │
│                                                                     │     │
└─────────────────────────────────────────────────────────────────────┘     
                                                                            
         External Services                                                  
         ┌──────────────────┐                                              
         │ Mapbox API       │◄────── Frontend (optional)                   
         └──────────────────┘                                              
         ┌──────────────────┐                                              
         │ Google Gemini AI │◄────── Frontend (optional)                   
         └──────────────────┘                                              
         ┌──────────────────┐                                              
         │ Sentry           │◄────── Backend (optional)                    
         └──────────────────┘                                              
```

---

## 🔄 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                      Real-time Data Flow                             │
└─────────────────────────────────────────────────────────────────────┘

1. Sensor Data Ingestion (Every 10 seconds)
   ┌─────────────┐     ┌─────────────┐     ┌─────────────────────┐
   │  Simulator  │────▶│   Backend   │────▶│  PostgreSQL         │
   │  (FastAPI)  │     │  Ingestion  │     │  (sensor_readings)  │
   └─────────────┘     │  Service    │     └─────────────────────┘
                       └─────────────┘
   
2. Prediction Pipeline (Every 60 minutes)
   ┌─────────────────────┐     ┌─────────────┐     ┌─────────────┐
   │  PostgreSQL         │────▶│   Backend   │────▶│   MLOps     │
   │  (get latest data)  │     │  Job        │     │  (predict)  │
   └─────────────────────┘     └─────────────┘     └─────────────┘
                                      │                    │
                                      │◄───────────────────┘
                                      │ (predictions)
                                      ▼
                               ┌─────────────────────┐
                               │  PostgreSQL         │
                               │  (rul_predictions)  │
                               └─────────────────────┘

3. Frontend Display (Every 10-60 seconds)
   ┌─────────────┐     ┌─────────────┐     ┌─────────────────────┐
   │  Frontend   │────▶│   Backend   │────▶│  PostgreSQL         │
   │  (polling)  │     │  REST API   │     │  (all tables)       │
   └─────────────┘     └─────────────┘     └─────────────────────┘
        │                     │
        │◄────────────────────┘
        │ (JSON response)
        ▼
   ┌─────────────┐
   │  Dashboard  │
   │  Display    │
   └─────────────┘

4. Alert Escalation (Every 5 minutes)
   ┌─────────────────────┐     ┌─────────────┐
   │  PostgreSQL         │────▶│   Backend   │
   │  (check alerts)     │     │  Job        │
   └─────────────────────┘     └─────────────┘
                                      │
                                      ▼
                               ┌─────────────────────┐
                               │  PostgreSQL         │
                               │  (update alerts)    │
                               └─────────────────────┘
```

---

## 🗄️ Database Schema Overview

```
PostgreSQL + TimescaleDB Extension

┌────────────────────────────────────────────────────────────────┐
│  facilities (9 rows)                                           │
│  ├─ id (UUID)                                                  │
│  ├─ name (e.g., "Chiangmai Data Center")                      │
│  ├─ location (lat/lng for geospatial)                         │
│  └─ capacity_kwh                                               │
└────────────────────────────────────────────────────────────────┘
                             │
                             │ 1:N
                             ▼
┌────────────────────────────────────────────────────────────────┐
│  zones (81 rows - strings)                                     │
│  ├─ id (UUID)                                                  │
│  ├─ facility_id (FK)                                           │
│  ├─ zone_type ('STRING')                                       │
│  ├─ name (e.g., "String-REC-01")                              │
│  └─ capacity_kwh                                               │
└────────────────────────────────────────────────────────────────┘
                             │
                             │ 1:N
                             ▼
┌────────────────────────────────────────────────────────────────┐
│  battery_systems (1,944 rows)                                  │
│  ├─ id (UUID)                                                  │
│  ├─ facility_id (FK)                                           │
│  ├─ zone_id (FK - string)                                      │
│  ├─ battery_id (e.g., "BAT-001")                              │
│  ├─ model ("HX12-120")                                         │
│  ├─ voltage_nominal (12V)                                      │
│  ├─ capacity_ah (120Ah)                                        │
│  └─ capacity_kwh (1.44kWh)                                     │
└────────────────────────────────────────────────────────────────┘
                             │
                             │ 1:N
                             ▼
┌────────────────────────────────────────────────────────────────┐
│  sensor_readings (TimescaleDB hypertable)                      │
│  ├─ time (timestamp - partitioned)                            │
│  ├─ battery_system_id (FK)                                     │
│  ├─ voltage, current, temperature                             │
│  ├─ soc, soh                                                   │
│  └─ power                                                      │
└────────────────────────────────────────────────────────────────┘
                             │
                             │ 1:N
                             ▼
┌────────────────────────────────────────────────────────────────┐
│  rul_predictions (ML predictions)                              │
│  ├─ id (UUID)                                                  │
│  ├─ battery_system_id (FK)                                     │
│  ├─ predicted_rul_days                                         │
│  ├─ confidence_score                                           │
│  ├─ model_version                                              │
│  └─ created_at                                                 │
└────────────────────────────────────────────────────────────────┘
                             │
                             │ 1:N
                             ▼
┌────────────────────────────────────────────────────────────────┐
│  alerts (system alerts)                                        │
│  ├─ id (UUID)                                                  │
│  ├─ battery_system_id (FK)                                     │
│  ├─ alert_type, severity                                       │
│  ├─ status, escalation_level                                   │
│  └─ created_at, acknowledged_at                                │
└────────────────────────────────────────────────────────────────┘
```

---

## 🐳 Docker Container Architecture

```
┌───────────────────────────────────────────────────────────────┐
│                    Docker Compose Stack                        │
│                   (Local Development)                          │
├───────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐  │
│  │   Frontend     │  │    Backend     │  │   Simulator    │  │
│  │                │  │                │  │                │  │
│  │  FROM:         │  │  FROM:         │  │  FROM:         │  │
│  │  node:18-alpine│  │  node:18-alpine│  │  python:3.11   │  │
│  │                │  │                │  │                │  │
│  │  Stage 1:      │  │  Stage 1:      │  │  Single Stage  │  │
│  │  npm build     │  │  npm build     │  │  pip install   │  │
│  │                │  │                │  │  uvicorn       │  │
│  │  Stage 2:      │  │  Stage 2:      │  │                │  │
│  │  nginx:alpine  │  │  node:18-alpine│  │  Port: 8001    │  │
│  │  serve static  │  │  node dist/    │  │                │  │
│  │                │  │                │  │  Workers: 2    │  │
│  │  Port: 80      │  │  Port: 3000    │  │                │  │
│  │  Size: ~50 MB  │  │  Size: ~150 MB │  │  Size: ~200 MB │  │
│  └────────────────┘  └────────────────┘  └────────────────┘  │
│                                                                 │
│  ┌────────────────┐  ┌────────────────────────────────────┐  │
│  │     MLOps      │  │         PostgreSQL                 │  │
│  │                │  │                                     │  │
│  │  FROM:         │  │  FROM:                             │  │
│  │  python:3.11   │  │  timescale/timescaledb:latest-pg14│  │
│  │                │  │                                     │  │
│  │  Single Stage  │  │  Extensions:                       │  │
│  │  pip install   │  │  • timescaledb                     │  │
│  │  tensorflow    │  │  • postgis                         │  │
│  │  uvicorn       │  │                                     │  │
│  │                │  │  Port: 5432                        │  │
│  │  Port: 8001    │  │  Volume: postgres_data             │  │
│  │  Workers: 2    │  │                                     │  │
│  │  Size: ~500 MB │  │  Size: ~200 MB                     │  │
│  └────────────────┘  └────────────────────────────────────┘  │
│                                                                 │
└───────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────┐
│                Railway Production Deployment                   │
│              (Individual Services + Database)                  │
├───────────────────────────────────────────────────────────────┤
│                                                                 │
│  Each service runs in its own Railway container                │
│  PostgreSQL is provisioned as a Railway plugin                 │
│  Services automatically linked via internal networking         │
│  Health checks monitor service availability                    │
│  Auto-restart on failure (max 3 retries)                       │
│                                                                 │
└───────────────────────────────────────────────────────────────┘
```

---

## ⚡ Performance & Scaling

```
Performance Characteristics

Frontend:
┌────────────────────────────────────────┐
│ Metric          │ Target    │ Actual   │
├─────────────────┼───────────┼──────────┤
│ Initial Load    │ < 3s      │ ~2.5s    │
│ Page Navigation │ < 500ms   │ ~300ms   │
│ Bundle Size     │ < 2 MB    │ ~1.8 MB  │
│ Lighthouse      │ > 90      │ ~92      │
│ Pagination      │ 50/page   │ 50/page  │
└────────────────────────────────────────┘

Backend:
┌────────────────────────────────────────┐
│ Metric          │ Target    │ Actual   │
├─────────────────┼───────────┼──────────┤
│ Response (p95)  │ < 200ms   │ ~150ms   │
│ Health Check    │ < 50ms    │ ~30ms    │
│ DB Query        │ < 100ms   │ ~80ms    │
│ Concurrent      │ 100+      │ 150+     │
└────────────────────────────────────────┘

Simulator:
┌────────────────────────────────────────┐
│ Metric          │ Target    │ Actual   │
├─────────────────┼───────────┼──────────┤
│ Single Reading  │ < 50ms    │ ~30ms    │
│ Batch (200)     │ < 2s      │ ~1.5s    │
│ Cache Hit Rate  │ 70-80%    │ ~75%     │
│ Memory Usage    │ ~250 MB   │ ~240 MB  │
└────────────────────────────────────────┘

MLOps:
┌────────────────────────────────────────┐
│ Metric          │ Target    │ Actual   │
├─────────────────┼───────────┼──────────┤
│ Single Predict  │ < 100ms   │ ~80ms    │
│ Batch (500)     │ < 20s     │ ~18s     │
│ Model Load      │ < 5s      │ ~4s      │
│ Memory Usage    │ ~600 MB   │ ~580 MB  │
└────────────────────────────────────────┘
```

---

## 🔐 Security Architecture

```
Security Layers

┌────────────────────────────────────────────────────────────┐
│  Layer 1: Railway Platform Security                        │
│  ├─ HTTPS/TLS encryption for all traffic                  │
│  ├─ Private internal networking between services          │
│  ├─ Environment variable encryption                       │
│  └─ Automatic security patches                            │
└────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌────────────────────────────────────────────────────────────┐
│  Layer 2: Application Security                             │
│  ├─ Nginx security headers (X-Frame-Options, CSP)         │
│  ├─ Express.js middleware (helmet, cors)                  │
│  ├─ Input validation (Pydantic, TypeScript)               │
│  └─ SQL injection prevention (parameterized queries)      │
└────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌────────────────────────────────────────────────────────────┐
│  Layer 3: Container Security                               │
│  ├─ Non-root users in containers                          │
│  ├─ Minimal base images (alpine)                          │
│  ├─ No secrets in images                                  │
│  └─ Read-only file systems where possible                 │
└────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌────────────────────────────────────────────────────────────┐
│  Layer 4: Database Security                                │
│  ├─ SSL/TLS connections required                          │
│  ├─ Strong password policies                              │
│  ├─ Connection pooling limits                             │
│  └─ Backup encryption                                     │
└────────────────────────────────────────────────────────────┘
```

---

## 📊 Monitoring & Observability

```
Monitoring Stack

Application Metrics (Prometheus)
┌────────────────────────────────────┐
│  Backend (/metrics endpoint)       │
│  ├─ HTTP request duration         │
│  ├─ Request rate                  │
│  ├─ Error rate                    │
│  ├─ Database query duration       │
│  └─ Background job execution      │
└────────────────────────────────────┘

Health Checks
┌────────────────────────────────────┐
│  All Services (30s interval)       │
│  ├─ Backend: /api/v1/health       │
│  ├─ Simulator: /health            │
│  ├─ MLOps: /health                │
│  └─ Frontend: /health             │
└────────────────────────────────────┘

Logs (JSON structured)
┌────────────────────────────────────┐
│  Winston (Backend)                 │
│  ├─ Request logs                  │
│  ├─ Error logs                    │
│  ├─ Background job logs           │
│  └─ Database query logs           │
└────────────────────────────────────┘

Error Tracking (Optional: Sentry)
┌────────────────────────────────────┐
│  Backend + Frontend                │
│  ├─ Exception capture             │
│  ├─ Stack trace analysis          │
│  ├─ User context                  │
│  └─ Performance monitoring        │
└────────────────────────────────────┘
```

---

## 🚀 Deployment Flow

```
Automated Deployment Process

Step 1: Prerequisites Check
┌────────────────────────────────────┐
│  ✓ Railway CLI installed           │
│  ✓ User authenticated             │
│  ✓ Docker files present           │
└────────────────────────────────────┘
                │
                ▼
Step 2: Project Initialization
┌────────────────────────────────────┐
│  railway init --name nt-poc        │
│  railway add --plugin postgresql   │
└────────────────────────────────────┘
                │
                ▼
Step 3: Backend Deployment
┌────────────────────────────────────┐
│  cd services/backend               │
│  railway up --service backend      │
│  railway variables set (10 vars)   │
│  railway run npm run migrate       │
│  railway run npm run seed          │
└────────────────────────────────────┘
                │
                ▼
Step 4: Support Services
┌────────────────────────────────────┐
│  Deploy Simulator                  │
│  Deploy MLOps                      │
│  Link services with URLs           │
└────────────────────────────────────┘
                │
                ▼
Step 5: Frontend Deployment
┌────────────────────────────────────┐
│  cd services/frontend              │
│  railway up --service frontend     │
│  railway variables set VITE_API... │
└────────────────────────────────────┘
                │
                ▼
Step 6: Verification
┌────────────────────────────────────┐
│  ✓ All services running            │
│  ✓ Health checks passing          │
│  ✓ Database seeded (1,944 bats)   │
│  ✓ Frontend accessible            │
└────────────────────────────────────┘
```

---

**Architecture Status:** ✅ Production-Ready

**Last Updated:** 2026-01-17
