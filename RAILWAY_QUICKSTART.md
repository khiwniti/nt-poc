# Railway Quick Reference

**Quick commands for deploying and managing NT-POC on Railway**

## Initial Setup (One-time)

```bash
# 1. Login to Railway
railway login

# 2. Initialize project
railway init --name nt-poc-battery-management

# OR link existing project
railway link

# 3. Add database plugins
railway add --database postgres
railway add --database redis

# 4. Enable TimescaleDB
railway connect Postgres
# In psql: CREATE EXTENSION IF NOT EXISTS timescaledb;
```

## Deploy All Services

```bash
# Automated deployment (recommended)
./deploy-railway.sh

# OR deploy individually
railway up --service backend
railway up --service frontend
railway up --service mlops
railway up --service simulator
railway up --service line-bot
```

## Environment Variables

```bash
# Generate JWT secret
openssl rand -base64 32

# Set backend variables
railway variables set --service backend \
  NODE_ENV=production \
  JWT_SECRET="<generated-secret>" \
  DB_SSL=true

# Link database
railway variables set --service backend \
  'DATABASE_URL=${{Postgres.DATABASE_URL}}'

# List all variables
railway variables --service backend
```

## Database Migrations

```bash
# Run migrations after first deployment
railway run --service backend npm run migrate

# Check migration status
railway run --service backend npm run migrate:status

# Rollback migration
railway run --service backend npm run migrate:rollback
```

## Monitoring & Debugging

```bash
# Check deployment status
railway status

# View logs (all services)
railway logs

# View logs (specific service)
railway logs --service backend

# Stream logs live
railway logs --service backend --follow

# Get service URLs/domains
railway domain

# SSH into service
railway shell backend
```

## Testing Deployed Services

```bash
# Get your Railway domains first
railway domain

# Test health endpoints
curl https://<backend-domain>/api/v1/health
curl https://<mlops-domain>/health
curl https://<simulator-domain>/api/health
curl https://<line-bot-domain>/health

# Test frontend
open https://<frontend-domain>
```

## Common Tasks

```bash
# Restart service
railway restart --service backend

# Scale service
railway service scale --service backend --replicas 2

# View service metrics
railway metrics --service backend

# Update service variables
railway variables set --service backend LOG_LEVEL=debug

# Delete service
railway down --service simulator

# Unlink project
railway unlink
```

## Troubleshooting

```bash
# Check build logs
railway logs --service backend --build

# View last deployment
railway status --service backend

# Connect to database
railway connect Postgres

# Run command in service
railway run --service backend npm run typecheck

# Environment info
railway environment
```

## Service URLs (Internal Networking)

Use these URLs for service-to-service communication:

```bash
Backend → MLOps:      http://mlops.railway.internal:8000
Backend → Simulator:  http://simulator.railway.internal:8001
LINE Bot → Backend:   http://backend.railway.internal:3000
```

## Important Notes

1. **First deployment:** Run migrations after backend deploys
2. **TimescaleDB:** Must enable extension manually in Postgres
3. **LINE webhook:** Update LINE Console with Railway domain
4. **Frontend API:** Set VITE_API_BASE_URL to backend domain
5. **Internal networking:** Use `.railway.internal` between services

## Configuration Files

- `railway.toml` - Service definitions and deployment config
- `RAILWAY_DEPLOYMENT_GUIDE.md` - Complete documentation
- `deploy-railway.sh` - Automated deployment script

## Support

- Docs: https://docs.railway.app
- Discord: https://discord.gg/railway
- Status: https://status.railway.app
