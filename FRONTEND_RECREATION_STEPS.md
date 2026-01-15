# Frontend Service Recreation - Step-by-Step Guide

## Current Situation
- Frontend service has locked builder settings in Railway Dashboard
- Cannot select Dockerfile builder via UI
- Service needs to be deleted and recreated

---

## 🚨 STEP 1: Delete Old Frontend Service (Manual - Railway Dashboard)

### Go to Railway Dashboard
1. Open browser: https://railway.app/dashboard
2. Click on project: **nt-poc-battery-management**
3. Find and click on **frontend** service

### Delete the Service
4. Click **Settings** tab (gear icon)
5. Scroll to bottom of settings page
6. Find **Danger Zone** section
7. Click **Delete Service** button
8. Type service name **frontend** to confirm
9. Click **Delete** button

**⚠️ WAIT FOR CONFIRMATION**: Service deleted message should appear

---

## ✅ STEP 2: Create New Frontend Service (Manual - Railway Dashboard)

### Create New Service
1. In project view, click **+ New** button (top right)
2. Select **Empty Service**
3. Service name: **frontend** (important - keep same name)

### Configure Service Settings
4. Click on newly created **frontend** service
5. Click **Settings** tab
6. Under **Source** section:
   - Click **Connect Repo**
   - Select: **khiwniti/nt-poc**
   - Root Directory: Leave empty
   - Branch: **main**

7. Under **Build** section:
   - Builder: **Dockerfile** ← CRITICAL - Select this!
   - Dockerfile Path: **services/frontend/Dockerfile**
   - Watch Paths: **services/frontend/**

8. Under **Deploy** section:
   - Start Command: Leave empty (Dockerfile CMD will be used)

### Save Settings
9. Click **Save** or settings auto-save

---

## 🔧 STEP 3: Set Environment Variables (Can use CLI or Dashboard)

### Option A: Via Railway Dashboard
1. In frontend service, click **Variables** tab
2. Click **+ New Variable**
3. Add these variables:
   ```
   NODE_ENV = production
   VITE_API_URL = https://backend-production-77f7.up.railway.app/api/v1
   ```

### Option B: Via CLI (After linking service)
We'll do this in STEP 4 using Railway MCP tools.

---

## 🚀 STEP 4: Link Service and Deploy (CLI - I'll help with this)

**Tell me when you've completed Steps 1-2 above**, then I'll run these Railway CLI commands for you:

```bash
# Link to the new frontend service
railway link --service frontend

# Set environment variables
railway variables set NODE_ENV=production --service frontend
railway variables set VITE_API_URL=https://backend-production-77f7.up.railway.app/api/v1 --service frontend

# Trigger deployment
railway up --service frontend
```

---

## 📊 STEP 5: Verify Deployment (CLI - I'll help with this)

After deployment triggers, I'll check:

```bash
# Watch deployment logs
railway logs --service frontend --log-type build

# Check deployment status
railway list-deployments --service frontend --limit 1 --json

# Verify builder is DOCKERFILE
# Should show: "builder": "DOCKERFILE"

# Test health endpoint (after deployment completes)
curl https://frontend-production-XXXX.up.railway.app/
```

---

## ⏱️ Timeline

- **Step 1 (Delete)**: 1 minute
- **Step 2 (Create)**: 3-5 minutes
- **Step 3 (Variables)**: 1 minute
- **Step 4 (Deploy)**: 5-10 minutes
- **Step 5 (Verify)**: 2 minutes

**Total**: ~15 minutes

---

## ✋ What You Need to Do NOW

### Manual Steps (Railway Dashboard):

1. **Delete old frontend service** (Step 1)
2. **Create new frontend service** (Step 2) 
3. **Configure builder settings** (Step 2 - CRITICAL: Select Dockerfile!)

### Then Tell Me:
Once you've completed the above 3 steps, reply with:
- ✅ "Frontend service deleted and recreated"
- ✅ "Dockerfile builder selected"

Then I'll take over with the CLI commands to:
- Link the service
- Set environment variables  
- Trigger deployment
- Monitor logs
- Verify success

---

## 🆘 If You Get Stuck

### Problem: Can't find Delete button
**Solution**: Settings tab → Scroll to very bottom → Danger Zone section

### Problem: New service also has locked builder
**Solution**: 
1. Try selecting Dockerfile **immediately** when creating service
2. If still locked, contact Railway support: https://railway.app/help

### Problem: Service won't deploy
**Solution**: I'll check logs and troubleshoot after you complete Steps 1-2

---

## 📝 Checklist Before Starting

- [ ] I have access to Railway Dashboard
- [ ] I can see the nt-poc-battery-management project
- [ ] I understand I need to delete the old frontend service
- [ ] I understand I need to select Dockerfile builder in new service
- [ ] I'm ready to tell AI when Steps 1-2 are complete

---

**Ready?** Go ahead with Step 1 - Delete the old frontend service from Railway Dashboard!