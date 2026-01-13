# 🚀 Railway Deployment - Complete Setup Guide

This guide helps you deploy all 5 services to Railway with properly shared environment variables.

## 📦 What's Included

Your project consists of:
- **Backend** (Node.js/Express) - API server
- **Frontend** (React/Vite) - Web application  
- **MLOps** (Python/FastAPI) - ML model serving
- **Simulator** (Python/FastAPI) - Sensor data simulator
- **Line Bot** (Node.js/Express) - LINE messaging integration
- **PostgreSQL 16** + TimescaleDB
- **Redis 7**

---

## 🎯 Quick Start (3 Steps)

### Step 1: Login and Link
```bash
railway login
cd /Users/khiwn/nt-poc/nt-poc
railway link --project battery-rul-monitoring
```

### Step 2: Setup Shared Environment Variables
```bash
./setup-shared-env.sh
```

### Step 3: Deploy All Services
```bash
./deploy-all-services.sh
```

**That's it!** 🎉

---

## 📁 Helper Scripts & Documentation

| File | Purpose |
|------|---------|
| `deploy-all-services.sh` | Deploy all 5 services to Railway |
| `setup-shared-env.sh` | Configure shared environment variables |
| `verify-env.sh` | Verify all required variables are set |
| `RAILWAY_QUICK_REF.md` | Quick reference for common commands |
| `RAILWAY_ENV_GUIDE.md` | Complete environment variables documentation |
| `ARCHITECTURE.md` | Visual architecture and networking diagram |
| `railway.toml` | Railway configuration (services definition) |

---

## 🔧 What Gets Shared Between Services?

### Database Connections (Auto-shared by Railway plugins):
- `DATABASE_URL`, `DB_HOST`, `DB_PORT`, etc. → Backend, MLOps
- `REDIS_URL` → Backend, MLOps

### Application Settings:
- `NODE_ENV=production` → Backend, Frontend, Line Bot
- `LOG_LEVEL` → Backend, MLOps

### Internal Networking:
- `MLOPS_SERVICE_URL=http://mlops.railway.internal:8001` → Backend
- `BACKEND_API_URL=http://backend.railway.internal:3000` → Simulator, Line Bot

### Security:
- `JWT_SECRET` → Backend (generated once, shared across backend instances)

---

## 🏗️ Service Architecture

```
┌─────────────┐
│  Frontend   │ (Public)
└──────┬──────┘
       │ HTTPS
       ▼
┌─────────────┐     ┌─────────────┐
│   Backend   │────▶│    MLOps    │
└──────┬──────┘     └─────────────┘
       │
       ├──▶ PostgreSQL (Shared)
       ├──▶ Redis (Shared)
       │
       ▼
┌─────────────┐     ┌─────────────┐
│  Simulator  │     │  Line Bot   │
└─────────────┘     └─────────────┘
```

**Internal networking** (`.railway.internal`) is used for service-to-service communication.

---

## ✅ Pre-Deployment Checklist

Before running the deployment scripts, ensure:

- [ ] Railway CLI installed (`npm i -g @railway/cli`)
- [ ] Logged in to Railway (`railway login`)
- [ ] Project linked (`railway link`)
- [ ] PostgreSQL plugin added to project (via Dashboard)
- [ ] Redis plugin added to project (via Dashboard)

---

## 📋 Post-Deployment Steps

After deployment completes:

### 1. Enable TimescaleDB Extension
```bash
railway run psql $DATABASE_URL -c "CREATE EXTENSION IF NOT EXISTS timescaledb;"
```

### 2. Update Frontend URLs

Get the public URLs from Railway Dashboard, then set:
```bash
railway variables --service frontend set \
  VITE_API_BASE_URL=https://<backend-domain>.railway.app/api/v1 \
  VITE_MLOPS_SERVICE_URL=https://<mlops-domain>.railway.app
```

### 3. Redeploy Frontend
```bash
railway up --service frontend --detach
```

### 4. Set Optional Variables

If using email notifications:
```bash
railway variables --service backend set \
  SENDGRID_API_KEY=<your-key> \
  EMAIL_FROM=alerts@yourdomain.com
```

If using LINE Bot:
```bash
railway variables --service line-bot set \
  LINE_CHANNEL_ACCESS_TOKEN=<your-token> \
  LINE_CHANNEL_SECRET=<your-secret>
```

---

## 🔍 Verify Deployment

### Check Service Status:
```bash
railway status
```

### View Service Logs:
```bash
railway logs --service backend --follow
railway logs --service frontend --follow
railway logs --service mlops --follow
```

### Verify Environment Variables:
```bash
./verify-env.sh
```

### Test Health Endpoints:
```bash
# Backend
curl https://<backend-domain>.railway.app/api/v1/health

# MLOps
curl https://<mlops-domain>.railway.app/health

# Simulator
curl https://<simulator-domain>.railway.app/health
```

---

## 🆘 Troubleshooting

### Issue: "Not logged in to Railway"
```bash
railway login
```

### Issue: "Service not found"
The services don't exist yet. The deployment script will create them automatically.

### Issue: Database connection errors
1. Add PostgreSQL plugin in Railway Dashboard
2. Link PostgreSQL to backend and mlops services
3. Redeploy affected services

### Issue: Frontend can't reach backend
1. Get backend public URL from Railway Dashboard
2. Update `VITE_API_BASE_URL` in frontend service
3. Redeploy frontend

### Issue: Build failures
Check build logs:
```bash
railway logs --service <service-name>
```

---

## 🔄 Making Updates

When you update code:

```bash
# Option 1: Deploy specific service
cd services/backend
railway up --service backend

# Option 2: Deploy from project root
cd /Users/khiwn/nt-poc/nt-poc
railway up --service backend --detach
```

---

## 📚 Additional Resources

- **Railway Dashboard**: https://railway.app/project/battery-rul-monitoring
- **Railway Docs**: https://docs.railway.app
- **Railway Discord**: https://discord.gg/railway

For detailed information:
- See `RAILWAY_QUICK_REF.md` for command reference
- See `RAILWAY_ENV_GUIDE.md` for complete environment setup
- See `ARCHITECTURE.md` for system architecture

---

## 💡 Best Practices

1. ✅ **Use internal networking** for service-to-service calls (free & faster)
2. ✅ **Link database plugins** instead of manual connection strings
3. ✅ **Set environment variables before deploying** to avoid redeploys
4. ✅ **Check logs immediately** after deployment
5. ✅ **Use Railway Dashboard** for visual management and monitoring
6. ✅ **Generate secure secrets** with `openssl rand -base64 32`

---

## 🎉 Success Criteria

Your deployment is successful when:
- ✅ All 5 services show "Active" in Railway Dashboard
- ✅ Health endpoints return 200 OK
- ✅ Frontend loads in browser
- ✅ Backend API responds to requests
- ✅ No error logs in Railway Dashboard
- ✅ Database connections working
- ✅ Service-to-service communication working

---

**Need help?** Check the documentation files or reach out via Railway Discord!
