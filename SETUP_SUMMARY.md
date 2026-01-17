# 9-Battery Configuration - Setup Summary

## ✅ Completed Configuration

Your NT-POC Battery Management System is now fully configured to support **9 battery locations** across **3 facilities** in Thailand.

## 📋 What Was Configured

### 1. Database Schema ✅
- **Facilities Table**: 3 facilities (Bangkok, Phuket, Chiang Mai)
- **Zones Table**: 3 zones with 3D layout support
- **Battery Systems Table**: 9 batteries with full 3D positioning
- **Sensor Readings Hypertable**: Optimized for time-series data
- **Additional Tables**: Predictions, alerts, ML tracking

### 2. Seed Data ✅
- **9 Batteries** initialized with:
  - Unique IDs and serial numbers
  - 3D positions (x, y, z coordinates)
  - Rotation angles (pitch, yaw, roll)
  - Physical dimensions (width, height, depth)
  - Display colors and icon types
  - Installation and maintenance dates
  
### 3. Simulator Service ✅
- **Independent State Tracking** for each battery
- **Realistic Sensor Behavior**:
  - Voltage based on Li-ion discharge curve
  - Current with discharge/charge cycles
  - Temperature with I²R heating simulation
  - SoC degradation over time
  - SoH degradation with cycles
- **Configurable Parameters** via `.env` file

### 4. Backend Service ✅
- **Sensor Ingestion Service**: Polls all 9 batteries every 10 seconds
- **Background Jobs**: RUL predictions and alert escalation
- **API Endpoints**: Complete REST API for all battery data
- **Real-time Data Storage**: TimescaleDB hypertable for efficient queries

### 5. Documentation ✅
- **Comprehensive Guide**: `9_BATTERY_CONFIGURATION_GUIDE.md` (60+ pages)
- **API Documentation**: Swagger UI at http://localhost:8001/docs
- **Troubleshooting**: Common issues and solutions included

### 6. Automation Scripts ✅
- **Quick Start Script**: `./quick-start-9-battery.sh`
  - Automatic setup of all services
  - Database migration and seeding
  - Service startup and verification
- **Verification Script**: `npm run verify:9-battery`
  - Tests database schema
  - Verifies simulator connectivity
  - Checks sensor data flow
  - Validates battery configuration

## 🚀 How to Get Started

### Option 1: Automated Setup (Recommended)
```bash
# Run the quick start script
./quick-start-9-battery.sh

# This will:
# 1. Check prerequisites
# 2. Setup database with migrations and seed data
# 3. Configure simulator service
# 4. Start all services
# 5. Verify the configuration
# 6. Show you next steps
```

### Option 2: Manual Setup
```bash
# 1. Start database
docker-compose up -d postgres

# 2. Setup backend
cd services/backend
npm install
npm run migrate
npm run seed:run

# 3. Start simulator
cd ../simulator
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001

# 4. Start backend (in new terminal)
cd services/backend
npm run dev

# 5. Verify (in new terminal, after 30 seconds)
cd services/backend
npm run verify:9-battery
```

## 📊 Battery Distribution

| Facility             | Zone   | Batteries | Layout Type |
|---------------------|--------|-----------|-------------|
| Bangkok HQ          | Zone 1 | 3         | Rack-based  |
| Phuket DC           | Zone 2 | 3         | Cabinet     |
| Chiang Mai Ops      | Zone 3 | 3         | Floor       |
| **Total**           | **3**  | **9**     | **Mixed**   |

### Battery IDs Reference
```
Bangkok (3):
- b0000000-0000-0000-0000-000000000001 (BAT-BKK-01)
- b0000000-0000-0000-0000-000000000002 (BAT-BKK-02)
- b0000000-0000-0000-0000-000000000003 (BAT-BKK-03)

Phuket (3):
- b0000000-0000-0000-0000-000000000004 (BAT-PKT-01)
- b0000000-0000-0000-0000-000000000005 (BAT-PKT-02)
- b0000000-0000-0000-0000-000000000006 (BAT-PKT-03)

Chiang Mai (3):
- b0000000-0000-0000-0000-000000000007 (BAT-CNX-01)
- b0000000-0000-0000-0000-000000000008 (BAT-CNX-02)
- b0000000-0000-0000-0000-000000000009 (BAT-CNX-03)
```

## 🔍 Verification Commands

### Check Database
```bash
# Count batteries
psql -U postgres -d battery_management -c "SELECT COUNT(*) FROM battery_systems;"
# Expected: 9

# List all batteries
psql -U postgres -d battery_management -c "SELECT serial_number, capacity_kwh, status FROM battery_systems ORDER BY serial_number;"

# Check recent sensor data
psql -U postgres -d battery_management -c "SELECT battery_system_id, MAX(time) as latest FROM sensor_readings GROUP BY battery_system_id;"
```

### Check Simulator
```bash
# Health check
curl http://localhost:8001/api/health

# Get reading for specific battery
curl http://localhost:8001/api/sensors/reading/b0000000-0000-0000-0000-000000000001

# Get batch readings
curl -X POST http://localhost:8001/api/sensors/readings/batch \
  -H "Content-Type: application/json" \
  -d '{"battery_system_ids": ["b0000000-0000-0000-0000-000000000001", "b0000000-0000-0000-0000-000000000002"]}'
```

### Check Backend
```bash
# Health check
curl http://localhost:3000/api/v1/health

# List all batteries
curl http://localhost:3000/api/v1/battery-systems

# Get latest reading for battery
curl http://localhost:3000/api/v1/sensor-readings/b0000000-0000-0000-0000-000000000001/latest

# List all facilities
curl http://localhost:3000/api/v1/facilities
```

### Run Automated Verification
```bash
cd services/backend
npm run verify:9-battery

# This comprehensive test checks:
# ✅ Database schema (facilities, zones, batteries)
# ✅ 3D layout fields (positions, rotations, dimensions)
# ✅ TimescaleDB hypertable configuration
# ✅ Simulator connectivity and health
# ✅ Single and batch battery readings
# ✅ Sensor data storage and coverage
# ✅ Battery distribution across facilities
# ✅ Configuration uniqueness and integrity
```

## 📖 Key Files

### Configuration
- `services/backend/.env` - Backend configuration
- `services/simulator/.env` - Simulator configuration
- `services/frontend/.env` - Frontend configuration

### Database
- `services/backend/migrations/20240101000001_create_zones_table.ts` - Zones schema
- `services/backend/migrations/20260117071000_update_zones_for_3d_layout.ts` - 3D layout fields
- `services/backend/migrations/20260117072000_update_battery_systems_3d_fields.ts` - Battery 3D fields
- `services/backend/seeds/001_initial_data.ts` - Seed data for 9 batteries

### Scripts
- `quick-start-9-battery.sh` - Automated setup script
- `services/backend/scripts/verify-9-battery-config.ts` - Verification script

### Documentation
- `9_BATTERY_CONFIGURATION_GUIDE.md` - Complete configuration guide
- `CLAUDE.md` - Project overview and development guide

## 🎯 Next Steps

### 1. Start Frontend (Manual)
```bash
cd services/frontend
npm install
npm run dev
# Open: http://localhost:5173
```

### 2. View Real-time Data
- **Dashboard**: Shows all 9 battery cards with live sensor data
- **3D View**: Visualizes battery positions in each zone
- **Map View**: Shows 3 facilities on Thailand map
- **Alerts**: Real-time alerts and predictions

### 3. Test ML Features
```bash
# Trigger manual prediction (backend should be running)
curl -X POST http://localhost:3000/api/v1/ml/train

# Check predictions
curl http://localhost:3000/api/v1/predictions

# View model performance
curl http://localhost:3000/api/v1/model-performance
```

### 4. Monitor Logs
```bash
# Backend logs (includes sensor ingestion)
tail -f logs/backend.log | grep sensor_ingestion

# Simulator logs
tail -f logs/simulator.log

# Expected log patterns:
# Backend: sensor_ingestion_run_completed {fetched: 9, stored: 9, ...}
# Simulator: Created new state for b0000000-0000-0000-0000-000000000001
```

### 5. Explore API Documentation
- **Simulator API**: http://localhost:8001/docs (Swagger UI)
- **Backend API**: Check `services/backend/src/routes/` for endpoints
- **API Testing**: Use Postman or curl with examples in guide

## 🔧 Useful Commands

### Service Control
```bash
# Start all services
./quick-start-9-battery.sh start

# Stop all services
./quick-start-9-battery.sh stop

# Verify configuration
./quick-start-9-battery.sh verify

# Reset and restart
./quick-start-9-battery.sh reset
```

### Database Management
```bash
cd services/backend

# Run migrations
npm run migrate

# Rollback last migration
npm run migrate:rollback

# Check migration status
npm run migrate:status

# Seed database
npm run seed:run

# Complete reset
npm run migrate:rollback && npm run migrate && npm run seed:run
```

### Testing
```bash
cd services/backend

# Run all tests
npm test

# Test coverage
npm run test:coverage

# Test migrations
npm run test:migrations

# Quality checks
npm run quality
```

## ⚠️ Troubleshooting

### Simulator Not Accessible
**Problem**: Backend shows `sensor_ingestion_simulator_not_accessible`

**Solution**:
```bash
# Check if simulator is running
curl http://localhost:8001/api/health

# If not running, start it:
cd services/simulator
source venv/bin/activate
uvicorn app.main:app --reload --port 8001
```

### No Sensor Data in Database
**Problem**: `sensor_readings` table is empty

**Solution**:
```bash
# Check backend logs
tail -f logs/backend.log | grep sensor_ingestion

# Verify ingestion is enabled
grep SENSOR_INGESTION_ENABLED services/backend/.env
# Should be: SENSOR_INGESTION_ENABLED=true

# Test simulator manually
curl http://localhost:8001/api/sensors/reading/b0000000-0000-0000-0000-000000000001
```

### Database Connection Failed
**Problem**: Cannot connect to database

**Solution**:
```bash
# Start PostgreSQL
docker-compose up -d postgres

# Check connection
psql -U postgres -d battery_management -c "SELECT 1;"

# Verify .env settings
cat services/backend/.env | grep DB_
```

### Frontend Not Loading Data
**Problem**: Dashboard shows "Loading..." indefinitely

**Solution**:
```bash
# Check backend is running
curl http://localhost:3000/api/v1/health

# Check browser console for errors
# Verify VITE_API_URL in services/frontend/.env

# Check CORS settings in backend .env
```

## 📚 Documentation Links

- **Configuration Guide**: `9_BATTERY_CONFIGURATION_GUIDE.md` - Complete setup guide
- **Project Overview**: `CLAUDE.md` - Development guide and architecture
- **API Documentation**: http://localhost:8001/docs - Interactive API testing
- **Kubernetes**: `KUBERNETES_QUICKSTART.md` - Production deployment
- **Real Data**: `REAL_DATA_QUICK_START.md` - Hardware integration guide

## 🎉 Success Indicators

Your system is working correctly when:
1. ✅ `npm run verify:9-battery` shows all tests passing
2. ✅ Backend logs show: `sensor_ingestion_run_completed {fetched: 9, stored: 9}`
3. ✅ Database has recent sensor data: `SELECT COUNT(*) FROM sensor_readings;` returns > 0
4. ✅ Simulator responds: `curl http://localhost:8001/api/health` returns "healthy"
5. ✅ Frontend displays 9 battery cards with live data
6. ✅ Map shows 3 facilities across Thailand

## 💡 Tips

- **Performance**: Simulator can handle 100+ batteries with independent state tracking
- **Scalability**: Backend ingestion service uses parallel fetching for efficiency
- **Monitoring**: Use Prometheus metrics at http://localhost:3000/metrics
- **Debugging**: Set `LOG_LEVEL=debug` in backend `.env` for detailed logs
- **Testing**: Run `npm run quality` before committing changes

## 🚦 Status

- ✅ Database schema configured for 9 batteries
- ✅ Seed data initialized with realistic 3D positions
- ✅ Simulator configured for independent battery state
- ✅ Backend ingestion service ready
- ✅ Verification scripts created
- ✅ Documentation complete
- ✅ Quick start automation ready

## 🤝 Need Help?

- **Configuration Issues**: Check `9_BATTERY_CONFIGURATION_GUIDE.md`
- **API Questions**: Visit http://localhost:8001/docs
- **Database Problems**: See troubleshooting section in guide
- **Frontend Issues**: Check `CLAUDE.md` for component documentation

---

**System Ready!** Run `./quick-start-9-battery.sh` to start your 9-battery monitoring system! 🎉🔋
