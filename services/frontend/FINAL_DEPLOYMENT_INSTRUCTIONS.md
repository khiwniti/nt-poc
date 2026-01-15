# Final Railway Deployment Instructions

## ✅ Work Completed

1. **Railway Project Setup**
   - Project: nt-poc-battery-management
   - URL: https://railway.com/project/6eef59c3-ae94-47e1-8151-692b91e1f7f4
   - Databases: PostgreSQL + TimescaleDB, Redis
   - Services: backend, frontend, mlops, simulator, line-bot

2. **Environment Variables Configured**
   - All services have complete environment variables
   - Database connections linked
   - JWT secret generated (see jwt-secret.txt)
   - LINE credentials configured

3. **Type Errors Fixed**
   - Frontend types.ts now re-exports from types/ directory
   - AlertType, AlertStatus, Facility, FacilityHealthStatus now available

## 🚀 Next Steps: Deploy via Dashboard

Railway's Nixpacks cannot detect start commands via CLI. Use the dashboard:

### For Each Service:

1. Go to: https://railway.com/project/6eef59c3-ae94-47e1-8151-692b91e1f7f4

2. Click each service → Settings → Deploy

3. Set Start Command and click Deploy:

**Backend:**
```
Start Command: npm start
Build Command: npm ci && npm run build
```

**Frontend:**
```
Start Command: npx serve -s dist -l $PORT
Build Command: npm ci && npm run build
```

**MLOps:**
```
Start Command: uvicorn src.main:app --host 0.0.0.0 --port $PORT
Build Command: pip install -r requirements.txt
```

**Simulator:**
```
Start Command: uvicorn app.main:app --host 0.0.0.0 --port $PORT
Build Command: pip install -r requirements.txt
```

**LINE Bot:**
```
Start Command: npm start
Build Command: npm ci && npm run build
```

## 📋 After Successful Deployment

```bash
# 1. Enable TimescaleDB
railway run --service backend 'psql $DATABASE_URL -c "CREATE EXTENSION IF NOT EXISTS timescaledb;"'

# 2. Run migrations
railway run --service backend npm run migrate

# 3. Get service URLs
railway domain

# 4. Update frontend API URL
BACKEND_URL=$(railway domain --service backend)
railway variables --service frontend --set "VITE_API_BASE_URL=https://$BACKEND_URL/api"
cd services/frontend && railway up --detach && cd ../..

# 5. Update LINE webhook
LINE_URL=$(railway domain --service line-bot)
echo "Update webhook at: https://developers.line.biz/console/"
echo "Webhook URL: https://$LINE_URL/webhook"

# 6. Test all endpoints
curl https://$(railway domain --service backend)/api/v1/health
curl https://$(railway domain --service mlops)/health
curl https://$(railway domain --service simulator)/api/health
curl https://$(railway domain --service line-bot)/health
```

## 📄 Key Files

- **jwt-secret.txt** - Your JWT secret
- **.railwayignore** - Excludes large files
- **services/*/Procfile** - Start commands for each service
- **RAILWAY_DEPLOYMENT_STATUS.md** - Detailed status

## 🔗 Important URLs

- Dashboard: https://railway.com/project/6eef59c3-ae94-47e1-8151-692b91e1f7f4
- LINE Console: https://developers.line.biz/console/

---

**Status**: Ready for manual dashboard deployment! 🎯
