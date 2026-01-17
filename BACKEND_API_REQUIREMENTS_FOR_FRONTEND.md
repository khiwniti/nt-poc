# Backend API Requirements for Frontend Production Fleet Support

This document outlines the backend API endpoints that need to be implemented or updated to support the frontend for the production fleet of 1,944 batteries across 9 data centers.

## Executive Summary

The frontend has been updated to handle production-scale data with:
- **Real-time fleet statistics** from backend API
- **Paginated battery lists** (50 batteries per page)
- **Facility-level aggregation** showing statistics for each of 9 data centers
- **Search and filtering** capabilities

## Required Backend Endpoints

### 1. Fleet Summary Endpoint (NEW - REQUIRED)

**Endpoint**: `GET /api/v1/battery-systems/fleet/summary`

**Purpose**: Provide fleet-wide statistics for the global overview dashboard

**Response Schema**:
```typescript
{
  "success": true,
  "data": {
    "totalBatteries": 1944,
    "totalFacilities": 9,
    "totalStrings": 81,
    "totalCapacityKwh": 2799.36,
    "operationalCount": 1850,
    "maintenanceCount": 80,
    "faultCount": 14,
    "criticalBatteries": 5,
    "averageSoC": 85.2,
    "averageSoH": 92.5,
    "facilities": [
      {
        "facilityId": "f1000000-...",
        "facilityName": "Chiangmai DC",
        "totalBatteries": 216,
        "operationalCount": 205,
        "maintenanceCount": 9,
        "faultCount": 2,
        "criticalBatteries": 1,
        "averageSoC": 86.1,
        "averageSoH": 93.2,
        "averageTemperature": 26.5,
        "totalCapacityKwh": 311.04
      },
      // ... 8 more facilities
    ]
  }
}
```

**Implementation Notes**:
- This endpoint should aggregate data from `battery_systems`, `sensor_readings`, and `rul_predictions` tables
- Use TimescaleDB's `time_bucket()` for efficient latest sensor reading retrieval
- Cache results for 60 seconds to reduce database load
- Expected response time: < 500ms

**SQL Query Pattern**:
```sql
-- Get fleet-wide counts
SELECT 
  COUNT(*) as total_batteries,
  COUNT(DISTINCT facility_id) as total_facilities,
  COUNT(DISTINCT zone_id) as total_strings,
  SUM(capacity_kwh) as total_capacity_kwh,
  COUNT(*) FILTER (WHERE status = 'operational') as operational_count,
  COUNT(*) FILTER (WHERE status = 'maintenance') as maintenance_count,
  COUNT(*) FILTER (WHERE status = 'fault') as fault_count
FROM battery_systems bs
JOIN zones z ON z.id = bs.zone_id;

-- Get latest sensor data aggregated by facility
WITH latest_readings AS (
  SELECT DISTINCT ON (battery_system_id)
    battery_system_id,
    soc,
    soh,
    temperature
  FROM sensor_readings
  ORDER BY battery_system_id, time DESC
)
SELECT 
  f.id as facility_id,
  f.name as facility_name,
  COUNT(bs.id) as total_batteries,
  AVG(lr.soc) as average_soc,
  AVG(lr.soh) as average_soh,
  AVG(lr.temperature) as average_temperature
FROM facilities f
JOIN zones z ON z.facility_id = f.id
JOIN battery_systems bs ON bs.zone_id = z.id
LEFT JOIN latest_readings lr ON lr.battery_system_id = bs.id
GROUP BY f.id, f.name;
```

---

### 2. Paginated Battery List Endpoint (UPDATE REQUIRED)

**Endpoint**: `GET /api/v1/battery-systems`

**Purpose**: Provide paginated list of batteries with latest metrics

**Query Parameters**:
- `page` (integer, default: 1): Page number
- `pageSize` (integer, default: 50, max: 100): Items per page
- `facilityId` (uuid, optional): Filter by facility
- `zoneId` (uuid, optional): Filter by zone/string
- `status` (string, optional): Filter by status (`operational`, `maintenance`, `fault`)
- `sortBy` (string, default: `serial_number`): Sort field
- `sortOrder` (string, default: `asc`): Sort direction (`asc`, `desc`)

**Response Schema**:
```typescript
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "serial_number": "CM-R-S1-J1",
      "model": "HX12-120",
      "manufacturer": "CSB Battery",
      "capacity_kwh": 1.44,
      "status": "operational",
      "zone_id": "uuid",
      "zone_name": "Rectifier String 1",
      "facility_id": "uuid",
      "facility_name": "Chiangmai DC",
      "installation_date": "2024-01-15",
      "last_maintenance_date": "2025-01-10",
      
      // 3D layout fields
      "position_x": 0.5,
      "position_y": 1.0,
      "position_z": 0.0,
      "display_color": "#3B82F6",
      
      // Latest sensor readings
      "voltage": 13.65,
      "current": 5.2,
      "temperature": 26.3,
      "soc": 87.5,
      "soh": 94.2,
      "power": 71.0,
      "last_reading_time": "2025-01-17T14:30:00Z",
      
      // RUL prediction
      "rul_days": 850,
      "rul_confidence": 0.89,
      "rul_prediction_time": "2025-01-17T12:00:00Z"
    }
  ],
  "total": 1944,
  "page": 1,
  "pageSize": 50,
  "totalPages": 39
}
```

**Implementation Notes**:
- Use JOIN with `LATERAL` subquery for efficient latest sensor reading retrieval
- Implement cursor-based pagination for better performance at high page numbers
- Expected response time: < 200ms per page

**SQL Query Pattern**:
```sql
SELECT 
  bs.*,
  z.name as zone_name,
  f.id as facility_id,
  f.name as facility_name,
  sr.voltage,
  sr.current,
  sr.temperature,
  sr.soc,
  sr.soh,
  sr.power,
  sr.time as last_reading_time,
  rul.rul_days,
  rul.confidence as rul_confidence,
  rul.prediction_time as rul_prediction_time
FROM battery_systems bs
JOIN zones z ON z.id = bs.zone_id
JOIN facilities f ON f.id = z.facility_id
LEFT JOIN LATERAL (
  SELECT * FROM sensor_readings
  WHERE battery_system_id = bs.id
  ORDER BY time DESC
  LIMIT 1
) sr ON true
LEFT JOIN LATERAL (
  SELECT * FROM rul_predictions
  WHERE battery_system_id = bs.id
  ORDER BY prediction_time DESC
  LIMIT 1
) rul ON true
WHERE ($facilityId IS NULL OR f.id = $facilityId)
  AND ($zoneId IS NULL OR z.id = $zoneId)
  AND ($status IS NULL OR bs.status = $status)
ORDER BY bs.serial_number ASC
LIMIT $pageSize OFFSET (($page - 1) * $pageSize);
```

---

### 3. Facility Statistics Endpoint (NEW - REQUIRED)

**Endpoint**: `GET /api/v1/battery-systems/facility/:facilityId/stats`

**Purpose**: Get detailed statistics for a single facility

**Response Schema**:
```typescript
{
  "success": true,
  "data": {
    "facilityId": "f1000000-...",
    "facilityName": "Chiangmai DC",
    "totalBatteries": 216,
    "operationalCount": 205,
    "maintenanceCount": 9,
    "faultCount": 2,
    "criticalBatteries": 1,
    "averageSoC": 86.1,
    "averageSoH": 93.2,
    "averageTemperature": 26.5,
    "totalCapacityKwh": 311.04,
    "strings": [
      {
        "zoneId": "uuid",
        "zoneName": "Rectifier String 1",
        "systemType": "Rectifier",
        "batteryCount": 24,
        "averageSoC": 87.2,
        "averageSoH": 93.5,
        "status": "operational"
      }
      // ... 8 more strings
    ]
  }
}
```

---

### 4. Battery Search Endpoint (NEW - REQUIRED)

**Endpoint**: `GET /api/v1/battery-systems/search`

**Purpose**: Search batteries by serial number or model

**Query Parameters**:
- `q` (string, required): Search query
- `limit` (integer, default: 20, max: 100): Maximum results

**Response Schema**:
```typescript
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "serial_number": "CM-R-S1-J5",
      "model": "HX12-120",
      "facility_name": "Chiangmai DC",
      "zone_name": "Rectifier String 1",
      "status": "operational"
    }
  ],
  "total": 5
}
```

**Implementation Notes**:
- Use PostgreSQL full-text search or trigram similarity for fuzzy matching
- Index `serial_number` and `model` fields for performance

**SQL Query Pattern**:
```sql
SELECT 
  bs.id,
  bs.serial_number,
  bs.model,
  bs.status,
  z.name as zone_name,
  f.name as facility_name
FROM battery_systems bs
JOIN zones z ON z.id = bs.zone_id
JOIN facilities f ON f.id = z.facility_id
WHERE 
  bs.serial_number ILIKE '%' || $query || '%'
  OR bs.model ILIKE '%' || $query || '%'
LIMIT $limit;
```

---

### 5. Single Battery Detail Endpoint (UPDATE REQUIRED)

**Endpoint**: `GET /api/v1/battery-systems/:id`

**Purpose**: Get detailed information for a single battery

**Response Schema**: Same as individual battery object in paginated list

---

## Performance Requirements

| Endpoint | Target Response Time | Caching Strategy | Load Test Target |
|----------|---------------------|------------------|------------------|
| Fleet Summary | < 500ms | 60s TTL | 100 req/s |
| Paginated List | < 200ms | No cache (real-time data) | 50 req/s |
| Facility Stats | < 300ms | 120s TTL | 20 req/s |
| Search | < 150ms | 300s TTL | 10 req/s |
| Battery Detail | < 100ms | No cache | 20 req/s |

---

## Database Optimization Recommendations

### 1. Indexes Required

```sql
-- Battery systems
CREATE INDEX CONCURRENTLY idx_battery_systems_facility 
ON battery_systems(zone_id) INCLUDE (status, capacity_kwh);

CREATE INDEX CONCURRENTLY idx_battery_systems_status 
ON battery_systems(status);

CREATE INDEX CONCURRENTLY idx_battery_systems_serial_search 
ON battery_systems USING gin(serial_number gin_trgm_ops);

-- Sensor readings (hypertable - already has time index)
CREATE INDEX CONCURRENTLY idx_sensor_readings_battery_time 
ON sensor_readings(battery_system_id, time DESC);

-- RUL predictions
CREATE INDEX CONCURRENTLY idx_rul_predictions_battery_time 
ON rul_predictions(battery_system_id, prediction_time DESC);

-- Zones
CREATE INDEX CONCURRENTLY idx_zones_facility 
ON zones(facility_id);
```

### 2. Materialized Views (Optional for High Traffic)

```sql
-- Fleet summary materialized view (refresh every 1 minute)
CREATE MATERIALIZED VIEW fleet_summary_mv AS
SELECT 
  COUNT(*) as total_batteries,
  COUNT(DISTINCT f.id) as total_facilities,
  COUNT(DISTINCT z.id) as total_strings,
  SUM(bs.capacity_kwh) as total_capacity_kwh,
  COUNT(*) FILTER (WHERE bs.status = 'operational') as operational_count,
  COUNT(*) FILTER (WHERE bs.status = 'maintenance') as maintenance_count,
  COUNT(*) FILTER (WHERE bs.status = 'fault') as fault_count,
  AVG(sr.soc) as average_soc,
  AVG(sr.soh) as average_soh
FROM battery_systems bs
JOIN zones z ON z.id = bs.zone_id
JOIN facilities f ON f.id = z.facility_id
LEFT JOIN LATERAL (
  SELECT * FROM sensor_readings
  WHERE battery_system_id = bs.id
  ORDER BY time DESC
  LIMIT 1
) sr ON true;

-- Refresh in background job every 60 seconds
CREATE INDEX ON fleet_summary_mv(total_batteries);
```

---

## Testing Checklist

### Unit Tests
- [ ] Fleet summary endpoint returns correct aggregations
- [ ] Pagination works correctly for all 1,944 batteries
- [ ] Filtering by facility, zone, and status works
- [ ] Search returns relevant results
- [ ] Latest sensor readings are correctly joined

### Integration Tests
- [ ] Load test fleet summary with 100 concurrent requests
- [ ] Load test paginated list with page navigation
- [ ] Verify response times meet targets
- [ ] Test with empty results (new facility)

### Performance Tests
- [ ] Measure query execution time for fleet summary (target: < 200ms)
- [ ] Measure query execution time for paginated list (target: < 100ms)
- [ ] Profile memory usage for large result sets
- [ ] Test database connection pool under load

---

## Implementation Priority

1. **Phase 1: Core Endpoints** (REQUIRED FOR FRONTEND)
   - Fleet Summary endpoint
   - Updated Paginated Battery List endpoint
   - These enable the GlobalOverview and BatteryList components

2. **Phase 2: Enhanced Features**
   - Facility Statistics endpoint
   - Search endpoint
   - These enable the FacilityStatsGrid and search functionality

3. **Phase 3: Optimization**
   - Implement caching layer (Redis)
   - Add materialized views
   - Optimize queries based on production metrics

---

## Frontend Integration Status

### ✅ Completed Frontend Components
1. **GlobalOverview.tsx** - Updated to fetch real fleet statistics
2. **BatteryList.tsx** - New paginated battery list component
3. **FacilityStatsGrid.tsx** - New facility aggregation dashboard
4. **batterySystems.ts** - Complete API client with TypeScript types

### ⏳ Pending Backend Implementation
1. Fleet Summary endpoint
2. Paginated Battery List updates (add latest sensor readings)
3. Facility Statistics endpoint
4. Search endpoint

### 🔄 Integration Steps
1. Backend team implements endpoints per this spec
2. Update `VITE_API_URL` in frontend `.env` to point to backend
3. Frontend team tests integration with production seed data
4. Load testing and performance optimization

---

## Contact

- **Backend Team**: Implement endpoints in `services/backend/src/routes/batterySystem.ts`
- **Database Team**: Create indexes and optimize queries
- **DevOps Team**: Setup caching layer and monitoring

## Related Documents
- `PRODUCTION_FLEET_CONFIG.md` - Production deployment guide
- `FRONTEND_SIMULATOR_MLOPS_CONFIG.md` - Complete configuration guide
- `002_production_fleet.ts` - Production seed data
