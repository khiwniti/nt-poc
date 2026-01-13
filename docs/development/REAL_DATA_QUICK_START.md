# Real Sensor Data Integration - Quick Start

## ✅ What's Already Done

1. **Backend Ingestion Service** - Automatically fetches data from simulator every 10 seconds
2. **TimescaleDB Hypertable** - Optimized time-series storage
3. **API Endpoints** - REST endpoints for fetching sensor data
4. **Frontend Hooks** - React hooks for real-time data with auto-polling
5. **Example Component** - `RealTimeBatteryCard.tsx` shows how to use

## 🚀 Quick Integration Guide

### Step 1: Start Required Services

```bash
# Terminal 1: Start Simulator
cd services/simulator
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001

# Terminal 2: Start Backend (with auto-ingestion)
cd services/backend
npm run dev
# You should see: "sensor_ingestion_run_completed { fetched: X, stored: X }"

# Terminal 3: Start Frontend
cd services/frontend
npm run dev
```

### Step 2: Verify Data is Flowing

**Check simulator:**
```bash
curl http://localhost:8001/api/health
curl http://localhost:8001/api/sensors/reading/test-battery-001
```

**Check database (using psql or pgAdmin):**
```sql
-- See latest readings
SELECT 
  battery_system_id,
  time,
  soc,
  temperature,
  voltage
FROM sensor_readings
ORDER BY time DESC
LIMIT 10;

-- Check data count
SELECT COUNT(*) FROM sensor_readings;
```

**Check backend API:**
```bash
# Get latest reading (replace UUID and token)
curl "http://localhost:3000/api/v1/sensor-readings/latest?batterySystemId=YOUR_UUID" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Step 3: Use in Your Component

#### Option A: Single Battery (with hook)

```typescript
import { useSensorData } from '../hooks/useSensorData';
import { useAuthStore } from '../store';

function MyBatteryComponent({ batteryId }: { batteryId: string }) {
  const token = useAuthStore(state => state.token) || '';
  const { data, loading, error } = useSensorData(batteryId, token);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!data) return <div>No data available</div>;

  return (
    <div>
      <h3>Battery {batteryId}</h3>
      <p>SoC: {data.soc}%</p>
      <p>Temperature: {data.temperature}°C</p>
      <p>Voltage: {data.voltage}V</p>
      <p>Current: {data.current}A</p>
      <p>Power: {data.power}W</p>
      <p>SoH: {data.soh}%</p>
      <p>Last Update: {new Date(data.time).toLocaleString()}</p>
    </div>
  );
}
```

#### Option B: Multiple Batteries

```typescript
import { useMultipleSensorData } from '../hooks/useSensorData';

function MyDashboard() {
  const token = useAuthStore(state => state.token) || '';
  const batteryIds = ['uuid1', 'uuid2', 'uuid3'];
  const { data, loading } = useMultipleSensorData(batteryIds, token);

  return (
    <div className="grid grid-cols-3 gap-4">
      {batteryIds.map(id => {
        const sensorData = data.get(id);
        return (
          <div key={id}>
            {sensorData ? (
              <div>
                <h4>{id}</h4>
                <p>SoC: {sensorData.soc}%</p>
                <p>Temp: {sensorData.temperature}°C</p>
              </div>
            ) : (
              <p>No data for {id}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

#### Option C: Use the Example Component

```typescript
import RealTimeBatteryCard from '../components/Dashboard/RealTimeBatteryCard';

function MyPage() {
  return (
    <div className="grid grid-cols-3 gap-4">
      <RealTimeBatteryCard 
        batterySystemId="uuid-1"
        name="แบตเตอรี่ A"
        location="กรุงเทพฯ"
      />
      <RealTimeBatteryCard 
        batterySystemId="uuid-2"
        name="แบตเตอรี่ B"
        location="เชียงใหม่"
      />
    </div>
  );
}
```

## 📝 Component Migration Checklist

### Before (Mock Data)
```typescript
import { BRANCHES } from '../constants';

function Component() {
  const branch = BRANCHES[0];
  const voltage = 12.6; // ❌ Hardcoded
  const temp = 25; // ❌ Mock data
}
```

### After (Real Data)
```typescript
import { useSensorData } from '../hooks/useSensorData';

function Component({ batteryId }: { batteryId: string }) {
  const token = useAuthStore(state => state.token) || '';
  const { data } = useSensorData(batteryId, token);
  
  const voltage = data?.voltage ?? 0; // ✅ Real-time data
  const temp = data?.temperature ?? 0; // ✅ From TimescaleDB
}
```

## 🎯 Common Patterns

### Pattern 1: Display Latest Value

```typescript
function BatteryStatus({ batteryId }: { batteryId: string }) {
  const token = useAuthStore(state => state.token) || '';
  const { data } = useSensorData(batteryId, token);
  
  return (
    <div className="flex items-center gap-2">
      <Battery />
      <span>{data?.soc ?? 0}%</span>
    </div>
  );
}
```

### Pattern 2: Status Badge with Color

```typescript
function StatusBadge({ batteryId }: { batteryId: string }) {
  const { data } = useSensorData(batteryId, useAuthStore(s => s.token) || '');
  
  const getColor = () => {
    if (!data) return 'gray';
    if (data.soc < 20) return 'red';
    if (data.soc < 40) return 'amber';
    return 'green';
  };
  
  return (
    <span className={`px-2 py-1 rounded bg-${getColor()}-100 text-${getColor()}-700`}>
      {data?.soc ?? 0}%
    </span>
  );
}
```

### Pattern 3: Conditional Rendering

```typescript
function BatteryAlert({ batteryId }: { batteryId: string }) {
  const { data } = useSensorData(batteryId, useAuthStore(s => s.token) || '');
  
  if (!data) return null;
  
  return (
    <>
      {data.temperature > 40 && (
        <div className="alert alert-warning">
          🔥 Temperature too high: {data.temperature}°C
        </div>
      )}
      {data.soc < 20 && (
        <div className="alert alert-danger">
          ⚠️ Low battery: {data.soc}%
        </div>
      )}
    </>
  );
}
```

### Pattern 4: Loading & Error States

```typescript
function BatteryCard({ batteryId }: { batteryId: string }) {
  const token = useAuthStore(s => s.token) || '';
  const { data, loading, error, refetch } = useSensorData(batteryId, token);
  
  if (loading && !data) {
    return <Skeleton />;
  }
  
  if (error) {
    return (
      <div>
        <p>Error: {error.message}</p>
        <button onClick={refetch}>Retry</button>
      </div>
    );
  }
  
  if (!data) {
    return <div>No data available</div>;
  }
  
  return <div>{/* Render data */}</div>;
}
```

## 🔧 Configuration

### Backend Environment Variables

```bash
# .env in services/backend
DATABASE_URL=postgresql://user:pass@localhost:5432/bms
SIMULATOR_URL=http://localhost:8001
SENSOR_INGESTION_ENABLED=true
SENSOR_INGESTION_INTERVAL=10000  # 10 seconds
```

### Frontend Environment Variables

```bash
# .env in services/frontend
VITE_API_URL=http://localhost:3000
```

## 📊 Data Flow

```
1. Simulator generates data (port 8001)
   ↓
2. Backend ingestion service polls every 10s
   ↓
3. Data stored in TimescaleDB (sensor_readings table)
   ↓
4. Frontend calls /api/v1/sensor-readings/latest
   ↓
5. useSensorData hook auto-polls every 10s
   ↓
6. Component re-renders with new data
```

## 🐛 Troubleshooting

### Problem: No data in component

**Check:**
1. Is simulator running? `curl http://localhost:8001/api/health`
2. Is backend running? `curl http://localhost:3000/api/v1/health`
3. Is ingestion working? Check backend logs for `sensor_ingestion_run_completed`
4. Is data in database? `SELECT COUNT(*) FROM sensor_readings;`
5. Is API working? `curl http://localhost:3000/api/v1/sensor-readings/latest?batterySystemId=UUID -H "Authorization: Bearer TOKEN"`
6. Do you have auth token? `const token = useAuthStore(state => state.token);`

### Problem: Data not updating

**Solutions:**
- Hook auto-polls every 10 seconds by default
- Force refresh: `const { refetch } = useSensorData(...); refetch();`
- Check browser console for errors
- Verify token hasn't expired

### Problem: "No data available"

**Causes:**
- Battery system ID doesn't exist in database
- No sensor readings for that battery yet
- Ingestion service hasn't run yet (wait 10 seconds)
- Wrong battery ID passed to hook

**Solution:**
```bash
# Check which batteries have data
SELECT DISTINCT battery_system_id FROM sensor_readings;

# Use one of those IDs in your component
```

## 📦 File Structure

```
services/
├── simulator/          # Generates sensor data
│   └── app/
│       └── main.py     # Simulator API
│
├── backend/
│   └── src/
│       ├── services/
│       │   └── sensorIngestionService.ts  # ✨ Polls simulator
│       └── routes/
│           └── sensorReadings.ts          # API endpoints
│
└── frontend/
    └── src/
        ├── services/
        │   └── sensorDataService.ts       # API calls
        ├── hooks/
        │   └── useSensorData.ts           # ✨ React hook
        └── components/
            └── Dashboard/
                └── RealTimeBatteryCard.tsx # ✨ Example
```

## 🎓 Next Steps

1. **Start services** (simulator, backend, frontend)
2. **Verify data flow** (check logs, database, API)
3. **Use the hook** in your components
4. **Replace mock data** with real sensor data
5. **Test with multiple batteries**
6. **Add custom UI** for your use case

## 📚 Additional Resources

- Full documentation: `/SENSOR_DATA_INTEGRATION.md`
- Example component: `/services/frontend/src/components/Dashboard/RealTimeBatteryCard.tsx`
- Hook source: `/services/frontend/src/hooks/useSensorData.ts`
- API service: `/services/frontend/src/services/sensorDataService.ts`
- Backend routes: `/services/backend/src/routes/sensorReadings.ts`

## 💡 Tips

- **Performance:** The hook batches requests and caches data
- **Real-time:** Data updates every 10 seconds automatically
- **Error handling:** Hook provides loading and error states
- **Offline:** Component should handle null data gracefully
- **Testing:** Use simulator with deterministic seed for testing

## ✅ Success Indicators

You'll know it's working when:
1. Backend logs show `sensor_ingestion_run_completed` every 10 seconds
2. Database has rows in `sensor_readings` table
3. API returns data: `GET /api/v1/sensor-readings/latest?batterySystemId=UUID`
4. Component renders with real values
5. Values update every 10 seconds in the UI

---

**Need help?** Check the troubleshooting section above or see `/SENSOR_DATA_INTEGRATION.md` for detailed docs.
