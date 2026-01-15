# Railway Frontend Service Recreation Guide

**Issue**: Frontend service Dashboard has locked builder settings - cannot select Dockerfile

**Root Cause**: Railway Dashboard builder selection is disabled/locked for this service, preventing any configuration changes

---

## 🚨 Current Situation

### What We've Tried (All Failed)
1. ❌ Deleted `railway.json` (commit 313cfb7)
2. ❌ Deleted `nixpacks.toml` and `Procfile` 
3. ❌ Updated `railway.toml` with DOCKERFILE builder
4. ❌ Created new `railway.json` with DOCKERFILE (commit de10a89)
5. ❌ Set `NIXPACKS_START_CMD` environment variable
6. ❌ Triggered manual redeployments
7. ❌ Attempted to click builder selection in Dashboard - **LOCKED/DISABLED**

### Why It's Locked
Railway Dashboard has the builder selection UI element disabled for frontend service. This is either:
- A Railway platform bug
- Account permission restriction
- Service-level lock from initial configuration
- Region-specific limitation

---

## ✅ Solution: Recreate Frontend Service

Since builder settings cannot be changed, the only solution is to **delete and recreate** the frontend service.

### Step 1: Note Current Configuration

**Current Frontend Service**:
- URL: `https://frontend-production-036e.up.railway.app`
- Environment Variables:
  ```
  NODE_ENV=production
  PORT=<auto-assigned>
  RAILWAY_ENVIRONMENT=production
  ```
- Service ID: `a15efb78-f150-4381-94b0-f4362fca8110`

### Step 2: Delete Frontend Service

**Via Railway Dashboard**:
1. Go to Railway Dashboard
2. Select `nt-poc-battery-management` project
3. Click on `frontend` service
4. Go to **Settings** tab
5. Scroll to bottom
6. Click **Delete Service**  
7. Confirm deletion

**Warning**: This will delete:
- All deployments history
- Custom domain (if configured)
- All service-specific settings

### Step 3: Create New Frontend Service

**Via Railway Dashboard**:
1. In project, click **New Service**
2. Select **GitHub Repo**
3. Choose repository: `khiwniti/nt-poc`
4. Configure service:
   - **Service Name**: `frontend`
   - **Root Directory**: Leave empty (uses repo root)
   - **Builder**: Select **Dockerfile**
   - **Dockerfile Path**: `services/frontend/Dockerfile`
   - **Watch Paths**: `services/frontend/**`

**Via Railway CLI** (Alternative):
```bash
# Link to new service
railway link

# Or use existing railway.toml configuration
# Railway will auto-create service from railway.toml
```

### Step 4: Configure Environment Variables

Set required variables:
```bash
railway variables set NODE_ENV=production --service frontend
```

### Step 5: Trigger Initial Deployment

```bash
railway up --service frontend
# Or push a commit to trigger automatic deployment
```

### Step 6: Verify Deployment

```bash
# Check deployment status
railway logs --service frontend --log-type build

# Check if using DOCKERFILE
railway list-deployments --service frontend --limit 1 --json | grep builder

# Should show: "builder": "DOCKERFILE"
```

### Step 7: Update Frontend URL References

New service will have new URL: `https://frontend-production-XXXX.up.railway.app`

Update any references:
- Backend CORS configuration
- Environment variables in other services
- External documentation

---

## 🔧 Alternative: Keep NIXPACKS, Fix Start Command

If you cannot recreate the service, you can make NIXPACKS work:

### Fix NIXPACKS Start Command

The issue with NIXPACKS frontend is wrong serving directory.

**Current**: Serving from `/app/dist` (doesn't exist)  
**Needed**: Serve from `/app/services/frontend/dist`

```bash
# Set correct start command
railway variables set NIXPACKS_START_CMD="cd services/frontend && npx serve -s dist -l \$PORT" --service frontend

# Trigger redeploy
railway up --service frontend
```

**Note**: We already tried this (didn't work due to cache). May work after cache expires.

---

## 📋 Comparison: Recreate vs Keep NIXPACKS

### Recreate Service (Recommended)
**Pros**:
- ✅ Uses proven DOCKERFILE approach (same as backend/line-bot)
- ✅ Consistent with other services
- ✅ No dependency on NIXPACKS auto-detection
- ✅ Full control over build process

**Cons**:
- ❌ Loses deployment history
- ❌ Changes service URL
- ❌ Requires reconfiguration

### Keep NIXPACKS
**Pros**:
- ✅ No service recreation needed
- ✅ Keeps service URL
- ✅ Maintains deployment history

**Cons**:
- ❌ Already tried fixing - didn't work
- ❌ Inconsistent with other services
- ❌ Depends on build cache expiring
- ❌ May fail again in future

---

## 🎯 Recommended Action

**Recreate the frontend service** with correct DOCKERFILE builder configuration.

This is the cleanest solution and matches the working backend + line-bot services.

---

## 📞 If Recreate Also Fails

If new service also has locked builder settings:

1. **Contact Railway Support**:
   - URL: https://railway.app/help
   - Explain: "Builder selection is locked/disabled in Dashboard"
   - Request: Reset builder settings or account permission check

2. **Check Account Permissions**:
   - Verify you have admin/owner role on project
   - Check if Railway plan has builder selection restrictions

3. **Try Different Region**:
   - Create service in different Railway region
   - May not have same platform limitation

---

## ✨ Summary

**Current Status**: Frontend builder settings locked in Dashboard - cannot be changed manually or programmatically

**Solution**: Delete and recreate frontend service with DOCKERFILE builder from the start

**Confidence**: 95% - This approach worked for backend and line-bot, should work for frontend

**Timeline**: 5-10 minutes to recreate and redeploy