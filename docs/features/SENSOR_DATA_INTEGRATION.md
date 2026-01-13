# Real Sensor Data Integration Guide

## Overview

This guide explains how the Battery Management System integrates real sensor data from the simulator service through TimescaleDB.

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────┐
│  Simulator  │────>│   Backend    │────>│ TimescaleDB │<────│ Backend  │
│  Service    │     │  Ingestion   │     │ (Hypertable)│     │   API    │
│  (Port 8001)│     │   Service    │     └─────────────┘     │          │
└─────────────┘     └──────────────┘                         └──────┬───┘
                                                                     │
                                                                     v
                                                              ┌──────────┐
                                                              │ Frontend │
                                                              │  React   │
                                                              └──────────┘
```

## Components

### 1. Simulator Service (Python FastAPI)

**Location:** `/services/simulator`

Generates realistic battery sensor data:
- Voltage (V)
- Current (A)
- Temperature (°C)
- State of Charge - SoC (%)
- State of Health - SoH (%)
- Power (W)

**Endpoint:** `GET /api/sensors/reading/{battery_system_id}`

**Configuration:**
```bash
# In .env or environment
SENSOR_BACKEND=simulator  # Use simulator (default)
SIMULATOR_SEED=42         # Deterministic data (optional)
SIMULATOR_NOISE_LEVEL=0.02 # 2% noise
SIMULATOR_DRIFT_ENABLED=true
```

### 2. Backend Ingestion Service

**File:** `/services/backend/src/services/sensorIngestionService.ts`

Automatically fetches data from simulator and stores in TimescaleDB.

**Features:**
- Polls simulator every 10 seconds (configurable)
- Fetches data for all active battery systems
- Stores in TimescaleDB hypertable for efficient time-series queries
- Graceful error handling

**Configuration:**
```bash
# Backend .env
SIMULATOR_URL=http://localhost:8001  # Simulator URL
SENSOR_INGESTION_ENABLED=true        # Enable/disable ingestion
SENSOR_INGESTION_INTERVAL=10000      # Polling interval in ms (10 seconds)
```

**Auto-start:** Service starts automatically when backend starts.

### 3. TimescaleDB Hypertable

**Table:** `sensor_readings`

**Schema:**
```sql
CREATE TABLE sensor_readings (
  id SERIAL PRIMARY KEY,
  battery_system_id UUID NOT NULL,
  time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  voltage NUMERIC(10,4),
  current NUMERIC(10,4),
  temperature NUMERIC(6,2),
  soc NUMERIC(5,2),
  soh NUMERIC(5,2),
  power NUMERIC(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Convert to hypertable for time-series optimization
SELECT create_hypertable('sensor_readings', 'time', chunk_time_interval => INTERVAL '1 day');
```

**Benefits:**
- Optimized for time-series queries
- Automatic data partitioning
- Fast aggregations
- Efficient storage

### 4. Backend API

**Endpoints:**

#### Get Latest Reading
```http
GET /api/v1/sensor-readings/latest?batterySystemId={id}
Authorization: Bearer {token}
```

**Response:**
```json
{
  "data": {
    "batterySystemId": "uuid",
    "time": "2024-01-13T12:00:00Z",
    "voltage": 3.72,
    "current": -10.5,
    "temperature": 25.3,
    "soc": 75.2,
    "soh": 95.8,
    "power": -39.06
  }
}
```

#### Get Time Series
```http
GET /api/v1/sensor-readings/timeseries?batterySystemId={id}&startTime={iso}&endTime={iso}&interval=raw
Authorization: Bearer {token}
```

**Response:**
```json
{
  "data": [...],
  "total": 100,
  "interval": "raw"
}
```

### 5. Frontend Integration

#### API Service

**File:** `/services/frontend/src/services/sensorDataService.ts`

```typescript
import { getLatestSensorReading } from '../services/sensorDataService';

const reading = await getLatestSensorReading(batteryId, token);
```

#### React Hook

**File:** `/services/frontend/src/hooks/useSensorData.ts`

```typescript
import { useSensorData } from '../hooks/useSensorData';

function MyComponent() {
  const { data, loading, error } = useSensorData(batteryId, token);
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <div>
      <p>SoC: {data?.soc}%</p>
      <p>Temperature: {data?.temperature}°C</p>
    </div>
  );
}
```

#### Multiple Batteries

```typescript
import { useMultipleSensorData } from '../hooks/useSensorData';

function BatteryList() {
  const batteryIds = ['id1', 'id2', 'id3'];
  const { data, loading } = useMultipleSensorData(batteryIds, token);
  
  return (
    <div>
      {batteryIds.map(id => {
        const reading = data.get(id);
        return <BatteryCard key={id} reading={reading} />;
      })}
    </div>
  );
}
```

## Setup Instructions

### Quick Start

1. **Start Simulator Service:**
   ```bash
   cd services/simulator
   pip install -r requirements.txt
   uvicorn app.main:app --reload --port 8001
   ```

2. **Run Database Migration:**
   ```bash
   cd services/backend
   npm run migrate:latest
   ```

3. **Start Backend (with ingestion):**
   ```bash
   cd services/backend
   npm run dev
   ```
   
   You should see:
   ```
   sensor_ingestion_starting
   sensor_ingestion_run_completed { fetched: 10, stored: 10, durationMs: 245 }
   ```

4. **Check Data in Database:**
   ```sql
   SELECT * FROM sensor_readings ORDER BY time DESC LIMIT 10;
   ```

5. **Use in Frontend:**
   ```typescript
   const { data } = useSensorData(batteryId, token);
   ```

### Docker Compose

```yaml
services:
  simulator:
    build: ./services/simulator
    ports:
      - "8001:8001"
    environment:
      - SENSOR_BACKEND=simulator
      - SIMULATOR_DRIFT_ENABLED=true
  
  timescaledb:
    image: timescale/timescaledb:latest-pg14
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_PASSWORD=password
  
  backend:
    build: ./services/backend
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@timescaledb:5432/bms
      - SIMULATOR_URL=http://simulator:8001
      - SENSOR_INGESTION_ENABLED=true
    depends_on:
      - simulator
      - timescaledb
```

## Configuration Reference

### Environment Variables

#### Backend
```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# Simulator Integration
SIMULATOR_URL=http://localhost:8001
SENSOR_INGESTION_ENABLED=true
SENSOR_INGESTION_INTERVAL=10000  # ms

# API
PORT=3000
```

#### Simulator
```bash
# Sensor Backend
SENSOR_BACKEND=simulator  # or 'hardware'

# Simulator Settings
SIMULATOR_SEED=42  # Optional, for deterministic data
SIMULATOR_NOISE_LEVEL=0.02
SIMULATOR_DRIFT_ENABLED=true
SIMULATOR_SOC_DECAY_RATE=0.1
SIMULATOR_SOH_DECAY_RATE=0.0001
```

#### Frontend
```bash
VITE_API_URL=http://localhost:3000
```

## Data Flow Timeline

```
t=0s:   Backend starts → Ingestion service initializes
t=0s:   Fetches all battery_systems from database
t=0s:   Requests sensor data from simulator for each battery
t=0s:   Stores readings in sensor_readings table
t=10s:  Polls again (repeat)
t=∞:    Continuous polling every 10 seconds
```

## Monitoring

### Check Ingestion Status

**Backend logs:**
```
sensor_ingestion_run_completed {
  fetched: 10,
  stored: 10,
  failed: 0,
  durationMs: 245
}
```

### Database Queries

**Count readings:**
```sql
SELECT 
  battery_system_id,
  COUNT(*) as reading_count,
  MAX(time) as latest_reading
FROM sensor_readings
GROUP BY battery_system_id;
```

**Average metrics last hour:**
```sql
SELECT 
  time_bucket('5 minutes', time) as bucket,
  AVG(soc) as avg_soc,
  AVG(temperature) as avg_temp
FROM sensor_readings
WHERE battery_system_id = 'uuid'
  AND time > NOW() - INTERVAL '1 hour'
GROUP BY bucket
ORDER BY bucket DESC;
```

## Troubleshooting

### Simulator Not Accessible

**Symptom:** Logs show `sensor_ingestion_simulator_not_available`

**Solutions:**
1. Check simulator is running: `curl http://localhost:8001/api/health`
2. Verify SIMULATOR_URL environment variable
3. Check network connectivity (Docker network)

### No Data in Database

**Check:**
1. Ingestion enabled: `SENSOR_INGESTION_ENABLED=true`
2. Battery systems exist: `SELECT * FROM battery_systems;`
3. Backend logs for errors
4. Database connection: `\dt sensor_readings` in psql

### Frontend Shows No Data

**Check:**
1. API endpoint accessible: `curl http://localhost:3000/api/v1/sensor-readings/latest?batterySystemId=uuid -H "Authorization: Bearer token"`
2. Token is valid
3. Battery system ID is correct
4. Browser console for errors

## Replacing Mock Data in Components

### Before (Mock Data)
```typescript
import { BRANCHES } from './constants';

function Dashboard() {
  const branch = BRANCHES[0]; // Mock data
  const soc = branch.metrics.soc; // Doesn't exist!
}
```

### After (Real Data)
```typescript
import { useSensorData } from './hooks/useSensorData';
import { useAuthStore } from './store';

function Dashboard() {
  const token = useAuthStore(state => state.token);
  const batteryId = 'uuid-from-branch-or-system';
  const { data } = useSensorData(batteryId, token);
  
  const soc = data?.soc ?? 0;
}
```

## Performance Considerations

### Polling Interval
- Default: 10 seconds
- Faster: More load on simulator/database
- Slower: Less real-time data

### Database Indexing
TimescaleDB automatically creates indexes on:
- `time` (primary partitioning key)
- `battery_system_id, time` (composite index)

### Caching
Consider adding Redis caching for latest readings if load is high.

## Migration from Mock to Real Data

1. ✅ Backend ingestion service created
2. ✅ API endpoints ready
3. ✅ Frontend services/hooks created
4. ⏳ Update components to use hooks
5. ⏳ Remove mock constants

See `/services/frontend/src/components/` for components to update.

## Future Enhancements

- [ ] WebSocket/SSE for real-time push updates
- [ ] Redis caching layer
- [ ] Alert triggers based on sensor thresholds
- [ ] Anomaly detection on sensor data
- [ ] Historical data visualization
- [ ] Export sensor data to CSV
- [ ] Configurable polling intervals per battery
- [ ] Batch API endpoints for efficiency

## API Reference

See full API documentation in `/services/backend/src/routes/sensorReadings.ts`

## Related Documentation

- [Simulator README](/services/simulator/README.md)
- [TimescaleDB Docs](https://docs.timescale.com/)
- [Backend API Docs](/services/backend/README.md)
