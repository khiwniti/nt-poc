# Railway Deployment Summary

**Date:** 2026-01-15
**Status:** ✅ Ready for Deployment

## What We've Set Up

### 1. Railway Project Created ✅
- **Project:** nt-poc-battery-management
- **Environment:** production
- **Dashboard:** https://railway.com/project/6eef59c3-ae94-47e1-8151-692b91e1f7f4

### 2. Databases Added ✅
- ✅ PostgreSQL database
- ✅ Redis cache

### 3. Documentation Created ✅
- [RAILWAY_DEPLOYMENT_GUIDE.md](RAILWAY_DEPLOYMENT_GUIDE.md) - Complete deployment guide
- [RAILWAY_QUICKSTART.md](RAILWAY_QUICKSTART.md) - Quick command reference
- [RAILWAY_STEP_BY_STEP.md](RAILWAY_STEP_BY_STEP.md) - Detailed manual instructions
- [quick-deploy.sh](quick-deploy.sh) - Automated deployment script with LINE credentials
- [deploy-railway.sh](deploy-railway.sh) - Interactive deployment script

### 4. LINE Credentials Configured ✅
- LINE_CHANNEL_SECRET: e8e575a17c9847b835ff53e9ea81b7fd
- LINE_CHANNEL_ACCESS_TOKEN: (configured in quick-deploy.sh)

## Deployment Steps

### Quick Path (Recommended)

```bash
# Step 1: Enable TimescaleDB
railway connect Postgres
# In psql: CREATE EXTENSION IF NOT EXISTS timescaledb;

# Step 2: Deploy everything
./quick-deploy.sh

# Step 3: Update frontend API URL (after backend deploys)
railway domain --service backend
railway variables set --service frontend VITE_API_BASE_URL="https://<backend-url>/api"
railway up --service frontend

# Step 4: Update LINE webhook
railway domain --service line-bot
# Update at: https://developers.line.biz/console/
```

### Manual Path

Follow instructions in [RAILWAY_STEP_BY_STEP.md](RAILWAY_STEP_BY_STEP.md)

## Services Configuration

### Backend (Port 3000)
**Environment Variables:**
- ✅ NODE_ENV=production
- ✅ Database linked (PostgreSQL + TimescaleDB)
- ✅ Redis linked
- ✅ JWT_SECRET (auto-generated)
- ✅ Service URLs (MLOps, Simulator)
- ✅ Job intervals configured
- ✅ Sensor ingestion enabled

### Frontend (Port 5173)
**Environment Variables:**
- ✅ VITE_APP_NAME="Battery Management System"
- ✅ NODE_ENV=production
- ⏳ VITE_API_BASE_URL (set after backend deploys)

### MLOps (Port 8000)
**Environment Variables:**
- ✅ PORT=8000
- ✅ Database linked (PostgreSQL)
- ✅ Redis linked
- ✅ Models directory configured
- ✅ Model version set

### Simulator (Port 8001)
**Environment Variables:**
- ✅ PORT=8001
- ✅ SENSOR_BACKEND=simulator
- ✅ Simulation parameters configured

### LINE Bot (Port 3002)
**Environment Variables:**
- ✅ PORT=3002
- ✅ LINE_CHANNEL_SECRET (from .env)
- ✅ LINE_CHANNEL_ACCESS_TOKEN (from .env)
- ✅ BACKEND_API_URL=http://backend.railway.internal:3000

## Internal Service URLs

Services communicate via Railway's internal networking:

```
Backend → MLOps:      http://mlops.railway.internal:8000
Backend → Simulator:  http://simulator.railway.internal:8001
LINE Bot → Backend:   http://backend.railway.internal:3000
```

## Post-Deployment Checklist

- [ ] TimescaleDB extension enabled
- [ ] All services deployed successfully
- [ ] Database migrations ran
- [ ] Backend health check passing
- [ ] Frontend health check passing
- [ ] MLOps health check passing
- [ ] Simulator health check passing
- [ ] LINE Bot health check passing
- [ ] Frontend API URL updated
- [ ] LINE webhook URL updated in LINE Console
- [ ] Test end-to-end functionality

## Verification Commands

```bash
# Check deployment status
railway status

# View logs
railway logs --service backend
railway logs --service frontend
railway logs --service mlops
railway logs --service simulator
railway logs --service line-bot

# Get service URLs
railway domain

# Test health endpoints
curl https://<backend-url>/api/v1/health
curl https://<mlops-url>/health
curl https://<simulator-url>/api/health
curl https://<line-bot-url>/health

# Check database connection
railway connect Postgres

# View environment variables
railway variables --service backend
```

## Common Issues & Solutions

### Issue: Service won't start
**Solution:**
```bash
railway logs --service <service-name>
railway variables --service <service-name>
```

### Issue: Database connection failed
**Solution:**
```bash
# Verify TimescaleDB extension
railway connect Postgres
\dx

# Check database variables
railway variables --service backend | grep DATABASE
```

### Issue: Internal networking not working
**Solution:**
- Use `.railway.internal` domains between services
- Example: `http://mlops.railway.internal:8000`

### Issue: Frontend can't reach backend
**Solution:**
```bash
# Get backend URL
railway domain --service backend

# Set in frontend
railway variables set --service frontend \
  VITE_API_BASE_URL="https://<backend-url>/api"

# Redeploy
railway up --service frontend
```

## Next Steps After Deployment

1. **Monitor Services:**
   ```bash
   railway status
   railway logs --service backend --follow
   ```

2. **Test APIs:**
   ```bash
   # Get facilities
   curl https://<backend-url>/api/v1/facilities

   # Get alerts
   curl https://<backend-url>/api/v1/alerts
   ```

3. **Test LINE Bot:**
   - Send message to LINE Official Account
   - Check webhook logs: `railway logs --service line-bot`

4. **Monitor Metrics:**
   ```bash
   railway metrics --service backend
   ```

5. **Set Up Custom Domain (Optional):**
   ```bash
   railway domain add <your-domain.com> --service frontend
   ```

## Support Resources

- **Railway Docs:** https://docs.railway.app
- **Railway Discord:** https://discord.gg/railway
- **Project Dashboard:** https://railway.com/project/6eef59c3-ae94-47e1-8151-692b91e1f7f4

## Files Reference

- **Quick Deploy:** `./quick-deploy.sh` - Automated script with LINE credentials
- **Interactive Deploy:** `./deploy-railway.sh` - Interactive deployment
- **Manual Steps:** [RAILWAY_STEP_BY_STEP.md](RAILWAY_STEP_BY_STEP.md)
- **Complete Guide:** [RAILWAY_DEPLOYMENT_GUIDE.md](RAILWAY_DEPLOYMENT_GUIDE.md)
- **Quick Reference:** [RAILWAY_QUICKSTART.md](RAILWAY_QUICKSTART.md)

---

**Ready to deploy?** Run `railway connect Postgres` to enable TimescaleDB, then `./quick-deploy.sh` to deploy everything! 🚀
