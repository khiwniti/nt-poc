# Railway Build Failures - Troubleshooting Guide

## Quick Diagnosis

Run this script to check for common issues:
```bash
./diagnose-railway-build.sh
```

## Common Issues & Fixes

### Issue #1: "Cannot find module" or "Module not found"

**Symptoms:** Build fails with messages like:
- `Error: Cannot find module 'express'`
- `ModuleNotFoundError: No module named 'fastapi'`

**Fixes:**

For Node.js services:
```bash
# In railway.toml, ensure buildCommand uses npm ci (not npm install)
buildCommand = "npm ci && npm run build"

# If still failing, try:
buildCommand = "npm ci --production=false && npm run build"
```

For Python services:
```bash
# Ensure requirements.txt is in the service root
buildCommand = "pip install --upgrade pip && pip install -r requirements.txt"
```

---

### Issue #2: "tsc: command not found" or TypeScript errors

**Symptoms:**
- `sh: tsc: command not found`
- TypeScript compilation errors during build

**Fix:**
```bash
# Ensure typescript is in devDependencies
cd services/backend  # or frontend/line-bot
npm install --save-dev typescript
```

Or update buildCommand in railway.toml:
```toml
buildCommand = "npm ci && npx tsc"
```

---

### Issue #3: "ENOENT: no such file or directory"

**Symptoms:**
- `ENOENT: no such file or directory, open '/app/dist/index.js'`
- Build succeeds but start fails

**Fix:**

Check that `build` script in package.json outputs to correct directory:
```json
{
  "scripts": {
    "build": "tsc",  // Outputs to dist/
    "start": "node dist/index.js"
  }
}
```

Ensure tsconfig.json has:
```json
{
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  }
}
```

---

### Issue #4: Monorepo detection issues

**Symptoms:**
- Railway tries to build from root instead of service directory
- `package.json` not found errors

**Fix Option 1** - Add root field to railway.toml:
```toml
[[services]]
name = "backend"
source = "services/backend"

[services.build]
builder = "NIXPACKS"
buildCommand = "npm ci && npm run build"
watchPatterns = ["services/backend/**"]
```

**Fix Option 2** - Use explicit paths in buildCommand:
```toml
buildCommand = "cd /app && npm ci && npm run build"
```

---

### Issue #5: Python version mismatch

**Symptoms:**
- `ModuleNotFoundError` in Python services
- `SyntaxError: invalid syntax` for modern Python features

**Fix:**

Add `runtime.txt` in services/mlops/ and services/simulator/:
```
python-3.11
```

Or specify in requirements.txt header:
```
# Python >=3.10 required
fastapi==0.104.1
uvicorn==0.24.0
...
```

---

### Issue #6: Environment variables not available during build

**Symptoms:**
- Build fails when trying to access DATABASE_URL or other runtime vars
- `${{Postgres.DATABASE_URL}}` is undefined

**Fix:**

Railway provides env vars at RUNTIME, not BUILD time. 

If your build process needs env vars:
1. Move the logic to runtime (start command)
2. Or use Railway's "Build Variables" (separate from regular variables)

Example - Don't do database migrations in build:
```toml
# ❌ BAD
buildCommand = "npm ci && npm run build && npm run migrate"

# ✅ GOOD
buildCommand = "npm ci && npm run build"
startCommand = "npm run migrate && npm start"
```

---

### Issue #7: Frontend build runs out of memory

**Symptoms:**
- `FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory`
- Frontend build hangs or times out

**Fix:**

Increase Node.js memory limit in buildCommand:
```toml
[[services]]
name = "frontend"
source = "services/frontend"

[services.build]
buildCommand = "export NODE_OPTIONS='--max-old-space-size=4096' && npm ci && npm run build"
```

---

### Issue #8: "Failed to load 'railway.toml'"

**Symptoms:**
- Railway can't parse the configuration file
- Syntax errors in railway.toml

**Fix:**

Validate TOML syntax:
```bash
# Install toml-cli
npm install -g @iarna/toml

# Validate
cat railway.toml | toml-cli parse
```

Common TOML mistakes:
- Missing quotes around strings with special chars
- Incorrect array syntax
- Duplicate keys

---

## Debugging Steps

### 1. Check Railway Dashboard Logs

1. Go to Railway Dashboard
2. Click on the failing service
3. Click "Deployments" tab
4. Click the failed deployment
5. Read the build logs carefully

### 2. Test Build Locally

```bash
# Node.js service
cd services/backend
npm ci
npm run build
npm start

# Python service
cd services/mlops
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn src.main:app --port 8001
```

### 3. Check Railway Build Command Manually

```bash
# Backend
cd services/backend
npm ci && npm run build

# Frontend
cd services/frontend
npm ci && npm run build

# MLOps
cd services/mlops
pip install -r requirements.txt

# Simulator
cd services/simulator
pip install -r requirements.txt
```

### 4. Verify File Structure

```bash
# Check all required files exist
./diagnose-railway-build.sh
```

---

## Get Help

If none of these fixes work:

1. **Share the full build logs** - Copy from Railway Dashboard
2. **Check Railway Status** - https://status.railway.app/
3. **Railway Discord** - https://discord.gg/railway
4. **Railway GitHub** - https://github.com/railwayapp/nixpacks/issues

---

## Quick Fix Commands

```bash
# Regenerate package-lock.json
cd services/backend && rm -f package-lock.json && npm install

# Clear Railway cache (redeploy)
railway up --force

# Manual deployment test
railway run npm ci && npm run build

# Check environment variables
railway variables

# View service logs
railway logs
```

---

## Prevention Tips

1. ✅ Always test builds locally before deploying
2. ✅ Use `npm ci` instead of `npm install` in production
3. ✅ Pin dependency versions in package.json
4. ✅ Keep TypeScript and build tools in devDependencies
5. ✅ Don't run database operations during build
6. ✅ Use health checks for all services
7. ✅ Monitor Railway build times and memory usage

