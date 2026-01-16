# Railway Multi-Service Deployment Guide

This guide explains how to deploy all services in the NT-POC Battery Management System to Railway in the same project.

## Overview

The repository contains 6 services:

1. **backend** - Express API (TypeScript/Node.js)
2. **frontend** - React + Vite (TypeScript)
3. **line-bot** - LINE Bot integration (TypeScript/Node.js)
4. **ml** - Python training pipeline (not deployed - local training only)
5. **mlops** - FastAPI model serving (Python)
6. **simulator** - FastAPI simulator (Python)

## Prerequisites

✅ Railway CLI installed: `npm i -g @railway/cli`
✅ Logged in to Railway: `railway login`
✅ Existing project: **nt-poc-battery-management**

## Quick Start

### Option 1: Automated Deployment (Recommended)

Deploy all services with one command:

```bash
./deploy-all-railway-services.sh
```

This script will:
- Deploy backend service
- Deploy frontend service  
- Deploy line-bot service
- Deploy mlops service
- Deploy simulator service
- Generate domain for frontend

### Option 2: Manual Deployment

Deploy each service individually:

#### 1. Deploy Backend

```bash
cd services/backend
railway up --service backend --environment production
cd ../..
```

#### 2. Deploy Frontend

```bash
cd services/frontend
railway up --service frontend --environment production
railway domain --service frontend  # Generate public domain
cd ../..
```

#### 3. Deploy LINE Bot

```bash
cd services/line-bot
railway up --service line-bot --environment production
cd ../..
```

#### 4. Deploy MLOps

```bash
cd services/mlops
railway up --service mlops --environment production
cd ../..
```

#### 5. Deploy Simulator

```bash
cd services/simulator
railway up --service simulator --environment production
cd ../..
```

## Verifying Deployments

### Check Status

```bash
railway status
```

### View All Services

```bash
railway service list
```

### Check Logs

```bash
# Backend logs
railway logs --service backend

# Frontend logs
railway logs --service frontend

# LINE Bot logs
railway logs --service line-bot

# MLOps logs
railway logs --service mlops

# Simulator logs
railway logs --service simulator
```

### Check Deployment History

```bash
railway deployment list --service <service-name>
```

## Environment Variables

Each service requires specific environment variables. Ensure they are set in Railway:

### Backend Variables

```bash
railway variables --service backend
```

Required:
- `DATABASE_URL` (from Postgres service)
- `REDIS_URL` (from Redis service)
- `JWT_SECRET`
- `NODE_ENV=production`
- `PORT=3000`

### Frontend Variables

```bash
railway variables --service frontend
```

Required:
- `VITE_API_URL` (backend URL)
- `VITE_CESIUM_TOKEN`
- `NODE_ENV=production`

### LINE Bot Variables

```bash
railway variables --service line-bot
```

Required:
- `LINE_CHANNEL_ACCESS_TOKEN`
- `LINE_CHANNEL_SECRET`
- `BACKEND_URL`
- `NODE_ENV=production`

### MLOps Variables

```bash
railway variables --service mlops
```

Required:
- `MODEL_PATH`
- `REDIS_URL`

### Simulator Variables

```bash
railway variables --service simulator
```

Required:
- `DATABASE_URL`
- `REDIS_URL`

## Setting Variables

### Set individual variables:

```bash
railway variables set KEY=VALUE --service <service-name>
```

### Set multiple variables:

```bash
railway variables set \
  KEY1=VALUE1 \
  KEY2=VALUE2 \
  --service <service-name>
```

## Database Setup

The project uses Postgres and Redis (already in nt-poc-battery-management):

### Run Migrations

```bash
cd services/backend
railway run npm run migrate
cd ../..
```

### Seed Database

```bash
cd services/backend
railway run npm run seed:run
cd ../..
```

## Troubleshooting

### Service Not Found

If you get "service not found", create the service first:

```bash
railway service create <service-name>
```

### Build Failures

Check build logs:

```bash
railway logs --service <service-name> --deployment <deployment-id>
```

### Port Conflicts

Railway automatically assigns `PORT` environment variable. Ensure your services use:

```javascript
const PORT = process.env.PORT || 3000;
```

### Python Services Issues

For mlops/simulator, ensure `requirements.txt` is present:

```bash
ls services/mlops/requirements.txt
ls services/simulator/requirements.txt
```

## Service URLs

After deployment, get service URLs:

```bash
# Frontend (has public domain)
railway domain --service frontend

# Backend (internal)
railway variables --service backend | grep RAILWAY_PRIVATE_DOMAIN

# Other services (internal)
railway variables --service <service-name> | grep RAILWAY_PRIVATE_DOMAIN
```

## Connecting Services

Services communicate using Railway's private networking:

### Backend to Postgres

```bash
DATABASE_URL=${{Postgres.DATABASE_URL}}
```

### Backend to Redis

```bash
REDIS_URL=${{Redis.REDIS_URL}}
```

### Frontend to Backend

```bash
VITE_API_URL=https://<backend-domain>.railway.app
```

### LINE Bot to Backend

```bash
BACKEND_URL=https://<backend-domain>.railway.app
```

## CI/CD Integration

### GitHub Integration

Link your GitHub repository:

```bash
railway link
```

Then enable auto-deploys in Railway dashboard for each service.

## Monitoring

### View Metrics

Visit Railway dashboard: https://railway.app/project/<project-id>

### Set Up Alerts

Configure alerts in Railway dashboard for:
- Build failures
- Deploy failures
- High resource usage

## Cost Optimization

### Resource Limits

Set resource limits for each service:

```bash
railway config set --service <service-name> memory=1Gi cpu=1
```

### Sleep on Idle

Enable for non-critical services to save costs.

## Rollback

### Rollback a Service

```bash
railway rollback --service <service-name>
```

### Rollback to Specific Deployment

```bash
railway rollback --service <service-name> --deployment <deployment-id>
```

## Best Practices

1. ✅ **Use environment-specific configs**: Separate dev/staging/production
2. ✅ **Enable health checks**: Add health endpoints to all services
3. ✅ **Set resource limits**: Prevent cost overruns
4. ✅ **Use Railway variables**: For service-to-service URLs
5. ✅ **Enable auto-deploys**: From main branch
6. ✅ **Monitor logs**: Set up log aggregation
7. ✅ **Test before production**: Use staging environment

## Additional Commands

### Restart Service

```bash
railway restart --service <service-name>
```

### Delete Service

```bash
railway service delete <service-name>
```

### Link to Different Project

```bash
railway link <project-id>
```

### Link to Different Environment

```bash
railway environment <environment-name>
```

## Support

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Project Issues: See repository issues

## Summary

You can deploy all services to Railway using:

```bash
# One-command deployment
./deploy-all-railway-services.sh

# Or manually deploy each service
cd services/<service-name>
railway up --service <service-name>
```

All services will be deployed to the **nt-poc-battery-management** project and can communicate via Railway's private networking.
