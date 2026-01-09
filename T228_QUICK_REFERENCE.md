# T228: Continuous Deployment Setup - Quick Reference

## Overview
GitHub Actions CD workflow for automated Railway deployments on main branch merges.

## Workflows Created

### 1. CD Railway Workflow (`.github/workflows/cd-railway.yml`)
**Trigger**: Push to `main` branch or manual dispatch

**Steps**:
1. Checkout code and setup Node.js
2. Install Railway CLI
3. Install dependencies (backend + frontend)
4. Run tests (backend + frontend)
5. Build frontend for production
6. Deploy backend to Railway
7. Run database migrations
8. Deploy frontend to Railway
9. Health check verification
10. Create deployment tag

**Environment Variables Required**:
- `RAILWAY_TOKEN`: Railway API token (stored in GitHub Secrets)

### 2. Manual Rollback Workflow (`.github/workflows/rollback.yml`)
**Trigger**: Manual dispatch only

**Inputs**:
- `service`: Choose backend, frontend, or all
- `tag`: Optional deployment tag to rollback to

**Steps**:
1. Get previous deployment tag
2. Rollback selected services
3. Rollback database migrations (if backend)
4. Verify health checks
5. Create rollback tag

## Files Modified/Created

### Created:
- `.github/workflows/cd-railway.yml` - Main CD workflow
- `.github/workflows/rollback.yml` - Rollback workflow
- `railway.toml` - Railway configuration

### Modified:
- `services/backend/package.json` - Added `start` script for production

## GitHub Secrets Setup

Add to repository settings → Secrets → Actions:

```
RAILWAY_TOKEN=<your-railway-token>
```

Get token from Railway:
```bash
railway login
railway whoami --token
```

## Railway Service Configuration

### Backend Service
- **Name**: `backend`
- **Build Command**: `cd services/backend && npm ci && npm run build`
- **Start Command**: `cd services/backend && npm start`
- **Health Check**: `/api/v1/health`

### Frontend Service
- **Name**: `frontend`
- **Build Command**: `cd services/frontend && npm ci && npm run build`
- **Start Command**: Served via Railway's static hosting

## Zero-Downtime Deployment

Railway provides zero-downtime deployments by:
1. Building new version in parallel
2. Running health checks
3. Switching traffic only when healthy
4. Keeping old version running until new one is ready

## Database Migration Strategy

Migrations run automatically after backend deployment:
```bash
railway run -s backend npm run migrate
```

For rollback:
```bash
railway run -s backend npm run migrate:rollback
```

## Deployment Process

### Automatic Deployment
1. Merge PR to `main` branch
2. Workflow triggers automatically
3. Tests run before deployment
4. Backend deployed first
5. Migrations run
6. Frontend deployed
7. Health checks verify
8. Deployment tag created

### Manual Deployment
1. Go to Actions → CD Railway
2. Click "Run workflow"
3. Select `main` branch
4. Click "Run workflow"

### Rollback Process
1. Go to Actions → Manual Rollback
2. Click "Run workflow"
3. Select service to rollback
4. Optionally specify deployment tag
5. Click "Run workflow"

## Health Check URLs

Backend: `https://nt-poc-backend-production.up.railway.app/api/v1/health`

Response should be:
```json
{
  "status": "healthy",
  "timestamp": "2026-01-09T18:15:00.000Z"
}
```

## Monitoring Deployment

### View Logs in GitHub Actions
1. Go to Actions tab
2. Click on workflow run
3. Click on job to see logs

### View Logs in Railway
```bash
railway logs -s backend
railway logs -s frontend
```

## Deployment Tags

Tags created automatically:
- `deploy-YYYYMMDD-HHMMSS` - Successful deployment
- `rollback-YYYYMMDD-HHMMSS` - Rollback executed

View tags:
```bash
git tag -l "deploy-*"
git tag -l "rollback-*"
```

## Cron Jobs

Configured in `railway.toml`:
- **Daily Backup**: 2:00 AM UTC
- **Backup Monitoring**: Every 6 hours

## Troubleshooting

### Deployment Fails
1. Check workflow logs in GitHub Actions
2. Verify Railway token is valid
3. Check Railway service status
4. Review health check endpoint

### Migration Fails
1. Check migration files for errors
2. Verify database connection
3. Review migration logs in Railway
4. Consider manual rollback

### Health Check Fails
1. Check backend logs: `railway logs -s backend`
2. Verify environment variables
3. Test health endpoint manually
4. Check database connectivity

## Commands Reference

### Railway CLI
```bash
# Login
railway login

# Link project
railway link

# Deploy service
railway up -s backend

# Run migrations
railway run -s backend npm run migrate

# View logs
railway logs -s backend --tail

# Rollback
railway rollback -s backend -y
```

### Git Tags
```bash
# List deployment tags
git tag -l "deploy-*" --sort=-version:refname

# Get latest deployment
git tag -l "deploy-*" --sort=-version:refname | head -1

# View tag details
git show deploy-20260109-181500
```

## Acceptance Criteria Status

- [x] GitHub Actions CD workflow created
- [x] Deploy on main branch push configured
- [x] Railway CLI integration implemented
- [x] Automated database migrations included
- [x] Zero-downtime deployments (Railway native feature)
- [x] Rollback mechanism implemented

## Next Steps

1. Add Railway token to GitHub Secrets
2. Configure Railway services (backend, frontend)
3. Test deployment with sample PR
4. Verify health checks pass
5. Test rollback mechanism
6. Monitor first production deployment

## Related Files

- `services/backend/scripts/migrate.ts` - Migration script
- `services/backend/scripts/migrate-rollback.ts` - Rollback script
- `production-deploy.sh` - Manual deployment script
- `production-rollback.sh` - Manual rollback script
