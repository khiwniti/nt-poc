# Railway Deploy All Services - Quick Reference

## 🚀 One-Command Deploy

```bash
./deploy-all-railway-services.sh
```

## 📋 Services to Deploy

| Service | Type | Port | Path |
|---------|------|------|------|
| backend | Node.js/Express | 3000 | `services/backend` |
| frontend | React/Vite | (static) | `services/frontend` |
| line-bot | Node.js/Express | 3001 | `services/line-bot` |
| mlops | Python/FastAPI | 8001 | `services/mlops` |
| simulator | Python/FastAPI | 8002 | `services/simulator` |

**Note:** `ml` service is NOT deployed (local training only)

## 🎯 Manual Deploy (if needed)

### Deploy Backend
```bash
cd services/backend && railway up --service backend --environment production && cd ../..
```

### Deploy Frontend
```bash
cd services/frontend && railway up --service frontend --environment production && cd ../..
```

### Deploy LINE Bot
```bash
cd services/line-bot && railway up --service line-bot --environment production && cd ../..
```

### Deploy MLOps
```bash
cd services/mlops && railway up --service mlops --environment production && cd ../..
```

### Deploy Simulator
```bash
cd services/simulator && railway up --service simulator --environment production && cd ../..
```

## ✅ Verification Commands

```bash
# Check all services status
railway status

# List all services
railway service list

# View backend logs
railway logs --service backend

# View frontend logs
railway logs --service frontend

# Check deployments
railway deployment list
```

## 🔗 Generate Frontend Domain

```bash
cd services/frontend
railway domain --service frontend
cd ../..
```

## 🔧 Common Issues

### Service Not Found
```bash
# Link to project first
railway link
# Select: nt-poc-battery-management
```

### Missing Environment Variables
```bash
# Check variables for a service
railway variables --service backend

# Set a variable
railway variables set JWT_SECRET=<your-secret> --service backend
```

### Build Failing
```bash
# Check build logs
railway logs --service <service-name> --deployment <deployment-id>
```

## 📊 Project Info

- **Project:** nt-poc-battery-management
- **Environment:** production
- **Database:** Postgres (already configured)
- **Cache:** Redis (already configured)

## 🔐 Required Variables

### Backend
- `DATABASE_URL` ✅ (auto from Postgres)
- `REDIS_URL` ✅ (auto from Redis)
- `JWT_SECRET` ⚠️ (must set)
- `NODE_ENV=production`

### Frontend
- `VITE_API_URL` ⚠️ (set to backend URL)
- `NODE_ENV=production`

### LINE Bot
- `LINE_CHANNEL_ACCESS_TOKEN` ⚠️ (must set)
- `LINE_CHANNEL_SECRET` ⚠️ (must set)
- `BACKEND_URL` ⚠️ (set to backend URL)

### MLOps & Simulator
- `REDIS_URL` ✅ (auto from Redis)

## 📝 Post-Deploy Checklist

- [ ] All 5 services deployed successfully
- [ ] Frontend domain generated
- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] Health checks passing
- [ ] Services can communicate internally

## 🛠️ Useful Commands

```bash
# Restart a service
railway restart --service <service-name>

# Rollback a service
railway rollback --service <service-name>

# SSH into a service
railway shell --service <service-name>

# Run migrations
cd services/backend && railway run npm run migrate && cd ../..

# Seed database
cd services/backend && railway run npm run seed:run && cd ../..
```

## 📚 Documentation

- Full Guide: [`RAILWAY_MULTI_SERVICE_DEPLOYMENT.md`](RAILWAY_MULTI_SERVICE_DEPLOYMENT.md)
- Railway Config: [`railway.toml`](railway.toml)
- Railway Docs: https://docs.railway.app
