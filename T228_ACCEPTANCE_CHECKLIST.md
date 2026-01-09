# T228: Continuous Deployment Setup - Acceptance Checklist

## Task Overview
Set up continuous deployment with GitHub Actions deploying to Railway on main branch merges.

## Acceptance Criteria

### ✅ 1. GitHub Actions CD Workflow
- [x] Created `.github/workflows/cd-railway.yml`
- [x] Configured for push to `main` branch
- [x] Manual dispatch option available
- [x] Node.js 20 setup
- [x] Dependency caching configured
- [x] Test execution before deployment
- [x] Build step for frontend
- [x] Deployment tagging implemented

**Files Created**:
- `.github/workflows/cd-railway.yml` (152 lines)

### ✅ 2. Deploy on Main Branch Push
- [x] Trigger configured: `push: branches: [main]`
- [x] Automatic deployment on merge to main
- [x] Manual trigger available via `workflow_dispatch`
- [x] Environment protection set to `production`

**Configuration**:
```yaml
on:
  push:
    branches:
      - main
  workflow_dispatch:
```

### ✅ 3. Railway CLI Integration
- [x] Railway CLI installation in workflow
- [x] Authentication via `RAILWAY_TOKEN` secret
- [x] Backend service deployment: `railway up --service backend`
- [x] Frontend service deployment: `railway up --service frontend`
- [x] Detached mode for non-blocking deploys
- [x] Railway configuration file created

**Files Created**:
- `railway.toml` (Railway configuration)

**Commands Used**:
```bash
railway up --service backend --detach
railway up --service frontend --detach
railway run -s backend npm run migrate
```

### ✅ 4. Automated Database Migrations
- [x] Migration step after backend deployment
- [x] Uses existing `migrate.ts` script
- [x] Runs via Railway CLI: `railway run -s backend npm run migrate`
- [x] Rollback script available: `migrate:rollback`
- [x] Migration status checking: `migrate:status`
- [x] Error handling for failed migrations

**Workflow Step**:
```yaml
- name: Run database migrations
  working-directory: services/backend
  run: railway run -s backend npm run migrate
  env:
    RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

**Existing Migration Scripts**:
- `services/backend/scripts/migrate.ts`
- `services/backend/scripts/migrate-rollback.ts`
- `services/backend/scripts/migrate-status.ts`

### ✅ 5. Zero-Downtime Deployments
- [x] Railway native feature (builds new version in parallel)
- [x] Health check configuration in `railway.toml`
- [x] Health check endpoint: `/api/v1/health`
- [x] Timeout: 100 seconds
- [x] Traffic switches only when healthy
- [x] Old version kept running until new version ready
- [x] Post-deployment health verification in workflow

**Health Check Configuration**:
```toml
[deploy]
healthcheckPath = "/api/v1/health"
healthcheckTimeout = 100
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
```

**Workflow Verification**:
```yaml
- name: Wait for deployment health check
  run: |
    for i in {1..10}; do
      if curl -f -s -o /dev/null https://nt-poc-backend-production.up.railway.app/api/v1/health; then
        echo "✅ Health check passed"
        exit 0
      fi
      sleep 10
    done
    exit 1
```

### ✅ 6. Rollback Mechanism
- [x] Dedicated rollback workflow created
- [x] Manual trigger via GitHub Actions UI
- [x] Service selection: backend, frontend, or all
- [x] Automatic previous deployment detection
- [x] Database migration rollback included
- [x] Health check after rollback
- [x] Rollback tagging for tracking
- [x] Railway CLI rollback command integration

**Files Created**:
- `.github/workflows/rollback.yml` (103 lines)

**Rollback Features**:
```yaml
inputs:
  service:
    type: choice
    options: [all, backend, frontend]
  tag:
    type: string
    required: false
```

**Rollback Steps**:
1. Get previous deployment tag
2. Rollback selected services via Railway CLI
3. Rollback database migrations if backend
4. Verify health checks
5. Create rollback tag

## Files Created/Modified

### Created Files:
1. `.github/workflows/cd-railway.yml` - Main CD workflow
2. `.github/workflows/rollback.yml` - Rollback workflow
3. `railway.toml` - Railway configuration
4. `T228_QUICK_REFERENCE.md` - Documentation
5. `T228_ACCEPTANCE_CHECKLIST.md` - This file

### Modified Files:
1. `services/backend/package.json` - Added `start` script

**Change Made**:
```json
"scripts": {
  "start": "node dist/index.js",  // Added for production
  ...
}
```

## Required GitHub Secrets

The following secret must be added to GitHub repository:

```
RAILWAY_TOKEN=<railway-api-token>
```

**To obtain token**:
```bash
railway login
railway whoami --token
```

## Railway Service Requirements

### Backend Service
- Service name: `backend`
- Root directory: `services/backend`
- Build command: `npm ci && npm run build`
- Start command: `npm start`

### Frontend Service
- Service name: `frontend`
- Root directory: `services/frontend`
- Build command: `npm ci && npm run build`

## Deployment Flow

```
Merge to main
    ↓
Trigger CD workflow
    ↓
Run tests (backend + frontend)
    ↓
Build frontend
    ↓
Deploy backend to Railway
    ↓
Run database migrations
    ↓
Deploy frontend to Railway
    ↓
Health check verification
    ↓
Create deployment tag
    ↓
✅ Deployment complete
```

## Rollback Flow

```
Manual trigger via GitHub Actions
    ↓
Select service (all/backend/frontend)
    ↓
Get previous deployment tag
    ↓
Rollback service(s) via Railway
    ↓
Rollback migrations (if backend)
    ↓
Verify health checks
    ↓
Create rollback tag
    ↓
✅ Rollback complete
```

## Testing Checklist

### Pre-Deployment Testing
- [ ] Add RAILWAY_TOKEN to GitHub Secrets
- [ ] Configure Railway services (backend, frontend)
- [ ] Verify Railway project linked
- [ ] Test health endpoint locally

### Deployment Testing
- [ ] Create test PR and merge to main
- [ ] Verify workflow triggers automatically
- [ ] Check all tests pass
- [ ] Verify backend deploys successfully
- [ ] Verify migrations run
- [ ] Verify frontend deploys
- [ ] Verify health checks pass
- [ ] Verify deployment tag created

### Rollback Testing
- [ ] Trigger rollback workflow manually
- [ ] Select service to rollback
- [ ] Verify rollback executes
- [ ] Verify health checks pass after rollback
- [ ] Verify rollback tag created

## Deployment Tags

### Format
- Deployment: `deploy-YYYYMMDD-HHMMSS`
- Rollback: `rollback-YYYYMMDD-HHMMSS`

### Usage
```bash
# List all deployments
git tag -l "deploy-*" --sort=-version:refname

# Get latest deployment
git tag -l "deploy-*" --sort=-version:refname | head -1

# List rollbacks
git tag -l "rollback-*" --sort=-version:refname
```

## Monitoring

### GitHub Actions
- Navigate to Actions tab
- View workflow runs and logs
- Check deployment status

### Railway Dashboard
- View deployment logs
- Monitor service health
- Check resource usage

### Health Endpoint
```bash
curl https://nt-poc-backend-production.up.railway.app/api/v1/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2026-01-09T18:15:00.000Z"
}
```

## Cron Jobs (via Railway)

Configured in `railway.toml`:
- Daily database backup: `0 2 * * *`
- Backup monitoring: `0 */6 * * *`

## Success Metrics

- ✅ All 6 acceptance criteria met
- ✅ CD workflow ready for use
- ✅ Rollback mechanism in place
- ✅ Zero-downtime deployment support
- ✅ Automated migrations configured
- ✅ Comprehensive documentation provided

## Next Steps

1. Add RAILWAY_TOKEN to GitHub Secrets
2. Configure Railway services
3. Test deployment with sample PR
4. Verify health checks
5. Test rollback mechanism
6. Monitor first production deployment

## References

- Railway Documentation: https://docs.railway.app
- GitHub Actions Documentation: https://docs.github.com/actions
- Related Tasks: T235 (Production Deployment)
