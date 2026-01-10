# Production Environment Configuration Guide

## Overview
This guide provides instructions for configuring production environment variables for the Battery Management System.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Backend Configuration](#backend-configuration)
3. [MLOps Service Configuration](#mlops-service-configuration)
4. [Frontend Configuration](#frontend-configuration)
5. [Security Best Practices](#security-best-practices)
6. [Deployment Checklist](#deployment-checklist)

---

## Prerequisites

### Required Services
- **PostgreSQL 14+**: Primary database
- **Redis 6+**: Caching and session management
- **SendGrid Account**: Email notifications
- **Mapbox Account**: Location services (optional)
- **OpenWeather Account**: Weather data (optional)
- **Sentry Account**: Error tracking and monitoring

### Secret Generation
Generate strong secrets using:
```bash
# JWT Secrets (256-bit minimum)
openssl rand -base64 64

# API Keys (128-bit)
openssl rand -hex 32

# Internal Service Keys
openssl rand -base64 32
```

---

## Backend Configuration

### Location
`services/backend/.env.production`

### Critical Variables

#### 1. Database Connection
```bash
DB_HOST=<your-production-db-host>
DB_PORT=5432
DB_NAME=battery_management
DB_USER=<db-user>
DB_PASSWORD=<strong-password>
DB_SSL=true
```

**Setup Steps:**
1. Create PostgreSQL database: `battery_management`
2. Create dedicated user with appropriate permissions
3. Enable SSL/TLS for connections
4. Configure connection pooling (min: 2, max: 20)
5. Run migrations: `npm run migrate`

**Connection String Format:**
```
postgresql://user:password@host:5432/battery_management?sslmode=require
```

#### 2. Redis Configuration
```bash
REDIS_URL=redis://<redis-host>:6379
REDIS_PASSWORD=<redis-password>
REDIS_TLS=true
```

**Setup Steps:**
1. Deploy Redis instance (AWS ElastiCache, Redis Cloud, etc.)
2. Enable TLS/SSL
3. Set strong password
4. Configure persistence (AOF or RDB)
5. Test connection: `redis-cli --tls -u redis://...`

**Use Cases:**
- Session storage
- Rate limiting
- Prediction caching
- Job queues (future)

#### 3. JWT Authentication
```bash
JWT_SECRET=<256-bit-secret>
JWT_EXPIRY=24h
JWT_REFRESH_SECRET=<different-256-bit-secret>
JWT_REFRESH_EXPIRY=7d
```

**Security Requirements:**
- Use different secrets for access and refresh tokens
- Minimum 256-bit entropy
- Rotate secrets quarterly
- Store in secrets manager (AWS Secrets Manager, Vault)

#### 4. SendGrid Email Service
```bash
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=alerts@battery-management.com
EMAIL_FROM_NAME=Battery Management System
```

**Setup Steps:**
1. Create SendGrid account
2. Verify sender email/domain
3. Generate API key with "Mail Send" permission
4. Configure email templates (optional)
5. Test email delivery

**Rate Limits:**
- Free: 100 emails/day
- Production: Consider paid plan

#### 5. Mapbox API (Optional)
```bash
MAPBOX_API_KEY=pk.xxxxxxxxxxxxxxxxxxxxx
```

**Setup Steps:**
1. Create Mapbox account
2. Generate public token
3. Restrict to production domains
4. Set rate limits

**Usage:**
- Facility location mapping
- Geographic visualization

#### 6. OpenWeather API (Optional)
```bash
OPENWEATHER_API_KEY=xxxxxxxxxxxxxxxxxxxxx
```

**Setup Steps:**
1. Create OpenWeather account
2. Subscribe to API plan
3. Generate API key
4. Test endpoint: `https://api.openweathermap.org/data/2.5/weather`

**Usage:**
- Environmental monitoring
- Temperature correlation

#### 7. Sentry Error Tracking
```bash
SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_RELEASE=<git-sha-or-build-id>
```

**Setup Steps:**
1. Create Sentry project (Node.js)
2. Copy DSN from project settings
3. Configure alerts and integrations
4. Set sample rates (10% for production)

**Best Practices:**
- Use breadcrumbs for context
- Filter sensitive data
- Set up alert rules
- Integrate with Slack/PagerDuty

#### 7.1 Monitoring Endpoints (Optional Protection)
```bash
# If set, /metrics requires Authorization: Bearer <token>
METRICS_AUTH_TOKEN=<random-32+>

# If set, /api/v1/monitoring/* requires Authorization: Bearer <token>
MONITORING_AUTH_TOKEN=<random-32+>
```

#### 8. Service URLs
```bash
MLOPS_SERVICE_URL=http://mlops-service:8001
DASHBOARD_BASE_URL=https://dashboard.battery-management.com
API_BASE_URL=https://api.battery-management.com
```

**Notes:**
- Use internal DNS for service communication
- Use HTTPS for public endpoints
- Configure load balancers

#### 9. ML Prediction Job
```bash
PREDICTION_JOB_INTERVAL_MINUTES=60
ML_BATCH_SIZE=100
```

**Configuration:**
- Default: 60 minutes (1 hour)
- Adjust based on data freshness requirements
- Monitor job execution time

---

## MLOps Service Configuration

### Location
`services/mlops/.env.production`

### Critical Variables

#### 1. Model Storage
```bash
MODELS_DIR=/app/models
MODEL_VERSION=v1.0.0
```

**Setup Steps:**
1. Create persistent volume for models
2. Mount at `/app/models`
3. Deploy trained model files
4. Set appropriate permissions

#### 2. Redis (Model Cache)
```bash
REDIS_URL=redis://<redis-host>:6379
REDIS_PASSWORD=<redis-password>
REDIS_DB=1
```

**Usage:**
- Prediction caching
- Model metadata
- Request queuing

#### 3. Performance Settings
```bash
WORKER_PROCESSES=4
MAX_BATCH_SIZE=1000
REQUEST_TIMEOUT=30000
```

**Tuning:**
- Workers: 2x CPU cores
- Batch size: Based on memory
- Timeout: 30 seconds for predictions

#### 4. GPU Configuration (Optional)
```bash
ENABLE_GPU=false
GPU_MEMORY_FRACTION=0.8
```

**If Using GPU:**
1. Install CUDA drivers
2. Use GPU-enabled Docker image
3. Set memory allocation
4. Monitor GPU utilization

---

## Frontend Configuration

### Location
`services/frontend/.env.production`

### Critical Variables

⚠️ **IMPORTANT**: All `VITE_*` variables are exposed to the browser. Never include secrets.

#### 1. API Endpoints
```bash
VITE_API_BASE_URL=https://api.battery-management.com
VITE_MLOPS_SERVICE_URL=https://mlops.battery-management.com
```

#### 2. Public API Keys
```bash
VITE_MAPBOX_API_KEY=<mapbox-public-key>
VITE_OPENWEATHER_API_KEY=<openweather-key>
```

**Security:**
- Use domain-restricted keys
- Set rate limits
- Monitor usage

#### 3. Sentry (Frontend)
```bash
VITE_SENTRY_DSN=<frontend-sentry-dsn>
VITE_SENTRY_ENVIRONMENT=production
```

**Setup:**
- Create separate Sentry project for frontend
- Configure source maps for production
- Filter sensitive user data

---

## Security Best Practices

### 1. Secrets Management
- ✅ Use AWS Secrets Manager, HashiCorp Vault, or similar
- ✅ Never commit `.env.production` to Git
- ✅ Rotate secrets quarterly
- ✅ Use different secrets per environment
- ❌ Don't hardcode secrets in code
- ❌ Don't share secrets via email/Slack

### 2. Access Control
- Limit database user permissions (no DROP, ALTER in production)
- Use read-only replicas for reporting
- Implement network security groups
- Enable database audit logging

### 3. SSL/TLS
- Enable SSL for all database connections
- Use TLS 1.2+ for Redis
- Configure HTTPS for all public endpoints
- Use valid certificates (Let's Encrypt, AWS ACM)

### 4. Monitoring
- Set up health check endpoints
- Monitor error rates (Sentry)
- Track API latency
- Set up alerts for anomalies

### 5. Environment Isolation
```bash
development → development database
staging → staging database
production → production database
```
Never connect staging to production services.

---

## Deployment Checklist

### Pre-Deployment
- [ ] All placeholder values replaced with actual secrets
- [ ] Secrets stored in secrets manager
- [ ] Database created and migrations run
- [ ] Redis instance deployed and accessible
- [ ] SendGrid account configured and verified
- [ ] Sentry projects created (backend + frontend)
- [ ] API keys generated and tested
- [ ] SSL certificates installed
- [ ] DNS records configured

### Configuration Validation
- [ ] Database connection successful
- [ ] Redis connection successful
- [ ] JWT tokens can be generated and verified
- [ ] Emails can be sent via SendGrid
- [ ] ML predictions work via MLOps service
- [ ] Frontend can reach backend API
- [ ] Sentry receiving test errors

### Post-Deployment
- [ ] Health checks passing
- [ ] Logs being generated
- [ ] Scheduled jobs running
- [ ] Error tracking active
- [ ] Monitoring dashboards configured
- [ ] Backup strategy verified
- [ ] Alert rules tested

### Testing Commands

```bash
# Test database connection
psql "postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME?sslmode=require"

# Test Redis connection
redis-cli --tls -h $REDIS_HOST -p 6379 -a $REDIS_PASSWORD PING

# Test backend health
curl https://api.battery-management.com/api/v1/health

# Test MLOps service
curl https://mlops.battery-management.com/health

# Test email (backend)
curl -X POST https://api.battery-management.com/test/email

# Verify JWT
node -e "console.log(require('jsonwebtoken').sign({test:1}, process.env.JWT_SECRET))"
```

---

## Troubleshooting

### Database Connection Issues
1. Verify credentials
2. Check security group/firewall rules
3. Confirm SSL mode
4. Test with `psql` CLI

### Redis Connection Issues
1. Verify host and port
2. Check TLS configuration
3. Confirm password
4. Test with `redis-cli`

### Email Not Sending
1. Verify SendGrid API key
2. Check sender verification status
3. Review SendGrid activity log
4. Check rate limits

### Sentry Not Receiving Errors
1. Verify DSN is correct
2. Check sample rate (not 0)
3. Confirm environment is set
4. Test with manual error

---

## Environment Variables Reference

### Backend (.env.production)
| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| DB_HOST | ✅ | Database host | `prod-db.example.com` |
| DB_PASSWORD | ✅ | Database password | `<secret>` |
| JWT_SECRET | ✅ | JWT signing secret | `<256-bit-secret>` |
| REDIS_URL | ✅ | Redis connection URL | `redis://host:6379` |
| SENDGRID_API_KEY | ✅ | SendGrid API key | `SG.xxx` |
| SENTRY_DSN | ✅ | Sentry DSN | `https://xxx@sentry.io/xxx` |
| MAPBOX_API_KEY | ⚠️ | Mapbox API key | `pk.xxx` |
| OPENWEATHER_API_KEY | ⚠️ | OpenWeather API key | `xxx` |

### MLOps (.env.production)
| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| MODELS_DIR | ✅ | Model storage path | `/app/models` |
| REDIS_URL | ✅ | Redis connection | `redis://host:6379` |
| API_KEY | ✅ | Service API key | `<secret>` |
| SENTRY_DSN | ✅ | Sentry DSN | `https://xxx@sentry.io/xxx` |

### Frontend (.env.production)
| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| VITE_API_BASE_URL | ✅ | Backend API URL | `https://api.example.com` |
| VITE_SENTRY_DSN | ✅ | Sentry DSN | `https://xxx@sentry.io/xxx` |
| VITE_MAPBOX_API_KEY | ⚠️ | Mapbox key (public) | `pk.xxx` |

✅ = Required  
⚠️ = Optional (feature-dependent)

---

## Support

For questions or issues:
- Review application logs
- Check Sentry error reports
- Consult service provider documentation (SendGrid, Mapbox, etc.)
- Review deployment documentation

---

**Last Updated**: 2026-01-09  
**Version**: 1.0.0
