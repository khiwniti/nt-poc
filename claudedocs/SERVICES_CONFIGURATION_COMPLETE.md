# Services Configuration & Setup Guide

**Generated:** 2026-01-15 09:30 ICT
**Status:** Configuration Complete - Ready for Service Startup

## 📋 Overview

This document provides complete setup instructions for all three auxiliary services that integrate with the main backend:

1. **Sensor Simulator** (Port 8001) - Generates realistic battery sensor data
2. **MLOps Service** (Port 8000) - Serves ML models for predictions
3. **LINE OA Bot** (Port 3002) - LINE Official Account integration

## 🎯 Service Architecture

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────┐
│  Simulator      │────▶│   Backend    │◀───▶│  MLOps      │
│  (Port 8001)    │     │  (Port 3000) │     │ (Port 8000) │
└─────────────────┘     └──────────────┘     └─────────────┘
                              │
                              ▼
                        ┌─────────────┐
                        │  Frontend   │
                        │ (Port 5173) │
                        └─────────────┘
                              │
                              ▼
                        ┌─────────────┐
                        │  LINE Bot   │
                        │ (Port 3002) │
                        └─────────────┘
```

## 1️⃣ Sensor Simulator Configuration

### Purpose
- Generates realistic battery sensor data (voltage, current, temperature, SoC, SoH)
- Backend polls this service every 10 seconds
- Can switch between simulated and real hardware sensors

### Configuration File
**Location:** `services/simulator/.env`

**Key Settings:**
- `SENSOR_BACKEND=simulator` - Use simulated data (change to `hardware` for real sensors)
- `PORT=8001` - Service port
- `SIMULATOR_NOISE_LEVEL=0.02` - Realistic sensor noise
- `SIMULATOR_DRIFT_ENABLED=true` - Battery degrades over time
- `SIMULATOR_UPDATE_INTERVAL_MS=1000` - Update every second

### Setup & Start

```bash
# 1. Navigate to simulator directory
cd services/simulator

# 2. Create Python virtual environment (if not exists)
python3 -m venv venv

# 3. Activate virtual environment
source venv/bin/activate  # On Unix/macOS
# OR
venv\Scripts\activate     # On Windows

# 4. Install dependencies
pip install -r requirements.txt

# 5. Start the service
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload

# Service will be available at: http://localhost:8001
# API Documentation: http://localhost:8001/docs
# Health check: http://localhost:8001/api/health
```

### API Endpoints

**GET /api/sensors**
- Returns current sensor readings for all battery systems
- Backend polls this endpoint every 10 seconds
- Response includes: voltage, current, temperature, soc, soh, power

**GET /api/health**
- Health check endpoint
- Returns service status

**GET /docs**
- Interactive API documentation (Swagger UI)

### Integration with Backend

Backend configuration (`services/backend/.env`):
```env
SENSOR_INGESTION_ENABLED=true
SIMULATOR_URL=http://localhost:8001
SENSOR_INGESTION_INTERVAL=10000  # Poll every 10 seconds
```

Backend logs:
```
sensor_ingestion_starting
sensor_ingestion_simulator_not_accessible  # If simulator not running
sensor_ingestion_run_completed  # After successful poll
```

## 2️⃣ MLOps Service Configuration

### Purpose
- Serves trained ML models for battery RUL (Remaining Useful Life) predictions
- Provides SHAP explanations for model interpretability
- Handles anomaly detection

### Configuration File
**Location:** `services/mlops/.env`

**Key Settings:**
- `PORT=8000` - Service port
- `MODELS_DIR=models` - Directory containing trained models
- `MODEL_VERSION=v1.0.0` - Current model version
- `DB_*` - PostgreSQL connection (same as backend)

### Setup & Start

```bash
# 1. Navigate to MLOps directory
cd services/mlops

# 2. Create Python virtual environment (if not exists)
python3 -m venv venv

# 3. Activate virtual environment
source venv/bin/activate  # On Unix/macOS
# OR
venv\Scripts\activate     # On Windows

# 4. Install dependencies
pip install -r requirements.txt

# 5. Ensure models directory exists
mkdir -p models

# 6. Start the service
uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload

# Service will be available at: http://localhost:8000
# API Documentation: http://localhost:8000/docs
# Health check: http://localhost:8000/health
```

### API Endpoints

**POST /ml/predict**
- Single RUL prediction
- Request: sensor data
- Response: predicted RUL, confidence

**POST /ml/batch-predict**
- Batch predictions for multiple batteries
- More efficient than multiple single predictions

**GET /ml/explain**
- SHAP explanation for a prediction
- Shows feature importance

**GET /health**
- Service health check

**GET /metrics**
- Prometheus metrics

### Integration with Backend

Backend calls MLOps via:
```typescript
// services/backend/src/services/scheduledPredictionJob.ts
// Runs every 60 minutes by default
```

Backend configuration:
```env
PREDICTION_JOB_INTERVAL_MINUTES=60
```

## 3️⃣ LINE OA Bot Configuration

### Purpose
- Provides LINE Official Account integration
- AI-powered chat responses using Claude
- Sends facility alerts to LINE users

### Configuration File
**Location:** `services/line-bot/.env`

**Key Settings (Already Configured):**
- `LINE_CHANNEL_SECRET=...` - ✅ Already set
- `LINE_CHANNEL_ACCESS_TOKEN=...` - ✅ Already set
- `AI_BASE_URL=http://localhost:4141/v1` - Local Claude instance
- `AI_MODEL=claude-sonnet-4.5` - Claude model
- `PORT=3002` - Service port
- `BACKEND_API_URL=http://localhost:3000` - Backend integration

### Setup & Start

```bash
# 1. Navigate to LINE bot directory
cd services/line-bot

# 2. Install dependencies (if not done)
npm install

# 3. Start the service
npm run dev

# Service will be available at: http://localhost:3002
# Webhook endpoint: http://localhost:3002/webhook
# Health check: http://localhost:3002/health
```

### Features

1. **Webhook Handler** - Receives LINE messages
2. **AI Response** - Claude-powered responses
3. **Alert Notifications** - Sends facility alerts to LINE
4. **System Status** - Query facility and alert status

### Integration with Backend

Backend can send notifications via:
```bash
POST http://localhost:3002/notify
{
  "message": "Alert notification",
  "recipients": ["LINE_USER_ID"]
}
```

### LINE Configuration

**Webhook URL (for production):**
- Need to expose via ngrok or public URL
- Set in LINE Developers Console

**Local Testing:**
```bash
# Use ngrok to expose local server
ngrok http 3002

# Use the ngrok URL as webhook in LINE Console
# https://abc123.ngrok.io/webhook
```

## 🚀 Quick Start - Start All Services

### Terminal 1: Backend (Already Running)
```bash
npm run dev --workspace=@nt-poc/backend
# Running on http://localhost:3000
```

### Terminal 2: Simulator
```bash
cd services/simulator
source venv/bin/activate
python -m uvicorn app.main:app --reload --port 8001
# Running on http://localhost:8001
```

### Terminal 3: MLOps
```bash
cd services/mlops
source venv/bin/activate
uvicorn src.main:app --reload --port 8000
# Running on http://localhost:8000
```

### Terminal 4: LINE Bot
```bash
cd services/line-bot
npm run dev
# Running on http://localhost:3002
```

### Terminal 5: Frontend
```bash
npm run dev --workspace=@nt-poc/frontend
# Running on http://localhost:5173
```

## 📊 Verification Checklist

After starting all services, verify they're running:

```bash
# Check all health endpoints
echo "=== Service Health Check ==="
curl http://localhost:3000/api/v1/health && echo " ✅ Backend"
curl http://localhost:8001/api/health && echo " ✅ Simulator"
curl http://localhost:8000/health && echo " ✅ MLOps"
curl http://localhost:3002/health && echo " ✅ LINE Bot"
curl http://localhost:5173 && echo " ✅ Frontend"
```

## 🔄 Data Flow

### 1. Sensor Data Flow
```
Simulator (8001)
  → GET /api/sensors
  → Backend (3000)
  → PostgreSQL (sensor_readings table)
  → Frontend (5173) displays real-time data
```

### 2. Prediction Flow
```
Backend (3000) scheduled job
  → POST /ml/predict
  → MLOps (8000)
  → Backend stores in rul_predictions table
  → Frontend displays predictions
```

### 3. Alert Flow
```
Backend (3000) generates alert
  → Stores in PostgreSQL
  → POST /notify
  → LINE Bot (3002)
  → LINE Official Account sends message to user
```

## 🛠 Troubleshooting

### Simulator Not Accessible
**Backend logs:** `sensor_ingestion_simulator_not_accessible`

**Solution:**
1. Check simulator is running: `curl http://localhost:8001/api/health`
2. Check .env file has correct URL: `SIMULATOR_URL=http://localhost:8001`
3. Start simulator: `cd services/simulator && uvicorn app.main:app --reload --port 8001`

### MLOps Model Not Found
**Error:** `Model file not found`

**Solution:**
1. Train ML model first: `cd services/ml && python -m src.training.train_rul_model`
2. Copy model to MLOps: `cp services/ml/models/* services/mlops/models/`
3. Verify model exists: `ls services/mlops/models/`

### LINE Bot Not Receiving Messages
**Issue:** Webhook not receiving LINE messages

**Solution:**
1. For local testing, use ngrok: `ngrok http 3002`
2. Update LINE Console webhook URL with ngrok URL
3. Verify webhook: Check LINE Console shows "Success"

### Backend Not Polling Simulator
**Check:**
1. Backend logs for `sensor_ingestion_starting`
2. Environment variable: `SENSOR_INGESTION_ENABLED=true`
3. Simulator health: `curl http://localhost:8001/api/health`

## 📝 Environment Files Summary

### ✅ Configured Files
1. `services/simulator/.env` - ✅ Created (simulator configuration)
2. `services/mlops/.env` - ✅ Created (MLOps configuration)
3. `services/line-bot/.env` - ✅ Already exists with LINE credentials
4. `services/backend/.env` - ✅ Already configured

### Dependencies Status
- **Backend:** ✅ Dependencies installed, running on port 3000
- **Frontend:** ✅ Dependencies installed
- **Simulator:** ⏳ Needs `pip install -r requirements.txt`
- **MLOps:** ⏳ Needs `pip install -r requirements.txt`
- **LINE Bot:** ✅ Dependencies installed

## 🎯 Next Steps

1. **Install Python Dependencies**
   ```bash
   # Simulator
   cd services/simulator && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt

   # MLOps
   cd services/mlops && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt
   ```

2. **Start Services** (use 5 terminals as shown in Quick Start)

3. **Verify Integration**
   - Open http://localhost:5173 (Frontend)
   - Check real-time sensor data appears
   - Verify alerts are generated
   - Test LINE bot (requires ngrok setup)

4. **Monitor Logs**
   - Backend: Check for `sensor_ingestion_run_completed`
   - Simulator: Check for sensor data requests
   - MLOps: Check for prediction requests

## 📚 Additional Resources

- **Simulator API Docs:** http://localhost:8001/docs
- **MLOps API Docs:** http://localhost:8000/docs
- **Backend API Docs:** Check routes in `services/backend/src/routes/`
- **LINE Developer Console:** https://developers.line.biz/console/

---

**Configuration Status:** ✅ All environment files created and configured
**Ready for:** Service startup and integration testing
