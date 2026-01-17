# 9-Battery Configuration Guide

Complete setup guide for the NT-POC Battery Management System with 9 battery locations across 3 facilities in Thailand.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  Frontend (React + Vite)                                    │
│  - Dashboard with 9 battery cards                           │
│  - 3D visualization per battery                             │
│  - Real-time sensor data display                            │
│  - Geospatial map with 3 facilities                         │
└────────────────┬────────────────────────────────────────────┘
                 │ HTTP polling (every 10s)
┌────────────────▼────────────────────────────────────────────┐
│  Backend (Express + TypeScript)                             │
│  - API endpoints (/api/v1/*)                                │
│  - Sensor ingestion service                                 │
│  - Background jobs (predictions, alerts)                    │
└────┬───────────────────┬──────────────────────────────┬─────┘
     │                   │                              │
     │ polls every 10s   │ stores data                  │ triggers predictions
     │                   │                              │
┌────▼──────┐   ┌────────▼────────┐          ┌─────────▼──────┐
│ Simulator │   │  TimescaleDB    │          │  MLOps Service │
│  Service  │   │  (PostgreSQL)   │          │   (FastAPI)    │
│ (FastAPI) │   │  - sensor_read. │          │  - RUL predict │
│           │   │  - battery_sys. │          │  - SHAP explai.│
└───────────┘   └─────────────────┘          └────────────────┘
```

## Battery Layout

### 9 Batteries Across 3 Facilities

| Battery ID | Serial Number | Facility        | Zone   | Location        | Capacity | Model           | 3D Position      |
|------------|---------------|-----------------|--------|-----------------|----------|-----------------|------------------|
| BAT-01     | BAT-BKK-01    | Bangkok HQ      | Zone 1 | Rack A, Bay U01 | 620 kWh  | RackMax-600     | (1.0, 0.8, 0)    |
| BAT-02     | BAT-BKK-02    | Bangkok HQ      | Zone 1 | Rack A, Bay U03 | 610 kWh  | RackMax-600     | (1.0, 1.6, 0)    |
| BAT-03     | BAT-BKK-03    | Bangkok HQ      | Zone 1 | Rack B, Bay U05 | 640 kWh  | RackMax-650     | (1.8, 1.2, 0)    |
| BAT-04     | BAT-PKT-01    | Phuket DC       | Zone 2 | Cabinet 1, L1   | 780 kWh  | CabinetCore-800 | (2.5, 0.7, 0)    |
| BAT-05     | BAT-PKT-02    | Phuket DC       | Zone 2 | Cabinet 1, L3   | 810 kWh  | CabinetCore-820 | (2.5, 1.5, 0)    |
| BAT-06     | BAT-PKT-03    | Phuket DC       | Zone 2 | Cabinet 2, L2   | 805 kWh  | CabinetCore-820 | (3.4, 1.1, 0)    |
| BAT-07     | BAT-CNX-01    | Chiang Mai Ops  | Zone 3 | Floor Unit      | 690 kWh  | FloorSafe-700   | (0.9, 0.9, 0)    |
| BAT-08     | BAT-CNX-02    | Chiang Mai Ops  | Zone 3 | Floor Unit      | 700 kWh  | FloorSafe-700   | (2.0, 1.2, 0)    |
| BAT-09     | BAT-CNX-03    | Chiang Mai Ops  | Zone 3 | Floor Unit      | 720 kWh  | FloorSafe-720   | (3.1, 0.8, 0)    |

### Facility Details

**Bangkok HQ Energy Hub**
- Location: CentralWorld Tower, Level 5, Bangkok
- Coordinates: 13.7563°N, 100.5018°E
- Zones: 2 (Zone 1 active with 3 batteries)
- Layout: Rack-based system

**Phuket DC Battery Campus**
- Location: Phuket Tech Park, Building 2
- Coordinates: 7.8966°N, 98.3521°E
- Zones: 2 (Zone 2 active with 3 batteries)
- Layout: Cabinet-based system

**Chiang Mai Innovation Office**
- Location: Nimmanhaemin Innovation Center
- Coordinates: 18.7883°N, 98.9853°E
- Zones: 1 (Zone 3 active with 3 batteries)
- Layout: Floor-mounted system

## Database Schema

### Battery Systems Table

```sql
-- Core battery information with 3D layout fields
CREATE TABLE battery_systems (
    id UUID PRIMARY KEY,
    zone_id UUID REFERENCES zones(id) ON DELETE CASCADE,
    serial_number VARCHAR(255) UNIQUE NOT NULL,
    model VARCHAR(255) NOT NULL,
    manufacturer VARCHAR(255),
    capacity_kwh DECIMAL(10, 2),
    voltage_v DECIMAL(10, 2),
    status VARCHAR(50) DEFAULT 'active',
    health_score INTEGER,
    
    -- 3D Layout Fields (added in migration 20260117072000)
    position_x DECIMAL(10, 4),          -- X coordinate in zone (meters)
    position_y DECIMAL(10, 4),          -- Y coordinate in zone (meters)
    position_z DECIMAL(10, 4) DEFAULT 0, -- Z coordinate (height, meters)
    rotation_pitch DECIMAL(6, 2) DEFAULT 0, -- Pitch rotation (degrees)
    rotation_yaw DECIMAL(6, 2) DEFAULT 0,   -- Yaw rotation (degrees)
    rotation_roll DECIMAL(6, 2) DEFAULT 0,  -- Roll rotation (degrees)
    width_m DECIMAL(6, 3),              -- Battery width (meters)
    height_m DECIMAL(6, 3),             -- Battery height (meters)
    depth_m DECIMAL(6, 3),              -- Battery depth (meters)
    rack_id VARCHAR(64),                -- Physical rack identifier
    bay_position VARCHAR(32),           -- Bay/slot position
    display_color VARCHAR(7),           -- Hex color for UI (#RRGGBB)
    icon_type VARCHAR(64),              -- Icon type (battery_rack, battery_cabinet, floor_unit)
    model_3d_reference VARCHAR(255),    -- 3D model file reference
    installation_date TIMESTAMP WITH TIME ZONE,
    last_maintenance_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Sensor Readings (TimescaleDB Hypertable)

```sql
-- Time-series sensor data (optimized for time-based queries)
CREATE TABLE sensor_readings (
    battery_system_id UUID REFERENCES battery_systems(id) ON DELETE CASCADE,
    time TIMESTAMP WITH TIME ZONE NOT NULL,
    voltage DECIMAL(10, 4),      -- Volts
    current DECIMAL(10, 4),      -- Amperes
    temperature DECIMAL(10, 2),  -- Celsius
    soc DECIMAL(5, 2),           -- State of Charge (%)
    soh DECIMAL(5, 2),           -- State of Health (%)
    power DECIMAL(10, 3),        -- Power (kW)
    PRIMARY KEY (battery_system_id, time)
);

-- Convert to hypertable for time-series optimization
SELECT create_hypertable('sensor_readings', 'time');
```

## Configuration Files

### 1. Backend Configuration (.env)

```bash
# Database (TimescaleDB)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=battery_management
DB_USER=postgres
DB_PASSWORD=postgres
DB_SSL=false

# Server
PORT=3000
NODE_ENV=development

# Simulator Integration
SIMULATOR_URL=http://localhost:8001
SENSOR_INGESTION_ENABLED=true
SENSOR_INGESTION_INTERVAL=10000  # 10 seconds - polls all 9 batteries

# Background Jobs
PREDICTION_JOB_INTERVAL_MINUTES=60   # RUL predictions every hour
ESCALATION_JOB_INTERVAL_MINUTES=5    # Alert escalation every 5 minutes

# MLOps Service
MLOPS_SERVICE_URL=http://localhost:8000
MLOPS_TIMEOUT_MS=30000
```

### 2. Simulator Configuration (.env)

```bash
# Application
APP_NAME=Battery Simulator Service
PORT=8001
ENVIRONMENT=development
LOG_LEVEL=INFO

# CRITICAL: Backend Selection
SENSOR_BACKEND=simulator  # or "hardware" for production

# Simulator Settings (realistic battery behavior)
SIMULATOR_NOISE_LEVEL=0.02        # 2% sensor noise
SIMULATOR_DRIFT_ENABLED=true      # Enable SoC/SoH degradation
SIMULATOR_UPDATE_INTERVAL_MS=1000 # Update state every 1 second
SIMULATOR_SOC_DECAY_RATE=0.1      # SoC decreases 0.1% per minute
SIMULATOR_SOH_DECAY_RATE=0.0001   # SoH decreases 0.01% per cycle

# CORS (allow frontend access)
CORS_ORIGINS=["http://localhost:3000","http://localhost:5173"]
```

### 3. Frontend Configuration (.env)

```bash
VITE_API_URL=http://localhost:3000
VITE_MAPBOX_TOKEN=your-mapbox-token  # For geospatial map
VITE_GEMINI_API_KEY=your-gemini-key  # For AI chat features
```

## Setup Instructions

### Step 1: Database Setup

```bash
# Start PostgreSQL with TimescaleDB extension
docker-compose up -d postgres

# Or use existing PostgreSQL and add TimescaleDB
psql -U postgres -d battery_management -c "CREATE EXTENSION IF NOT EXISTS timescaledb;"

# Run migrations (creates all tables including 9-battery schema)
cd services/backend
npm run migrate

# Seed database with 9 batteries and sample data
npm run seed
```

**Verification:**
```bash
# Check all 9 batteries are created
psql -U postgres -d battery_management -c "SELECT id, serial_number, zone_id FROM battery_systems ORDER BY serial_number;"

# Expected output:
#                   id                  | serial_number |               zone_id
# --------------------------------------+---------------+--------------------------------------
#  b0000000-0000-0000-0000-000000000001 | BAT-BKK-01    | z0000000-0000-0000-0000-000000000001
#  b0000000-0000-0000-0000-000000000002 | BAT-BKK-02    | z0000000-0000-0000-0000-000000000001
#  ... (9 rows)
```

### Step 2: Start Simulator Service

```bash
cd services/simulator

# Create Python virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start simulator (serves all 9 battery IDs)
uvicorn app.main:app --reload --port 8001

# Verify simulator is running
curl http://localhost:8001/api/health
# Expected: {"backend_type": "simulator", "status": "healthy", ...}

# Test individual battery reading
curl http://localhost:8001/api/sensors/reading/b0000000-0000-0000-0000-000000000001
# Expected: {"voltage": 3.x, "current": -xx.x, "temperature": xx.x, "soc": xx.x, "soh": xx.x, ...}
```

### Step 3: Start Backend Service

```bash
cd services/backend

# Install dependencies
npm install

# Run migrations if not done yet
npm run migrate

# Start backend (automatically starts sensor ingestion)
npm run dev:backend

# Check logs for sensor ingestion
# Expected logs:
# sensor_ingestion_starting {"simulatorUrl": "http://localhost:8001", "intervalMs": 10000}
# sensor_ingestion_run_completed {"fetched": 9, "stored": 9, "failed": 0, "durationMs": 234}
```

**Verification:**
```bash
# Check sensor data is being stored
psql -U postgres -d battery_management -c "SELECT battery_system_id, time, voltage, temperature, soc FROM sensor_readings ORDER BY time DESC LIMIT 9;"

# Expected: Recent readings for all 9 batteries
```

### Step 4: Start Frontend

```bash
cd services/frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Open browser: http://localhost:5173
```

## API Endpoints

### Backend Endpoints (Port 3000)

**Facilities & Batteries**
```bash
GET  /api/v1/facilities              # List all 3 facilities
GET  /api/v1/facilities/:id          # Get facility details
GET  /api/v1/facilities/:id/battery-systems  # Get batteries for facility
GET  /api/v1/battery-systems         # List all 9 battery systems
GET  /api/v1/battery-systems/:id     # Get battery details with 3D position
```

**Sensor Data**
```bash
GET  /api/v1/sensor-readings         # List recent readings for all batteries
GET  /api/v1/sensor-readings/:batteryId/latest  # Latest reading for battery
GET  /api/v1/sensor-readings/:batteryId/history # Historical data
```

**Predictions & Alerts**
```bash
GET  /api/v1/predictions             # List RUL predictions for all batteries
GET  /api/v1/predictions/:batteryId  # Predictions for specific battery
GET  /api/v1/alerts                  # Active alerts across all batteries
GET  /api/v1/alerts/:batteryId       # Alerts for specific battery
```

**Geospatial**
```bash
GET  /api/v1/geospatial/facilities   # Facilities with coordinates
GET  /api/v1/geospatial/nearby/:facilityId  # Nearby facilities
```

### Simulator Endpoints (Port 8001)

**Single Battery Reading**
```bash
GET  /api/sensors/reading/{battery_system_id}
# Example: GET /api/sensors/reading/b0000000-0000-0000-0000-000000000001
# Response: {"voltage": 3.7, "current": -12.5, "temperature": 26.3, "soc": 85.2, "soh": 96.1, ...}
```

**Batch Readings**
```bash
POST /api/sensors/readings/batch
# Body: {"battery_system_ids": ["b0000000-0000-0000-0000-000000000001", ...]}
# Response: {"success": true, "data": [...], "count": 9}
```

**Battery Metrics**
```bash
GET  /api/sensors/metrics/{battery_system_id}
# Returns: aggregated metrics, statistics, health indicators
```

**Health Check**
```bash
GET  /api/health
# Response: {"backend_type": "simulator", "status": "healthy", "batteries_tracked": 9, ...}
```

**API Documentation**
```bash
# Interactive Swagger UI
http://localhost:8001/docs

# OpenAPI JSON
http://localhost:8001/openapi.json
```

## Data Flow

### Real-time Sensor Data Flow

```
1. Simulator generates realistic sensor data for each battery (independent state per battery)
   ├─ Voltage: Based on Li-ion discharge curve (SoC-dependent)
   ├─ Current: Negative = discharge, Positive = charge
   ├─ Temperature: Affected by current flow (I²R heating)
   ├─ SoC: Decreases over time (decay rate: 0.1%/min)
   └─ SoH: Degrades with cycles (decay rate: 0.01%/cycle)

2. Backend ingestion service polls simulator every 10 seconds
   ├─ Fetches readings for all 9 batteries in parallel
   ├─ Stores in TimescaleDB (sensor_readings hypertable)
   └─ Logs: "sensor_ingestion_run_completed {fetched: 9, stored: 9}"

3. Background prediction job runs every 60 minutes
   ├─ Fetches feature data from TimescaleDB
   ├─ Calls MLOps service for RUL prediction
   ├─ Stores predictions in rul_predictions table
   └─ Triggers alerts if RUL < threshold

4. Frontend polls backend every 10 seconds
   ├─ Dashboard displays 9 battery cards with real-time data
   ├─ 3D visualization shows battery positions in zones
   ├─ Map displays 3 facilities with status indicators
   └─ Charts show historical trends per battery
```

## Simulator Architecture

### State Management (Per Battery)

Each battery maintains independent state:
```python
class BatteryState:
    battery_system_id: str
    soc: float              # State of Charge (0-100%)
    soh: float              # State of Health (70-100%)
    temperature: float      # Temperature (°C)
    cycle_count: int        # Number of charge cycles
    last_updated: datetime  # Last state update timestamp
    discharge_rate: float   # Current discharge rate (A)
```

### Realistic Behavior Simulation

**Voltage Generation** (Li-ion discharge curve)
```python
def _generate_voltage(state: BatteryState) -> float:
    # Voltage correlates with SoC
    base_voltage = 3.0 + (state.soc / 100.0) * 1.2  # 3.0V-4.2V range
    noise = random.normal(0, noise_level * 0.1)
    return clamp(base_voltage + noise, 2.8, 4.3)
```

**Current Generation**
```python
def _generate_current(state: BatteryState) -> float:
    # Negative = discharge, Positive = charge
    base_current = state.discharge_rate  # Typically -5A to -15A
    noise = random.normal(0, noise_level * 2.0)
    return clamp(base_current + noise, -50.0, 50.0)
```

**Temperature Generation** (I²R heating)
```python
def _generate_temperature(state: BatteryState, current: float) -> float:
    # Heat generation: proportional to current²
    heat = 0.05 * (current ** 2)
    
    # Ambient cooling
    cooling = 0.1 * (state.temperature - 25.0)
    
    # Update temperature with thermal dynamics
    new_temp = state.temperature + heat - cooling
    noise = random.normal(0, noise_level * 0.5)
    return clamp(new_temp + noise, 15.0, 45.0)
```

**Temporal Drift** (SoC/SoH degradation)
```python
def _apply_drift(state: BatteryState) -> None:
    elapsed_minutes = (now - state.last_updated).total_seconds() / 60.0
    
    # SoC decreases over time (discharge)
    state.soc = max(0, state.soc - (0.1 * elapsed_minutes))
    
    # Cycle count increases probabilistically
    if random.random() < (elapsed_minutes / 60.0):  # ~1 cycle/hour
        state.cycle_count += 1
        state.soh = max(70, state.soh - 0.0001)  # SoH degrades
    
    state.last_updated = now
```

## Testing

### Unit Tests

**Backend**
```bash
cd services/backend
npm test                    # Run all tests
npm run test:coverage       # Generate coverage report
npm run test:migrations     # Test database migrations
```

**Simulator**
```bash
cd services/simulator
pytest                      # Run all tests
pytest tests/test_simulator.py -v  # Verbose output
```

### Integration Tests

**End-to-End Data Flow**
```bash
# 1. Start all services
docker-compose up -d postgres
cd services/simulator && uvicorn app.main:app --port 8001 &
cd services/backend && npm run dev:backend &

# 2. Wait 30 seconds for sensor ingestion cycles

# 3. Verify data flow
curl http://localhost:8001/api/sensors/reading/b0000000-0000-0000-0000-000000000001
# Should return current sensor reading

curl http://localhost:3000/api/v1/sensor-readings/b0000000-0000-0000-0000-000000000001/latest
# Should return latest reading from database

# 4. Check database directly
psql -U postgres -d battery_management -c "SELECT COUNT(*) FROM sensor_readings WHERE battery_system_id = 'b0000000-0000-0000-0000-000000000001';"
# Should return > 0 rows
```

### Frontend E2E Tests

```bash
cd services/frontend
npm run test:e2e            # Playwright E2E tests
npm run test:smoke          # Quick smoke tests
npm run test:a11y           # Accessibility tests
```

## Monitoring

### Logs

**Backend Logs (Structured JSON)**
```bash
cd services/backend
npm run dev:backend | bunyan  # Pretty-print JSON logs

# Key log messages for sensor ingestion:
# - sensor_ingestion_starting
# - sensor_ingestion_run_completed {fetched: 9, stored: 9, durationMs: 200}
# - sensor_ingestion_fetch_failed {batterySystemId: "...", error: "..."}
```

**Simulator Logs**
```bash
cd services/simulator
uvicorn app.main:app --port 8001 --log-level info

# Key log messages:
# - Simulator initialized: seed=None, noise=0.02, drift=True
# - Created new state for b0000000-0000-0000-0000-000000000001
```

### Metrics

**Backend Prometheus Metrics**
```bash
# Access metrics endpoint
curl http://localhost:3000/metrics

# Key metrics:
# - sensor_ingestion_runs_total
# - sensor_ingestion_duration_seconds
# - sensor_readings_stored_total
# - api_requests_total
```

**Health Checks**
```bash
# Backend health
curl http://localhost:3000/api/v1/health

# Simulator health
curl http://localhost:8001/api/health

# Database connection
psql -U postgres -d battery_management -c "SELECT 1;"
```

## Troubleshooting

### Simulator Not Accessible

**Symptom:** Backend logs show `sensor_ingestion_simulator_not_accessible`

**Solutions:**
1. Check simulator is running: `curl http://localhost:8001/api/health`
2. Verify port 8001 is not blocked: `lsof -i :8001`
3. Check simulator logs for errors: `tail -f services/simulator/logs/*`
4. Verify CORS configuration allows backend origin

### No Sensor Data in Database

**Symptom:** `sensor_readings` table is empty

**Debug Steps:**
```bash
# 1. Check backend ingestion is enabled
grep SENSOR_INGESTION_ENABLED services/backend/.env
# Should be: SENSOR_INGESTION_ENABLED=true

# 2. Check backend logs for ingestion messages
npm run dev:backend | grep sensor_ingestion

# 3. Manually test simulator endpoint
curl http://localhost:8001/api/sensors/reading/b0000000-0000-0000-0000-000000000001

# 4. Check database connection
psql -U postgres -d battery_management -c "\dt"
# Should list sensor_readings table
```

### Frontend Not Showing Real-time Data

**Symptom:** Dashboard shows "Loading..." or stale data

**Debug Steps:**
1. Check browser console for API errors
2. Verify backend API is accessible: `curl http://localhost:3000/api/v1/facilities`
3. Check CORS configuration in backend `.env`
4. Verify `useSensorData` hook is polling correctly
5. Check Network tab in DevTools for failed requests

### 3D Visualization Not Loading

**Symptom:** 3D battery view shows blank screen

**Debug Steps:**
1. Check browser supports WebGL: Visit https://get.webgl.org/
2. Verify Three.js is installed: `npm list three`
3. Check console for Three.js errors
4. Verify battery has `position_x`, `position_y`, `position_z` in database
5. Check `model_3d_reference` field points to valid model file

### MLOps Predictions Not Running

**Symptom:** `rul_predictions` table is empty

**Debug Steps:**
```bash
# 1. Check MLOps service is running
curl http://localhost:8000/health

# 2. Verify prediction job is scheduled
grep PREDICTION_JOB_INTERVAL services/backend/.env

# 3. Check backend logs for prediction job
npm run dev:backend | grep scheduled_prediction_job

# 4. Manually trigger prediction
curl -X POST http://localhost:3000/api/v1/ml/train
```

## Production Deployment

### Environment Variables (Production)

**Backend**
```bash
NODE_ENV=production
DB_HOST=prod-timescaledb.internal
DB_SSL=true
JWT_SECRET=<strong-random-secret>
SENTRY_DSN=<your-sentry-dsn>
METRICS_AUTH_TOKEN=<random-token>
```

**Simulator → Hardware**
```bash
SENSOR_BACKEND=hardware
HARDWARE_CONNECTION_STRING=modbus://192.168.1.100:502
HARDWARE_TIMEOUT_MS=5000
HARDWARE_RETRY_ATTEMPTS=5
```

### Kubernetes Deployment

See `KUBERNETES_QUICKSTART.md` for detailed instructions.

**Key Resources:**
- StatefulSet: PostgreSQL with TimescaleDB
- Deployment: Backend (3 replicas with HPA)
- Deployment: Frontend (2 replicas with HPA)
- Deployment: MLOps (2 replicas with HPA)
- DaemonSet: Node exporter for monitoring
- Ingress: NGINX with TLS termination

## Additional Resources

- **Backend API Documentation**: Check route files in `services/backend/src/routes/`
- **Simulator API Documentation**: http://localhost:8001/docs (Swagger UI)
- **Database Schema**: See migrations in `services/backend/migrations/`
- **Frontend Components**: `services/frontend/src/components/`
- **ML Model Details**: `services/ml/README.md`
- **Deployment Runbook**: `DEPLOYMENT_RUNBOOK.md`

## Quick Reference

### Battery IDs
```
Bangkok:    b0000000-0000-0000-0000-000000000001, 002, 003
Phuket:     b0000000-0000-0000-0000-000000000004, 005, 006
Chiang Mai: b0000000-0000-0000-0000-000000000007, 008, 009
```

### Service Ports
```
Frontend:   5173 (dev) / 8080 (prod)
Backend:    3000
Simulator:  8001
MLOps:      8000
Database:   5432
Redis:      6379
```

### Key Commands
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f backend

# Reset database
cd services/backend && npm run migrate:rollback && npm run migrate && npm run seed

# Run tests
npm run quality  # Backend typecheck + lint + format
npm test         # Unit tests
npm run test:e2e # E2E tests
```
