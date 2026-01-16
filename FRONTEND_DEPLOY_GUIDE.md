# Frontend Service Deployment Guide

## Current Status
- Frontend service was removed from Railway
- Need to recreate and deploy with proper configuration

## Step 1: Create Frontend Service in Railway Dashboard

**MANUAL STEP REQUIRED:**

1. Open: https://railway.com/project/6eef59c3-ae94-47e1-8151-692b91e1f7f4
2. Click "+ New" button
3. Select "Empty Service"
4. Name it: **frontend**
5. Click "Settings" → Set Service Name to exactly: **frontend**

## Step 2: Deploy Frontend via CLI

Once the service is created, run:

```bash
cd /Users/khiwn/nt-poc/nt-poc
railway up --service frontend --detach
```

## Step 3: Configure Environment Variables

```bash
# Get backend URL first
BACKEND_URL=$(railway domain --service backend 2>&1 | grep -o 'https://[^[:space:]]*')

# Set frontend environment variables
railway variables --service frontend \
  --set "NODE_ENV=production" \
  --set "VITE_APP_NAME=Battery Management System" \
  --set "VITE_APP_VERSION=1.0.0" \
  --set "VITE_ENVIRONMENT=production" \
  --set "VITE_API_BASE_URL=${BACKEND_URL}/api/v1" \
  --set "VITE_ENABLE_ANALYTICS=false" \
  --set "VITE_ENABLE_DEBUG_MODE=false" \
  --set "VITE_DEFAULT_THEME=light" \
  --set "VITE_ENABLE_DARK_MODE=true" \
  --set "GENERATE_SOURCEMAP=false"
```

## Step 4: Verify Deployment

```bash
# Check deployment status
railway status

# Get frontend URL
railway domain --service frontend

# Test frontend health
FRONTEND_URL=$(railway domain --service frontend 2>&1 | grep -o 'https://[^[:space:]]*')
curl -I $FRONTEND_URL
```

## Frontend Configuration Files

### Dockerfile
- Location: `services/frontend/Dockerfile`
- Builder: Multi-stage Docker build
- Serves static files with `serve` on Railway's $PORT

### railway.toml
```toml
[[services]]
name = "frontend"

[services.build]
builder = "DOCKERFILE"
dockerfilePath = "services/frontend/Dockerfile"
watchPatterns = ["services/frontend/**"]

[services.deploy]
healthcheckPath = "/"
healthcheckTimeout = 100
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
```

### nixpacks.toml (Fallback)
```toml
[phases.setup]
nixPkgs = ["nodejs_22", "npm-9_x"]

[phases.install]
cmds = ["npm ci --cache=/tmp/.npm --prefer-offline=false"]

[phases.build]
cmds = ["npm run build"]

[start]
cmd = "npx serve -s dist -p $PORT"
```

## Troubleshooting

### If build fails:
1. Check that Dockerfile path is correct in Railway settings
2. Verify builder is set to "Dockerfile" (not Nixpacks)
3. Check build logs in Railway dashboard

### If 404 errors:
1. Verify dist directory was created during build
2. Check that serve command is using correct port: `$PORT`
3. Verify health check path is "/"

### If can't connect to backend:
1. Check VITE_API_BASE_URL is set correctly
2. Verify backend is deployed and accessible
3. Check CORS settings in backend

## Expected Result

After deployment:
- Frontend URL: https://frontend-production-[hash].up.railway.app
- Health check: ✅ Passing
- Status: 🟢 ACTIVE
- Connects to backend API successfully
