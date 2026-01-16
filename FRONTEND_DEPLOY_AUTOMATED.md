# Frontend Service Deployment - Complete Guide with MCP Automation

## ✅ Current Status

**Frontend service has been removed from Railway.**

Services currently deployed:
- ✅ backend - https://backend-production-77f7.up.railway.app
- ✅ line-bot - https://line-bot-production-8114.up.railway.app
- ⏳ mlops - exists but needs fixing
- ⏳ simulator - exists but needs fixing
- ❌ **frontend - DELETED, needs recreation**

---

## 🚀 Step-by-Step Deployment Process

### STEP 1: Create Frontend Service in Railway Dashboard (Manual - 2 minutes)

**Why manual?**: Railway MCP/CLI cannot create new services, only manage existing ones.

#### Instructions:

1. **Open Railway Dashboard**
   - URL: https://railway.app/dashboard
   - Project: **nt-poc-battery-management**
   - Environment: **production**

2. **Create New Service**
   - Click **+ New** button (top right)
   - Select **Empty Service**

3. **Name the Service**
   - Service Name: **frontend** (IMPORTANT: Use exact name "frontend")

4. **Connect GitHub Repository**
   - Click service → **Settings** tab
   - Under **Source** section:
     - Click **Connect Repo**
     - Repository: **khiwniti/nt-poc**
     - Branch: **main** (or 001-enterprise-facility-manager)
     - Root Directory: *Leave empty* (uses repo root)

5. **Configure Build Settings** 
   - Under **Build** section:
     - Builder: **Dockerfile** ← **CRITICAL: Must select Dockerfile!**
     - Dockerfile Path: **services/frontend/Dockerfile**
     - Watch Paths: **services/frontend/**

6. **Save Configuration**
   - Settings should auto-save
   - Do NOT trigger deploy yet - we'll set environment variables first

---

### STEP 2: Tell Me When Ready (Reply in Chat)

Once you've completed Step 1, reply with:
**"Frontend service created"**

Then I'll immediately run these automated steps:

---

### STEP 3: Link to Frontend Service (Automated via MCP)

I'll run:
```
mcp--railway--link-service(serviceName="frontend")
```

---

### STEP 4: Set Environment Variables (Automated via MCP)

I'll run:
```
mcp--railway--set-variables(
  service="frontend",
  variables=[
    "NODE_ENV=production",
    "VITE_API_URL=https://backend-production-77f7.up.railway.app/api/v1"
  ]
)
```

**Environment Variables Explained**:
- `NODE_ENV=production`: Enables production optimizations
- `VITE_API_URL`: Backend API endpoint for frontend to connect to

---

### STEP 5: Deploy Frontend (Automated via MCP)

I'll run:
```
mcp--railway--deploy(
  workspacePath="/Users/khiwn/nt-poc/nt-poc",
  service="frontend"
)
```

This will:
- Upload code to Railway
- Build using Dockerfile
- Deploy to production environment

---

### STEP 6: Monitor Deployment (Automated via MCP)

I'll check:
```
mcp--railway--get-logs(
  workspacePath="/Users/khiwn/nt-poc/nt-poc",
  service="frontend",
  logType="build"
)
```

Expected build steps:
1. ✅ Builder: DOCKERFILE detected
2. ✅ COPY services/frontend/package*.json
3. ✅ npm install --ignore-scripts
4. ✅ COPY source files
5. ✅ npm run build (Vite build)
6. ✅ nginx production server
7. ✅ Container started
8. ✅ Health check passing

---

### STEP 7: Verify Deployment (Automated)

I'll run:
```
mcp--railway--list-deployments(
  workspacePath="/Users/khiwn/nt-poc/nt-poc",
  service="frontend",
  limit=1
)
```

And test health endpoint:
```
curl https://frontend-production-XXXX.up.railway.app/
```

Should return: Frontend React app (200 OK)

---

## 📋 Expected Results

### After Successful Deployment:

**Frontend Service**:
- ✅ Builder: DOCKERFILE
- ✅ Status: Deployed
- ✅ Health: Passing
- ✅ URL: https://frontend-production-XXXX.up.railway.app
- ✅ Connected to backend API

**Frontend Features Working**:
- ✅ Loads React application
- ✅ Calls backend API at https://backend-production-77f7.up.railway.app/api/v1
- ✅ Displays facility dashboard
- ✅ Shows battery systems
- ✅ 3D visualization (if enabled)

---

## 🔗 Service Integration

Once frontend is deployed, the full integration will be:

```
┌─────────────────────────────────────────────────────────────┐
│                    NT-POC System Architecture                │
└─────────────────────────────────────────────────────────────┘

┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   Frontend   │────────▶│   Backend    │────────▶│   Postgres   │
│  React/Vite  │         │  Express.js  │         │  TimescaleDB │
│              │         │              │         │              │
│  Port: Auto  │         │  Port: 3000  │         │  Port: 5432  │
└──────────────┘         └──────────────┘         └──────────────┘
       │                        │                         │
       │                        │                         │
       │                        ▼                         │
       │                 ┌──────────────┐                 │
       │                 │    Redis     │                 │
       │                 │    Cache     │                 │
       │                 └──────────────┘                 │
       │                                                   │
       │                        ▼                          │
       │                 ┌──────────────┐                 │
       │                 │   Simulator  │                 │
       │                 │   FastAPI    │                 │
       │                 │  Port: 8001  │                 │
       │                 └──────────────┘                 │
       │                                                   │
       │                        ▼                          │
       │                 ┌──────────────┐                 │
       │                 │    MLOps     │                 │
       │                 │   FastAPI    │                 │
       │                 │  Port: 8000  │                 │
       │                 └──────────────┘                 │
       │                                                   │
       └────────────────────────────────────────────────────┘
                    LINE Bot (PORT: 3002)
                    Webhook Integration

```

---

## ⚙️ Frontend Configuration Details

### Dockerfile (services/frontend/Dockerfile)

Already configured and tested:

```dockerfile
FROM node:20-alpine as builder
WORKDIR /app

# Install dependencies
COPY services/frontend/package*.json ./
RUN npm install --ignore-scripts && npm cache clean --force

# Build app
COPY services/frontend/ ./
RUN npm run build

# Production server
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY services/frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**Features**:
- ✅ Multi-stage build (optimized size)
- ✅ Node 20 Alpine (lightweight)
- ✅ Production nginx server
- ✅ Optimized for Railway
- ✅ Auto-assigns PORT

### railway.toml Configuration

Already configured:

```toml
[[services]]
name = "frontend"

[services.build]
builder = "DOCKERFILE"
dockerfilePath = "services/frontend/Dockerfile"
watchPatterns = ["services/frontend/**"]
```

---

## 🎯 Next Steps After Frontend Deployment

Once frontend is deployed, you can:

1. **Access Frontend**: https://frontend-production-XXXX.up.railway.app
2. **Test Integration**: Frontend ↔ Backend API calls
3. **Verify Features**: Dashboard, battery systems, facilities
4. **Optional**: Recreate MLOps/Simulator services (same process)

---

## 🆘 Troubleshooting

### Issue: Build Fails
**Solution**: Check logs - likely Dockerfile issue
```
railway logs --service frontend --type build
```

### Issue: Frontend Shows 502 Error
**Solution**: Container not starting - check deployment logs
```
railway logs --service frontend --type deploy
```

### Issue: API Calls Fail (CORS)
**Solution**: Backend needs frontend URL in ALLOWED_ORIGINS
```
railway variables set ALLOWED_ORIGINS="https://frontend-production-XXXX.up.railway.app,https://backend-production-77f7.up.railway.app" --service backend
```

### Issue: Service Not Found
**Solution**: Ensure service name is exactly "frontend" (lowercase)

---

## ✨ Ready to Deploy!

**What you need to do NOW**:

1. Go to https://railway.app/dashboard
2. Create new service named "frontend"
3. Connect to khiwniti/nt-poc repository
4. Select Dockerfile builder
5. Set Dockerfile path: services/frontend/Dockerfile
6. Tell me: "Frontend service created"

**Then I'll handle everything else automatically using MCP tools!**

---

## 📞 Questions?

If you get stuck:
1. Check that service name is exactly "frontend"
2. Ensure Dockerfile builder is selected (not NIXPACKS)
3. Verify Dockerfile path: services/frontend/Dockerfile
4. Make sure you're in production environment

Once you confirm the service is created, I'll deploy it immediately! 🚀