# Railway CLI Quick Reference - NT-POC

## ✅ What Railway CLI CAN Do

### Check Project Status
```bash
railway status
# Shows: Current project, environment, and linked service
```

### Link to Different Services
```bash
# Link to backend
railway link --service backend

# Link to LINE-bot
railway link --service line-bot

# Link to frontend (after recreation)
railway link --service frontend

# Link to mlops (after recreation)
railway link --service mlops

# Link to simulator (after recreation)
railway link --service simulator
```

### View Environment Variables
```bash
# Show all variables for currently linked service
railway variables

# Show in key=value format
railway variables --kv

# Show as JSON
railway variables --json
```

### Set Environment Variables
```bash
# Set single variable
railway variables set NODE_ENV=production

# Set multiple variables
railway variables set KEY1=value1 KEY2=value2

# Set variable for specific service
railway variables set DATABASE_URL=xxx --service backend
```

### View Logs
```bash
# Stream logs (real-time)
railway logs

# Show last 100 lines
railway logs --limit 100

# Show build logs
railway logs --type build

# Show deployment logs
railway logs --type deploy
```

###List Deployments
```bash
# Show recent deployments (if supported in your CLI version)
railway deployments list --limit 10

# Show deployment details
railway deployments get <deployment-id>
```

### Deploy Services
```bash
# Deploy current directory (triggers new deployment)
railway up

# Deploy specific service
railway up --service backend
```

### Run Commands with Railway Environment
```bash
# Run command with Railway env vars injected
railway run <command>

# Example: Check Node version with Railway env
railway run node --version

# Example: Run npm script with Railway env
railway run npm run migrate
# ⚠️ Note: This won't work for migrations due to internal DATABASE_URL
```

### Connect to Database
```bash
# Connect to PostgreSQL database
railway connect

# This opens psql shell connected to your Railway database
# ⚠️ Only works if database service is configured
```

---

## ❌ What Railway CLI CANNOT Do

### Cannot Delete Services
```bash
# ❌ No command to delete services
# ✅ Must use Railway Dashboard
```

###Cannot Create New Services
```bash
# ❌ No command to create services
# ✅ Must use Railway Dashboard
```

### Cannot Change Builder Settings
```bash
# ❌ Cannot switch from NIXPACKS to DOCKERFILE via CLI
# ✅ Must use Railway Dashboard or recreate service
```

### Cannot Run Migrations from Local Machine
```bash
# ❌ railway run npm run migrate
# Fails because DATABASE_URL uses postgres.railway.internal
# ✅ Must use Railway Dashboard "Run Command" feature
```

---

## 🎯 Common Use Cases

### 1. Check Backend Status
```bash
railway link --service backend
railway status
railway logs --limit 50
```

### 2. View Backend Environment
```bash
railway link --service backend
railway variables
```

### 3. Update Environment Variable
```bash
railway link --service backend
railway variables set NEW_VARIABLE=value
```

### 4. Monitor Deployment
```bash
railway link --service backend
railway logs
# Keep terminal open to watch logs in real-time
```

### 5. Deploy After Code Changes
```bash
railway link --service backend
railway up
# This triggers new deployment from current git commit
```

---

## 📚 Your Current Project

**Project**: nt-poc-battery-management  
**Environment**: production

**Working Services**:
- ✅ backend (https://backend-production-77f7.up.railway.app)
- ✅ line-bot (https://line-bot-production-8114.up.railway.app)

**Needs Recreation**:
- ⏳ frontend (builder locked)
- ⏳ mlops (builder locked)
- ⏳ simulator (builder locked)

---

## 🚀 Quick Commands for Your Project

### Check Backend Logs
```bash
railway link --service backend && railway logs --limit 100
```

### Check LINE-bot Logs
```bash
railway link --service line-bot && railway logs --limit 100
```

### View Backend Variables
```bash
railway link --service backend && railway variables
```

### Trigger Backend Redeploy
```bash
railway link --service backend && railway up
```

---

## ⚠️ Important Notes

### 1. DATABASE_URL Uses Internal Networking
```
DATABASE_URL=postgresql://...@postgres.railway.internal:5432/railway
                           ^^^^^^^^^^^^^^^^^^^^^^^^^^^
                           Only accessible within Railway network!
```

**This means**:
- `railway run npm run migrate` will FAIL from local machine
- Migrations must be run from Railway Dashboard
- Use "Run Command" feature in Dashboard

### 2. Service Recreation Must Be Done via Dashboard
To recreate frontend/mlops/simulator:
1. Go to https://railway.app/dashboard
2. Delete old service
3. Create new service
4. Select Dockerfile builder
5. Configure and deploy

### 3. Railway CLI Cannot Fix Builder Lock
The Dashboard builder lock can only be resolved by:
- Deleting and recreating service
- OR Contacting Railway support

---

## 📖 Full Documentation

For detailed instructions, see:

- [`FRONTEND_RECREATION_STEPS.md`](FRONTEND_RECREATION_STEPS.md:1) - Frontend service recreation
- [`RAILWAY_MLOPS_SIMULATOR_RECREATION_GUIDE.md`](RAILWAY_MLOPS_SIMULATOR_RECREATION_GUIDE.md:1) - Python services
- [`DATABASE_MIGRATION_RAILWAY_INSTRUCTIONS.md`](DATABASE_MIGRATION_RAILWAY_INSTRUCTIONS.md:1) - Database migrations
- [`LINE_OA_CONFIGURATION_GUIDE.md`](LINE_OA_CONFIGURATION_GUIDE.md:1) - LINE webhook setup

---

## 🆘 Need Help?

### Railway Documentation
https://docs.railway.app/

### Railway Support
https://railway.app/help

### CLI Help Command
```bash
railway --help
railway <command> --help
```

---

## ✨ Summary

**Railway CLI is useful for**:
- Checking status and logs
- Managing environment variables
- Triggering deployments
- Linking to services

**Railway Dashboard is required for**:
- Creating/deleting services
- Changing builder settings
- Running one-off commands (migrations)
- Viewing service metrics

**Both are needed for complete Railway management!**