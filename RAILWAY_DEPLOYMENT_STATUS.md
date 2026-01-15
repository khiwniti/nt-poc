# Railway Deployment Status - January 15, 2026

## ✅ Completed

1. **Railway Project Created**
   - Project: nt-poc-battery-management
   - URL: https://railway.com/project/6eef59c3-ae94-47e1-8151-692b91e1f7f4

2. **Databases Added**
   - PostgreSQL (Postgres plugin)
   - Redis (Redis plugin)

3. **Services Created**
   - backend
   - frontend
   - mlops
   - simulator
   - line-bot

4. **Environment Variables Configured**
   - All 5 services have environment variables set
   - JWT Secret generated: saved to jwt-secret.txt
   - LINE credentials configured
   - Database connections linked

## ❌ Current Issue: Nixpacks Cannot Find Start Command

Railway's Nixpacks builder fails with "No start command could be found" despite multiple configuration attempts.

## 🔧 RECOMMENDED SOLUTION: Use Railway Dashboard

**Deploy manually via Railway Dashboard (EASIEST FIX):**

1. Go to: https://railway.com/project/6eef59c3-ae94-47e1-8151-692b91e1f7f4

2. For EACH service, click the service → Settings → Deploy section:

   **Backend:**
   - Start Command: `npm start`
   - Build Command: `npm ci && npm run build`
   
   **Frontend:**
   - Start Command: `npx serve -s dist -l $PORT`
   - Build Command: `npm ci && npm run build`
   
   **MLOps:**
   - Start Command: `uvicorn src.main:app --host 0.0.0.0 --port $PORT`
   - Build Command: `pip install -r requirements.txt`
   
   **Simulator:**
   - Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - Build Command: `pip install -r requirements.txt`
   
   **LINE Bot:**
   - Start Command: `npm start`
   - Build Command: `npm ci && npm run build`

3. Click "Deploy" button for each service

## 📋 After Services Deploy Successfully

```bash
# 1. Enable TimescaleDB
railway run --service backend 'psql $DATABASE_URL -c "CREATE EXTENSION IF NOT EXISTS timescaledb;"'

# 2. Run migrations
railway run --service backend npm run migrate

# 3. Get URLs
railway domain

# 4. Update frontend API URL
BACKEND_URL=$(railway domain --service backend)
railway variables --service frontend --set "VITE_API_BASE_URL=https://$BACKEND_URL/api"
railway up --service frontend --detach

# 5. Test endpoints
curl https://$(railway domain --service backend)/api/v1/health
```

## 🔗 Quick Links

- Dashboard: https://railway.com/project/6eef59c3-ae94-47e1-8151-692b91e1f7f4
- JWT Secret: See jwt-secret.txt
- LINE Console: https://developers.line.biz/console/
