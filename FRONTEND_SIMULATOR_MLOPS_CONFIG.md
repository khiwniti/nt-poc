# Frontend, Simulator & MLOps Configuration Summary

## 🎯 Configuration Status for Production Fleet

Your system now has **production-scale backend and database** configured for **1,944 batteries across 9 data centers**. Here's what needs to be updated in each component for correct data display:

---

## 📊 Frontend Configuration Needed

### Current Status
✅ **Backend API**: Configured for 1,944 batteries  
✅ **Database**: Seeded with 9 facilities × 216 batteries  
⚠️ **Frontend**: Uses basic dashboard (needs production-scale components)  
⚠️ **API Integration**: Facility/battery APIs exist but need optimization

### Required Frontend Updates

#### 1. Dashboard Component Enhancement

**Current**: Simple placeholder with hardcoded numbers  
**Needed**: Production dashboard with real data from 1,944 batteries

**Key Changes:**
```typescript
// services/frontend/src/pages/Dashboard.tsx

import { useEffect, useState } from 'react';
import { facilityApi } from '../api/facilities';

export function Dashboard() {
  const [facilities, setFacilities] = useState([]);
  const [stats, setStats] = useState({
    totalBatteries: 0,
    activeFacilities: 0,
    activeAlerts: 0,
    criticalBatteries: 0
  });

  useEffect(() => {
    // Fetch real facility data
    facilityApi.getAll().then(data => {
      setFacilities(data);
      // Calculate fleet-wide statistics
      const totalBatteries = data.reduce((sum, f) => 
        sum + (f.batteryCount || 216), 0
      );
      setStats({ ...stats, totalBatteries });
    });
  }, []);

  return (
    <div>
      <h1>Production Fleet Dashboard</h1>
      <div className="stats-grid">
        <StatCard 
          title="Total Batteries"
          value={stats.totalBatteries}  // Should show 1,944
          trend="+0.5%"
        />
        <StatCard 
          title="Data Centers"
          value={facilities.length}  // Should show 9
        />
        {/* Fleet health metrics */}
      </div>
      
      {/* Facility list with drill-down */}
      <FacilityGrid facilities={facilities} />
    </div>
  );
}
```

#### 2. Facility Map Optimization

**Issue**: Map needs to display 9 facilities efficiently  
**Solution**: Cluster markers, lazy load battery data per facility

```typescript
// services/frontend/src/components/Map/FacilityMap.tsx

- Load all 9 facilities immediately (lightweight: name, coords, status)
- Load 216 batteries per facility only when user clicks facility
- Use pagination for battery lists (show 24-50 at a time)
- Implement virtual scrolling for large battery lists
```

#### 3. Battery List Pagination

**Issue**: Cannot display 1,944 batteries in a single list  
**Solution**: Server-side pagination with filters

```typescript
// API calls with pagination
GET /api/v1/battery-systems?page=1&limit=50&facility=chiangmai

// Frontend pagination component
<BatteryList 
  facilitiesFilter={selectedFacility}  // Filter by data center
  page={currentPage}
  pageSize={50}  // Show 50 batteries at a time
  total={1944}
/>
```

#### 4. Real-time Data Optimization

**Issue**: Cannot poll 1,944 batteries every 10 seconds from frontend  
**Solution**: Facility-level aggregation + on-demand battery details

```typescript
// Dashboard: Show facility-level aggregates
GET /api/v1/facilities/{facilityId}/health  // Aggregated stats

// Drill-down: Show individual battery data on request
GET /api/v1/battery-systems/{batteryId}/latest-reading

// Use WebSocket for critical alerts only (not all sensor data)
```

---

## 🎮 Simulator Configuration Updates

### Current Status
✅ **Architecture**: Supports unlimited batteries with independent state  
✅ **Batch API**: Can handle multiple battery requests  
⚠️ **Performance**: Needs optimization for 1,944 concurrent states  
⚠️ **Configuration**: Needs production performance settings

### Required Simulator Updates

#### 1. State Management Optimization

**File**: `services/simulator/app/implementations/simulator.py`

**Current**: Stores all battery states in memory  
**Recommended**: LRU cache with eviction policy

```python
# Add to SimulatorSensor class
from functools import lru_cache
from cachetools import LRUCache

class SimulatorSensor(SensorInterface):
    def __init__(self, ...):
        # Limit cache to 500 most recently accessed batteries
        self._battery_states_cache = LRUCache(maxsize=500)
        # Full state backup in Redis (optional)
        self._redis_client = redis.Redis() if REDIS_ENABLED else None
    
    def _get_or_create_state(self, battery_system_id: str):
        # Check cache first
        if battery_system_id in self._battery_states_cache:
            return self._battery_states_cache[battery_system_id]
        
        # Check Redis backup (for distributed deployment)
        if self._redis_client:
            cached = self._redis_client.get(f"battery:{battery_system_id}")
            if cached:
                return pickle.loads(cached)
        
        # Create new state
        state = self._create_initial_state(battery_system_id)
        self._battery_states_cache[battery_system_id] = state
        return state
```

#### 2. Batch Performance Tuning

**File**: `services/simulator/app/api/sensors.py`

**Add batch size limits and parallel processing:**

```python
from concurrent.futures import ThreadPoolExecutor
import asyncio

@router.post("/readings/batch")
async def get_multiple_readings(request_body: BatchReadingRequest):
    battery_ids = request_body.battery_system_ids
    
    # Enforce batch size limit
    if len(battery_ids) > 200:
        raise HTTPException(
            status_code=400,
            detail="Batch size limited to 200 batteries"
        )
    
    # Parallel processing for better performance
    async def fetch_reading(battery_id):
        return await sensor.get_reading(battery_id)
    
    readings = await asyncio.gather(*[
        fetch_reading(bid) for bid in battery_ids
    ])
    
    return MultiReadingResponse(
        success=True,
        data=readings,
        count=len(readings)
    )
```

#### 3. Production Configuration

**File**: `services/simulator/.env`

```bash
# Production Performance Settings
SIMULATOR_CACHE_SIZE=500              # LRU cache size
SIMULATOR_BATCH_LIMIT=200             # Max batteries per batch request
SIMULATOR_PARALLEL_WORKERS=10         # Concurrent processing threads

# State management
SIMULATOR_STATE_PERSISTENCE=redis     # Use Redis for state backup
REDIS_URL=redis://localhost:6379/0    # Redis connection

# Performance tuning
SIMULATOR_UPDATE_INTERVAL_MS=5000     # Slower updates for production
SIMULATOR_LAZY_INITIALIZATION=true    # Don't pre-create all 1,944 states
```

---

## 🤖 MLOps Configuration Updates

### Current Status
✅ **FastAPI Service**: Can handle prediction requests  
⚠️ **Batch Processing**: Needs optimization for 1,944 batteries  
⚠️ **Training Data**: Needs to handle production data volume

### Required MLOps Updates

#### 1. Batch Prediction API

**File**: `services/mlops/src/main.py` (or create)

**Add fleet-wide batch prediction endpoint:**

```python
from fastapi import FastAPI, BackgroundTasks
from pydantic import BaseModel
from typing import List
import asyncio

app = FastAPI()

class BatchPredictionRequest(BaseModel):
    battery_ids: List[str]
    prediction_horizon_days: int = 30

class PredictionResult(BaseModel):
    battery_id: str
    predicted_rul_days: float
    confidence: float
    risk_level: str

@app.post("/predict/batch")
async def predict_batch(
    request: BatchPredictionRequest,
    background_tasks: BackgroundTasks
):
    """
    Batch prediction for multiple batteries
    Handles up to 500 batteries per request
    """
    if len(request.battery_ids) > 500:
        raise HTTPException(400, "Max 500 batteries per batch")
    
    # Parallel prediction using model
    results = await run_batch_predictions(
        request.battery_ids,
        request.prediction_horizon_days
    )
    
    return {
        "predictions": results,
        "count": len(results),
        "timestamp": datetime.utcnow().isoformat()
    }

@app.post("/predict/fleet")
async def predict_full_fleet(background_tasks: BackgroundTasks):
    """
    Trigger predictions for all 1,944 batteries
    Runs asynchronously in background
    """
    background_tasks.add_task(process_full_fleet_predictions)
    
    return {
        "status": "started",
        "message": "Fleet-wide predictions queued",
        "estimated_completion": "5-10 minutes"
    }
```

#### 2. Feature Store Integration

**Efficient feature extraction for 1,944 batteries:**

```python
# services/mlops/src/features/feature_engineering.py

import pandas as pd
from sqlalchemy import create_engine

async def extract_features_batch(battery_ids: List[str]):
    """
    Extract features for multiple batteries efficiently
    Uses TimescaleDB time_bucket for aggregation
    """
    query = """
    SELECT 
        battery_system_id,
        time_bucket('1 hour', time) as bucket,
        AVG(voltage) as voltage_mean,
        STDDEV(voltage) as voltage_std,
        AVG(current) as current_mean,
        AVG(temperature) as temperature_mean,
        AVG(soc) as soc_mean,
        AVG(soh) as soh_mean
    FROM sensor_readings
    WHERE battery_system_id = ANY(%s)
        AND time > NOW() - INTERVAL '7 days'
    GROUP BY battery_system_id, bucket
    ORDER BY battery_system_id, bucket DESC
    """
    
    # Execute once for all batteries (efficient)
    df = pd.read_sql(query, engine, params=(battery_ids,))
    
    # Process features per battery
    features = {}
    for battery_id in battery_ids:
        battery_data = df[df['battery_system_id'] == battery_id]
        features[battery_id] = compute_features(battery_data)
    
    return features
```

#### 3. Model Training Configuration

**Handle production data volume:**

```python
# services/mlops/src/training/train.py

# Production training configuration
TRAINING_CONFIG = {
    "batch_size": 256,               # Larger batches for efficiency
    "sampling_strategy": "stratified",  # Balance across facilities
    "feature_window_days": 30,       # Use 30 days of history
    "validation_split": 0.2,
    "test_facilities": ["chiangmai"], # Hold out 1 facility for validation
    "max_samples_per_battery": 100,  # Limit to prevent memory issues
    "use_incremental_learning": True # Update model without full retrain
}

async def train_production_model():
    """
    Train RUL prediction model on production fleet
    """
    # Sample data across all 9 facilities
    training_data = await fetch_training_data(
        facilities=["nonthaburi", "bangrak", "phuket", ...],  # 8 for training
        batteries_per_facility=200,  # Sample 200/216 per facility
        time_range_days=90
    )
    
    # Train model
    model = train_gradient_boosting(training_data, TRAINING_CONFIG)
    
    # Validate on held-out facility
    validation_data = await fetch_training_data(
        facilities=["chiangmai"],
        batteries_per_facility=216,
        time_range_days=90
    )
    
    metrics = validate_model(model, validation_data)
    
    # Save model if metrics acceptable
    if metrics['auroc'] >= 0.85:
        save_model(model, version=f"fleet-v{datetime.now().strftime('%Y%m%d')}")
    
    return metrics
```

---

## 🔄 Backend Ingestion Service Updates

### Parallel Batch Processing

**File**: `services/backend/src/services/sensorIngestionService.ts`

**Update for production scale:**

```typescript
// Optimized for 1,944 batteries
const INGESTION_CONFIG = {
  BATCH_SIZE: 100,              // Batteries per batch
  PARALLEL_BATCHES: 5,          // Concurrent batches (500 batteries at once)
  INTERVAL_MS: 300000,          // 5 minutes between cycles
  RETRY_FAILED: true,           // Retry failed batteries
  MAX_RETRIES: 3
};

async function ingestDataParallel() {
  const batteries = await getBatterySystems();  // 1,944 batteries
  
  // Split into batches of 100
  const batches = chunk(batteries, INGESTION_CONFIG.BATCH_SIZE);
  
  // Process 5 batches in parallel (500 batteries at a time)
  for (let i = 0; i < batches.length; i += INGESTION_CONFIG.PARALLEL_BATCHES) {
    const batchGroup = batches.slice(i, i + INGESTION_CONFIG.PARALLEL_BATCHES);
    
    await Promise.allSettled(
      batchGroup.map(batch => fetchAndStoreBatch(batch))
    );
    
    // Progress logging
    const processed = Math.min((i + INGESTION_CONFIG.PARALLEL_BATCHES) * 
      INGESTION_CONFIG.BATCH_SIZE, batteries.length);
    logger.info('ingestion_progress', { 
      processed, 
      total: batteries.length,
      percent: Math.round((processed / batteries.length) * 100)
    });
  }
}

// Batch fetch from simulator
async function fetchAndStoreBatch(batteryIds: string[]) {
  try {
    // Use simulator batch API
    const response = await axios.post(`${SIMULATOR_URL}/api/sensors/readings/batch`, {
      battery_system_ids: batteryIds
    }, { timeout: 30000 });  // 30 second timeout
    
    // Bulk insert to database
    await bulkInsertReadings(response.data.data);
    
    return { success: true, count: response.data.count };
  } catch (error) {
    logger.error('batch_fetch_failed', { 
      batteryIds, 
      error: error.message 
    });
    return { success: false, count: 0 };
  }
}
```

---

## 📋 Quick Action Checklist

### Immediate Actions (For Correct Data Display)

#### 1. Backend - Already Done ✅
- [x] Database schema supports 1,944 batteries
- [x] Seed data creates 9 facilities × 216 batteries
- [x] API endpoints handle production scale
- [x] Ingestion service configured (needs parallel optimization above)

#### 2. Frontend - TODO
- [ ] Update Dashboard to fetch real facility data
- [ ] Add pagination to battery lists (50-100 per page)
- [ ] Implement facility-level aggregation views
- [ ] Add filters: by facility, by string type (Rectifier/UPS), by status
- [ ] Show "216 batteries" per facility in facility cards
- [ ] Display "9 data centers" in fleet summary

#### 3. Simulator - TODO
- [ ] Add LRU cache for battery states (maxsize=500)
- [ ] Implement batch size limit (200 batteries max)
- [ ] Add parallel processing for batch requests
- [ ] Configure production .env settings
- [ ] (Optional) Add Redis for distributed state

#### 4. MLOps - TODO
- [ ] Create batch prediction endpoint (500 batteries max)
- [ ] Add background job for full fleet predictions
- [ ] Optimize feature extraction queries
- [ ] Configure training for production data volume

---

## 🚀 Deployment Order

### Phase 1: Backend (Complete)
1. ✅ Run production seed: `npm run seed:production`
2. ✅ Verify database: `npm run verify:production-fleet`

### Phase 2: Simulator (Next)
1. Update `simulator.py` with LRU cache
2. Update `.env` with production settings
3. Test batch endpoint: `POST /api/sensors/readings/batch` with 100 battery IDs
4. Verify performance: <2 seconds for 100 batteries

### Phase 3: Backend Ingestion (Next)
1. Update `sensorIngestionService.ts` with parallel processing
2. Test with 500 batteries first
3. Gradually increase to full 1,944
4. Monitor: Should complete in 3-5 minutes

### Phase 4: Frontend (Next)
1. Update Dashboard component with real API calls
2. Add FacilityGrid component with pagination
3. Add BatteryList component with virtual scrolling
4. Test with production API

### Phase 5: MLOps (Final)
1. Create batch prediction endpoint
2. Test with 100 batteries
3. Implement full fleet background job
4. Schedule weekly retraining

---

## 📊 Expected Performance Metrics

| Component | Metric | Target | Current |
|-----------|--------|--------|---------|
| **Simulator** | Batch (100 batteries) | <2s | Unknown |
| **Backend Ingestion** | Full fleet cycle | 3-5min | Not tested |
| **Frontend** | Dashboard load | <2s | Unknown |
| **MLOps** | Batch predictions (500) | <30s | Not implemented |
| **Database** | Query response | <500ms | Good (TimescaleDB) |

---

## 🔍 Testing Strategy

### 1. Simulator Load Test
```bash
# Test batch endpoint
curl -X POST http://localhost:8001/api/sensors/readings/batch \
  -H "Content-Type: application/json" \
  -d '{"battery_system_ids": ["'$(psql -U postgres -d battery_management -t -c "SELECT array_agg(id) FROM (SELECT id FROM battery_systems LIMIT 100) sub" | tr -d ' ')'"]}'

# Expected: Response in <2 seconds with 100 readings
```

### 2. Backend Ingestion Test
```bash
# Check logs during ingestion
tail -f logs/backend.log | grep sensor_ingestion

# Expected logs:
# sensor_ingestion_progress: {processed: 500, total: 1944, percent: 26}
# sensor_ingestion_progress: {processed: 1000, total: 1944, percent: 51}
# sensor_ingestion_run_completed: {fetched: 1944, stored: 1944, durationMs: 180000}
```

### 3. Frontend Load Test
```bash
# Open browser with dev tools
# Navigate to dashboard
# Check Network tab:
- GET /api/v1/facilities (should return 9 facilities quickly)
- GET /api/v1/facilities/{id}/health (should return aggregated stats)
# NOT: GET /api/v1/battery-systems (all 1,944 - too slow)
```

---

## 📝 Summary

**What's Done:**
- ✅ Database configured for 1,944 batteries
- ✅ Backend API supports production scale
- ✅ Seed data creates realistic fleet

**What Needs Configuration:**
- ⚠️ Simulator: Add LRU cache + batch optimization
- ⚠️ Backend: Update ingestion to parallel processing
- ⚠️ Frontend: Rebuild dashboard for production scale
- ⚠️ MLOps: Implement batch prediction endpoint

**Priority Order:**
1. **Simulator optimization** (enables backend testing)
2. **Backend parallel ingestion** (enables data flow)
3. **Frontend rebuild** (enables user experience)
4. **MLOps batch API** (enables predictions)

Would you like me to implement any of these components first? I recommend starting with the **Simulator optimization** as it's the foundation for everything else.
