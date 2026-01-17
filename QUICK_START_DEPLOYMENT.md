# Quick Start: Railway Deployment

**NT-POC Production Fleet - Railway Docker Deployment**  
**⏱️ Total Time: ~15 minutes**

---

## 🎯 What You'll Deploy

- **Frontend:** React + Nginx (dashboard for 1,944 batteries)
- **Backend:** Node.js + Express + PostgreSQL (TimescaleDB)
- **Simulator:** Python FastAPI (battery sensor data generator)
- **MLOps:** Python + TensorFlow (RUL prediction service)

---

## 📋 Prerequisites (5 minutes)

### 1. Install Railway CLI
```bash
npm install -g @railway/cli
```

### 2. Login to Railway
```bash
railway login
```

Your browser will open for authentication.

### 3. Verify Authentication
```bash
railway whoami
```

**Expected output:**
```
✅ Logged in as: your-email@example.com
```

---

## 🧪 Optional: Test Locally First (10 minutes)

```bash
# Build all Docker images
docker-compose build

# Start all services
docker-compose up -d

# Check status
docker-compose ps

# Test health endpoints
curl http://localhost:3000/api/v1/health  # Backend
curl http://localhost:8001/health          # Simulator
curl http://localhost:8002/health          # MLOps
curl http://localhost:8080/health          # Frontend

# Open frontend in browser
open http://localhost:8080

# Stop when done testing
docker-compose down
```

**Skip this step if you want to deploy directly to Railway.**

---

## 🚀 Deploy to Railway (10-15 minutes)

### Automated Deployment (Recommended)

```bash
# Run deployment script
./deploy-railway.sh
```

**What happens:**
1. Creates Railway project
2. Provisions PostgreSQL database
3. Deploys all 4 services
4. Runs database migrations
5. Seeds production data (1,944 batteries)
6. Links services together

**Wait for completion message:**
```
╔════════════════════════════════════════════════════════════╗
║               🎉 Deployment Complete! 🎉                   ║
╚════════════════════════════════════════════════════════════╝

Service URLs:
  🌐 Frontend:  your-frontend.up.railway.app
  🔧 Backend:   your-backend.up.railway.app
  🤖 Simulator: your-simulator.up.railway.app
  🧠 MLOps:     your-mlops.up.railway.app

Database Status:
  📊 Batteries: 1944/1944
  🏢 Facilities: 9
  🔋 Strings: 81
```

---

## ✅ Verify Deployment (3 minutes)

### 1. Check Service Status
```bash
railway status
```

**Expected:**
```
✓ backend    (running)
✓ simulator  (running)
✓ mlops      (running)
✓ frontend   (running)
✓ postgresql (running)
```

### 2. Test Backend API
```bash
cd services/backend
BACKEND_URL=$(railway domain)
curl https://$BACKEND_URL/api/v1/health
```

**Expected:**
```json
{
  "status": "healthy",
  "timestamp": "2026-01-17T...",
  "services": {
    "database": "connected",
    "timescaledb": "enabled"
  }
}
```

### 3. Test Fleet Summary
```bash
curl https://$BACKEND_URL/api/v1/battery-systems/fleet/summary
```

**Expected:**
```json
{
  "totalBatteries": 1944,
  "totalFacilities": 9,
  "totalStrings": 81,
  "totalCapacityKwh": 2799.36,
  ...
}
```

### 4. Open Frontend
```bash
cd ../frontend
FRONTEND_URL=$(railway domain)
open https://$FRONTEND_URL
```

**Verify:**
- ✅ Dashboard loads
- ✅ Shows "1.9k" batteries
- ✅ Shows "9" facilities
- ✅ Map displays 9 locations

---

## 🎉 Success!

Your NT-POC system is now running on Railway!

---

## 📊 What's Next?

### Monitor Your Deployment
```bash
# View logs
cd services/backend
railway logs --follow

# Check resource usage
railway status

# Open Railway dashboard
railway open
```

### Configure Optional Features

**1. Enable Sentry (Error Tracking):**
```bash
cd services/backend
railway variables set SENTRY_DSN="your-sentry-dsn"
railway restart
```

**2. Add Mapbox (Frontend Maps):**
```bash
cd services/frontend
railway variables set VITE_MAPBOX_TOKEN="your-mapbox-token"
railway restart
```

**3. Add Gemini AI (Report Generation):**
```bash
cd services/frontend
railway variables set VITE_GEMINI_API_KEY="your-gemini-key"
railway restart
```

---

## 🐛 Troubleshooting

### Issue: Backend not connecting to database

**Solution:**
```bash
cd services/backend
railway variables set DB_SSL=true
railway restart
```

### Issue: Frontend shows "Network Error"

**Solution:**
```bash
cd services/frontend
railway variables get VITE_API_URL
# If incorrect, update:
railway variables set VITE_API_URL="https://your-backend.up.railway.app"
railway restart
```

### Issue: Slow performance

**Solution:**
Open Railway dashboard and increase resources:
- Backend: 2GB RAM
- MLOps: 4GB RAM

### Issue: MLOps model not found

**Solution:**
Upload model file to MLOps service (see `PRE_DEPLOYMENT_CHECKLIST.md` Step 5)

---

## 📚 More Information

- **Complete Guide:** `RAILWAY_DOCKER_DEPLOYMENT.md`
- **Pre-Deployment Checklist:** `PRE_DEPLOYMENT_CHECKLIST.md`
- **Deployment Summary:** `DEPLOYMENT_READY_SUMMARY.md`
- **Docker Reference:** `DOCKER_QUICK_REFERENCE.md`

---

## 💡 Pro Tips

1. **Use Railway dashboard** for monitoring and metrics
2. **Enable auto-scaling** for production traffic
3. **Set up alerts** for service health
4. **Review logs regularly** to catch issues early
5. **Keep environment variables secure** (never commit to git)

---

## ⚡ Quick Commands Reference

```bash
# Check status
railway status

# View logs
railway logs --tail 100

# Restart service
railway restart

# Get service URL
railway domain

# Open dashboard
railway open

# Update environment variable
railway variables set KEY=VALUE

# Run command in service
railway run <command>
```

---

**🚀 You're all set! Your battery management system is live on Railway.**

**Dashboard:** https://your-frontend.up.railway.app

---

**Questions?** Check `RAILWAY_DOCKER_DEPLOYMENT.md` for detailed documentation.
