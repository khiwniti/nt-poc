# Backend Implementation Guide - Production Fleet API

**Objective**: Implement 4 backend API endpoints to support frontend with 1,944 batteries  
**Reference**: `BACKEND_API_REQUIREMENTS_FOR_FRONTEND.md`  
**Priority**: High - Frontend is waiting for these endpoints  

---

## 🎯 Quick Implementation Checklist

### Endpoint 1: Fleet Summary (Highest Priority)
```typescript
GET /api/v1/battery-systems/fleet/summary
```

**File**: `services/backend/src/routes/batterySystems.ts` (create new)  
**Service**: `services/backend/src/services/batterySystemService.ts` (create new)  

**Implementation**:
```typescript
// batterySystems.ts
import { Router } from 'express';
import { getFleetSummary } from '../services/batterySystemService';

const router = Router();

router.get('/fleet/summary', async (req, res) => {
  try {
    const summary = await getFleetSummary();
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get fleet summary' });
  }
});

export default router;
```

**SQL Query** (in service):
```typescript
// batterySystemService.ts
export async function getFleetSummary() {
  const result = await knex.raw(`
    WITH battery_metrics AS (
      SELECT 
        bs.id,
        bs.facility_id,
        bs.string_id,
        bs.status,
        sr.voltage,
        sr.current,
        sr.temperature,
        sr.soc,
        sr.soh,
        sr.timestamp as last_reading_time,
        rp.predicted_rul,
        rp.confidence as rul_confidence
      FROM battery_systems bs
      LEFT JOIN LATERAL (
        SELECT voltage, current, temperature, soc, soh, timestamp
        FROM sensor_readings
        WHERE battery_system_id = bs.id
        ORDER BY timestamp DESC
        LIMIT 1
      ) sr ON true
      LEFT JOIN LATERAL (
        SELECT predicted_rul, confidence
        FROM rul_predictions
        WHERE battery_system_id = bs.id
        ORDER BY predicted_at DESC
        LIMIT 1
      ) rp ON true
    ),
    facility_stats AS (
      SELECT
        f.id,
        f.name,
        f.location_th,
        f.latitude,
        f.longitude,
        COUNT(bm.id) as total_batteries,
        COUNT(CASE WHEN bm.status = 'operational' THEN 1 END) as operational_count,
        COUNT(CASE WHEN bm.status = 'maintenance' THEN 1 END) as maintenance_count,
        COUNT(CASE WHEN bm.status = 'critical' THEN 1 END) as critical_count,
        AVG(bm.soc) as avg_soc,
        AVG(bm.soh) as avg_soh,
        AVG(bm.temperature) as avg_temperature,
        AVG(bm.predicted_rul) as avg_rul
      FROM facilities f
      LEFT JOIN battery_systems bs ON bs.facility_id = f.id
      LEFT JOIN battery_metrics bm ON bm.id = bs.id
      GROUP BY f.id, f.name, f.location_th, f.latitude, f.longitude
    )
    SELECT
      (SELECT COUNT(*) FROM battery_systems) as total_batteries,
      (SELECT COUNT(DISTINCT facility_id) FROM battery_systems) as total_facilities,
      (SELECT COUNT(DISTINCT string_id) FROM battery_systems) as total_strings,
      (SELECT SUM(capacity_kwh) FROM battery_systems) as total_capacity_kwh,
      (SELECT COUNT(*) FROM battery_systems WHERE status = 'operational') as operational_count,
      (SELECT json_agg(row_to_json(fs.*)) FROM facility_stats fs) as facilities
  `);

  return result.rows[0];
}
```

**Test**:
```bash
curl http://localhost:3000/api/v1/battery-systems/fleet/summary
```

---

### Endpoint 2: Paginated Battery List
```typescript
GET /api/v1/battery-systems?page=1&pageSize=50&facilityId=optional&status=optional
```

**Implementation**:
```typescript
router.get('/', async (req, res) => {
  const { page = 1, pageSize = 50, facilityId, status } = req.query;
  
  try {
    const result = await getBatteriesWithMetrics({
      page: Number(page),
      pageSize: Number(pageSize),
      facilityId: facilityId as string,
      status: status as string,
    });
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get batteries' });
  }
});
```

**SQL Query**:
```typescript
export async function getBatteriesWithMetrics(params: {
  page: number;
  pageSize: number;
  facilityId?: string;
  status?: string;
}) {
  const { page, pageSize, facilityId, status } = params;
  const offset = (page - 1) * pageSize;

  let query = knex('battery_systems as bs')
    .select(
      'bs.*',
      'f.name as facility_name',
      'f.location_th as facility_location',
      'sr.voltage',
      'sr.current',
      'sr.temperature',
      'sr.soc',
      'sr.soh',
      'sr.power',
      'sr.timestamp as last_reading_time',
      'rp.predicted_rul as rul_days',
      'rp.confidence as rul_confidence'
    )
    .leftJoin('facilities as f', 'bs.facility_id', 'f.id')
    .leftJoin(
      knex.raw(`LATERAL (
        SELECT voltage, current, temperature, soc, soh, power, timestamp
        FROM sensor_readings
        WHERE battery_system_id = bs.id
        ORDER BY timestamp DESC
        LIMIT 1
      ) as sr ON true`)
    )
    .leftJoin(
      knex.raw(`LATERAL (
        SELECT predicted_rul, confidence
        FROM rul_predictions
        WHERE battery_system_id = bs.id
        ORDER BY predicted_at DESC
        LIMIT 1
      ) as rp ON true`)
    );

  if (facilityId) {
    query = query.where('bs.facility_id', facilityId);
  }

  if (status) {
    query = query.where('bs.status', status);
  }

  const [data, countResult] = await Promise.all([
    query.limit(pageSize).offset(offset).orderBy('bs.id'),
    knex('battery_systems').count('* as count').where((builder) => {
      if (facilityId) builder.where('facility_id', facilityId);
      if (status) builder.where('status', status);
    }),
  ]);

  const totalCount = Number(countResult[0].count);
  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    data,
    pagination: {
      currentPage: page,
      pageSize,
      totalPages,
      totalCount,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
}
```

---

### Endpoint 3: Facility Stats
```typescript
GET /api/v1/battery-systems/facility/:facilityId/stats
```

**Implementation**:
```typescript
router.get('/facility/:facilityId/stats', async (req, res) => {
  const { facilityId } = req.params;
  
  try {
    const stats = await getFacilityStats(facilityId);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get facility stats' });
  }
});
```

**SQL Query**:
```typescript
export async function getFacilityStats(facilityId: string) {
  const result = await knex.raw(`
    WITH facility_metrics AS (
      SELECT
        bs.id,
        bs.status,
        sr.soc,
        sr.soh,
        sr.temperature,
        sr.voltage,
        rp.predicted_rul
      FROM battery_systems bs
      LEFT JOIN LATERAL (
        SELECT soc, soh, temperature, voltage
        FROM sensor_readings
        WHERE battery_system_id = bs.id
        ORDER BY timestamp DESC
        LIMIT 1
      ) sr ON true
      LEFT JOIN LATERAL (
        SELECT predicted_rul
        FROM rul_predictions
        WHERE battery_system_id = bs.id
        ORDER BY predicted_at DESC
        LIMIT 1
      ) rp ON true
      WHERE bs.facility_id = ?
    )
    SELECT
      COUNT(*) as total_batteries,
      COUNT(CASE WHEN status = 'operational' THEN 1 END) as operational,
      COUNT(CASE WHEN status = 'maintenance' THEN 1 END) as maintenance,
      COUNT(CASE WHEN status = 'critical' THEN 1 END) as critical,
      AVG(soc) as avg_soc,
      AVG(soh) as avg_soh,
      AVG(temperature) as avg_temperature,
      AVG(voltage) as avg_voltage,
      AVG(predicted_rul) as avg_rul,
      MIN(predicted_rul) as min_rul,
      MAX(predicted_rul) as max_rul
    FROM facility_metrics
  `, [facilityId]);

  return result.rows[0];
}
```

---

### Endpoint 4: Battery Search
```typescript
GET /api/v1/battery-systems/search?q=search-term&limit=20
```

**Implementation**:
```typescript
router.get('/search', async (req, res) => {
  const { q, limit = 20 } = req.query;
  
  if (!q) {
    return res.status(400).json({ error: 'Query parameter q is required' });
  }
  
  try {
    const results = await searchBatteries(q as string, Number(limit));
    res.json({ data: results });
  } catch (error) {
    res.status(500).json({ error: 'Failed to search batteries' });
  }
});
```

**SQL Query**:
```typescript
export async function searchBatteries(searchTerm: string, limit: number) {
  return knex('battery_systems as bs')
    .select(
      'bs.id',
      'bs.battery_id',
      'bs.facility_id',
      'bs.string_id',
      'bs.status',
      'f.name as facility_name',
      'f.location_th as facility_location'
    )
    .leftJoin('facilities as f', 'bs.facility_id', 'f.id')
    .where((builder) => {
      builder
        .where('bs.id', 'ilike', `%${searchTerm}%`)
        .orWhere('bs.battery_id', 'ilike', `%${searchTerm}%`)
        .orWhere('f.name', 'ilike', `%${searchTerm}%`)
        .orWhere('f.location_th', 'ilike', `%${searchTerm}%`);
    })
    .limit(limit)
    .orderBy('bs.id');
}
```

---

## 🚀 Implementation Steps

### Step 1: Create Route File
```bash
cd services/backend/src/routes
touch batterySystems.ts
```

### Step 2: Create Service File
```bash
cd services/backend/src/services
touch batterySystemService.ts
```

### Step 3: Register Routes
```typescript
// src/app.ts
import batterySystemRoutes from './routes/batterySystems';

// Add after other routes
app.use('/api/v1/battery-systems', batterySystemRoutes);
```

### Step 4: Add Database Indexes
```bash
# Create migration
npm run migrate:make add_battery_systems_indexes
```

```typescript
// migrations/XXXXX_add_battery_systems_indexes.ts
export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    -- Index for facility lookups
    CREATE INDEX IF NOT EXISTS idx_battery_systems_facility_id 
    ON battery_systems(facility_id);
    
    -- Index for status filtering
    CREATE INDEX IF NOT EXISTS idx_battery_systems_status 
    ON battery_systems(status);
    
    -- Index for string lookups
    CREATE INDEX IF NOT EXISTS idx_battery_systems_string_id 
    ON battery_systems(string_id);
    
    -- Composite index for common queries
    CREATE INDEX IF NOT EXISTS idx_battery_systems_facility_status 
    ON battery_systems(facility_id, status);
    
    -- Index for sensor readings lookups (already exists from hypertable)
    -- Index for predictions lookups
    CREATE INDEX IF NOT EXISTS idx_rul_predictions_battery_system_id_time 
    ON rul_predictions(battery_system_id, predicted_at DESC);
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    DROP INDEX IF EXISTS idx_battery_systems_facility_id;
    DROP INDEX IF EXISTS idx_battery_systems_status;
    DROP INDEX IF EXISTS idx_battery_systems_string_id;
    DROP INDEX IF EXISTS idx_battery_systems_facility_status;
    DROP INDEX IF EXISTS idx_rul_predictions_battery_system_id_time;
  `);
}
```

### Step 5: Run Migration
```bash
npm run migrate
```

### Step 6: Test Endpoints
```bash
# Test fleet summary
curl http://localhost:3000/api/v1/battery-systems/fleet/summary | jq

# Test paginated list
curl 'http://localhost:3000/api/v1/battery-systems?page=1&pageSize=50' | jq

# Test facility stats
curl http://localhost:3000/api/v1/battery-systems/facility/FAC-CM/stats | jq

# Test search
curl 'http://localhost:3000/api/v1/battery-systems/search?q=CM&limit=20' | jq
```

---

## ✅ Verification Checklist

- [ ] All 4 endpoints return 200 status
- [ ] Fleet summary shows 1,944 batteries
- [ ] Fleet summary shows 9 facilities
- [ ] Pagination works (page 1, 2, 3...)
- [ ] Facility filter works correctly
- [ ] Status filter works correctly
- [ ] Search returns relevant results
- [ ] Response times <200ms for all endpoints
- [ ] Database indexes created successfully
- [ ] Frontend can successfully call all endpoints
- [ ] Error handling works (try invalid facility ID)

---

## 🧪 Unit Tests

```typescript
// src/services/__tests__/batterySystemService.test.ts
import { getFleetSummary, getBatteriesWithMetrics } from '../batterySystemService';

describe('BatterySystemService', () => {
  describe('getFleetSummary', () => {
    it('should return fleet summary with correct counts', async () => {
      const summary = await getFleetSummary();
      
      expect(summary.total_batteries).toBe(1944);
      expect(summary.total_facilities).toBe(9);
      expect(summary.total_strings).toBe(81);
      expect(summary.facilities).toHaveLength(9);
    });
  });

  describe('getBatteriesWithMetrics', () => {
    it('should return paginated batteries', async () => {
      const result = await getBatteriesWithMetrics({
        page: 1,
        pageSize: 50,
      });
      
      expect(result.data).toHaveLength(50);
      expect(result.pagination.totalCount).toBe(1944);
      expect(result.pagination.totalPages).toBe(39);
    });

    it('should filter by facility', async () => {
      const result = await getBatteriesWithMetrics({
        page: 1,
        pageSize: 50,
        facilityId: 'FAC-CM',
      });
      
      expect(result.data).toHaveLength(50);
      expect(result.data.every(b => b.facility_id === 'FAC-CM')).toBe(true);
    });
  });
});
```

---

## 📊 Performance Optimization

### Query Optimization Tips

1. **Use LATERAL joins** for correlated subqueries (already in examples above)
2. **Limit data fetched** - only select needed columns
3. **Use database indexes** - create indexes on commonly filtered columns
4. **Cache facility stats** - Redis cache with 5-minute TTL
5. **Batch queries** - use Promise.all for parallel queries

### Redis Caching Example

```typescript
import { createClient } from 'redis';

const redis = createClient({ url: process.env.REDIS_URL });

export async function getFleetSummaryCached() {
  const cacheKey = 'fleet:summary';
  
  // Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // Fetch from database
  const summary = await getFleetSummary();
  
  // Cache for 5 minutes
  await redis.setEx(cacheKey, 300, JSON.stringify(summary));
  
  return summary;
}
```

---

## 🐛 Common Issues & Solutions

### Issue: Query too slow (>500ms)

**Solution**:
1. Check EXPLAIN ANALYZE output
2. Verify indexes are being used
3. Consider materialized views for complex aggregations
4. Add Redis caching

### Issue: LATERAL join not working

**Solution**:
Use `knex.raw()` for LATERAL joins:
```typescript
.leftJoin(
  knex.raw(`LATERAL (...) as sr ON true`)
)
```

### Issue: Pagination count query slow

**Solution**:
Cache total count and refresh every 5 minutes:
```typescript
const cachedCount = await redis.get('battery:total_count');
if (!cachedCount) {
  const count = await knex('battery_systems').count();
  await redis.setEx('battery:total_count', 300, count);
}
```

---

## 🎓 Next Steps After Implementation

1. **Integration Testing**: Test all endpoints with frontend
2. **Load Testing**: Use hey or k6 to test performance
3. **Monitoring**: Add metrics for each endpoint
4. **Documentation**: Update API documentation
5. **Security**: Add rate limiting and authentication

---

**Status**: Ready for Implementation  
**Estimated Time**: 4-6 hours  
**Priority**: High - Frontend waiting  
**Owner**: Backend Team
