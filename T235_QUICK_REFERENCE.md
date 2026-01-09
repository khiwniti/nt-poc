# T235: Production Deployment - Quick Reference Guide

**Task**: T235 - Production deployment and smoke testing  
**Status**: READY FOR EXECUTION  
**Version**: 1.0.0  
**Date**: January 9, 2026

---

## Quick Start

### Production Deployment (Full)
```bash
# 1. Pre-deployment checks
./production-monitor.sh

# 2. Deploy to production
./production-deploy.sh

# 3. Run smoke tests
./production-smoke-tests.sh

# 4. Monitor continuously
watch -n 60 ./production-monitor.sh
```

### Emergency Rollback
```bash
./production-rollback.sh
```

---

## Script Overview

| Script | Purpose | Duration | When to Use |
|--------|---------|----------|-------------|
| `production-deploy.sh` | Full deployment automation | 30-45 min | Scheduled deployment window |
| `production-smoke-tests.sh` | Comprehensive testing | 5-10 min | After every deployment |
| `production-rollback.sh` | Emergency rollback | 10-15 min | When deployment fails |
| `production-monitor.sh` | Health monitoring | 1-2 min | Continuous monitoring |

---

## Deployment Checklist

### Before Deployment
- ✅ All tests passing in staging
- ✅ Database backup completed
- ✅ Environment variables configured
- ✅ Team notified and standing by
- ✅ Rollback plan reviewed
- ✅ Maintenance window scheduled

### During Deployment
1. ✅ Run pre-deployment health check
2. ✅ Execute deployment script
3. ✅ Monitor logs in real-time
4. ✅ Run smoke tests immediately
5. ✅ Verify all critical paths
6. ✅ Monitor for 30 minutes

### After Deployment
- ✅ Stakeholder sign-off
- ✅ Update documentation
- ✅ Schedule 24h review
- ✅ Monitor metrics dashboard
- ✅ Collect user feedback

---

## Critical Endpoints to Test

### Health Checks
```bash
# Backend
curl http://localhost:3000/health

# MLOps
curl http://localhost:8001/health

# Frontend
curl http://localhost:3001
```

### Authentication
```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!","name":"Test"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}'
```

### Core Functionality
```bash
# Facilities (requires JWT token)
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/facilities

# Predictions (requires JWT token)
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/battery-systems/<system_id>/predictions
```

---

## Monitoring Commands

### Service Status
```bash
# PM2 processes
pm2 status
pm2 logs backend --lines 50
pm2 logs frontend --lines 50

# Docker containers
docker ps
docker logs battery-mlops --tail 50
docker stats battery-mlops --no-stream

# Database
psql -h localhost -U postgres -d battery_management -c "\dt"
```

### System Resources
```bash
# CPU and Memory
htop

# Disk space
df -h

# Network
netstat -tulpn | grep -E '3000|3001|8001'
```

---

## Common Issues and Solutions

### Backend Won't Start
```bash
# Check logs
pm2 logs backend --err

# Common fixes:
# 1. Database connection
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT 1"

# 2. Port already in use
lsof -i :3000
kill -9 <PID>

# 3. Rebuild
cd services/backend
npm run build
pm2 restart backend
```

### MLOps Container Issues
```bash
# Check logs
docker logs battery-mlops

# Restart container
docker restart battery-mlops

# Full rebuild
docker stop battery-mlops
docker rm battery-mlops
cd services/mlops
docker build -t battery-mlops:production .
docker run -d --name battery-mlops -p 8001:8001 --env-file .env battery-mlops:production
```

### Database Connection Failed
```bash
# Check PostgreSQL status
systemctl status postgresql

# Check connections
psql -h localhost -U postgres -d battery_management -c "SELECT count(*) FROM pg_stat_activity"

# Reset connections
psql -h localhost -U postgres -d battery_management -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'battery_management'"
```

---

## Performance Benchmarks

### Expected Response Times
| Endpoint | Target | Acceptable | Critical |
|----------|--------|------------|----------|
| `/health` | <100ms | <500ms | >1000ms |
| `/api/facilities` | <200ms | <1000ms | >2000ms |
| `/api/auth/login` | <300ms | <1500ms | >3000ms |
| `/predict/rul` | <300ms | <1000ms | >2000ms |
| `/predict/maintenance` | <300ms | <1000ms | >2000ms |

### Resource Utilization Targets
| Resource | Normal | Warning | Critical |
|----------|--------|---------|----------|
| CPU | <50% | 50-80% | >80% |
| Memory | <70% | 70-85% | >85% |
| Disk | <70% | 70-90% | >90% |
| DB Connections | <20 | 20-50 | >50 |

---

## Smoke Test Coverage

The `production-smoke-tests.sh` script validates:

1. ✅ **Service Health** (4 checks)
   - Frontend, Backend, MLOps, Database connectivity

2. ✅ **Authentication** (3 checks)
   - Registration, Login, Token validation

3. ✅ **Dashboard Data** (5 checks)
   - Facilities, Battery systems, Sensor data, Predictions, Trends

4. ✅ **Real-time Updates** (2 checks)
   - SSE endpoint, Event streaming

5. ✅ **Alert Management** (3 checks)
   - Anomalies list, Statistics, Email alerts

6. ✅ **3D Visualization** (2 checks)
   - Battery model data, Trend charts

7. ✅ **AI Insights** (3 checks)
   - Model status, RUL prediction, Maintenance prediction

8. ✅ **Reports** (2 checks)
   - Facility reports, System reports

9. ✅ **Geospatial** (2 checks)
   - Location data, Map view

10. ✅ **Monitoring** (3 checks)
    - Health endpoints, System metrics, Logs

11. ✅ **Load Testing** (2 checks)
    - Concurrent requests, Response times

**Total**: ~40-50 automated checks

---

## Environment Variables

### Required for Backend
```bash
DB_HOST=localhost
DB_PORT=5432
DB_NAME=battery_management
DB_USER=postgres
DB_PASSWORD=<secure-password>
JWT_SECRET=<random-secret>
PORT=3000
SENDGRID_API_KEY=<api-key>
EMAIL_FROM=alerts@battery-management.com
DASHBOARD_BASE_URL=http://localhost:3001
```

### Required for MLOps
```bash
APP_NAME=MLOps Service
ENVIRONMENT=production
PORT=8001
LOG_LEVEL=info
```

---

## Rollback Decision Matrix

| Severity | Response Time | Action |
|----------|---------------|--------|
| **Critical** | Immediate | Rollback now |
| **High** | <15 minutes | Assess, likely rollback |
| **Medium** | <1 hour | Fix or rollback |
| **Low** | Next release | Document issue |

### Rollback Triggers
- ❌ Critical functionality broken
- ❌ Data corruption detected
- ❌ Security vulnerability
- ❌ >50% performance degradation
- ❌ >5% error rate for >15 minutes

---

## Stakeholder Sign-off Checklist

- [ ] DevOps Lead
- [ ] Backend Lead
- [ ] ML Engineer
- [ ] Frontend Lead
- [ ] Product Manager
- [ ] QA Lead
- [ ] Engineering Manager
- [ ] CTO

All must sign off before production is considered "deployed".

---

## Support and Escalation

### L1 - DevOps Engineer
- Response: 15 minutes
- Handles: Service restarts, basic troubleshooting

### L2 - Senior Backend Engineer
- Response: 30 minutes
- Handles: Backend issues, database problems

### L3 - ML Engineer
- Response: 30 minutes
- Handles: Model issues, prediction failures

### L4 - Engineering Manager
- Response: 1 hour
- Handles: Major incidents, coordination

### L5 - CTO
- Response: 2 hours
- Handles: Critical business impact

---

## Maintenance Schedule

### Daily (Automated)
- Health checks every 5 minutes
- Error log scanning
- Disk space monitoring
- Database backups at 2:00 AM

### Weekly (Automated)
- Database optimization (Sundays 3:00 AM)
- Log rotation
- Old backup cleanup
- Performance metrics review

### Monthly (Manual)
- SSL certificate check
- Security audit
- Performance benchmarking
- ML model retraining

### Quarterly (Manual)
- Penetration testing
- Disaster recovery drill
- Architecture review
- Runbook updates

---

## Important Files

| File | Purpose |
|------|---------|
| `production-deploy.sh` | Main deployment script |
| `production-smoke-tests.sh` | Automated testing |
| `production-rollback.sh` | Emergency rollback |
| `production-monitor.sh` | Health monitoring |
| `DEPLOYMENT_RUNBOOK.md` | Complete deployment guide |
| `T235_ACCEPTANCE_CHECKLIST.md` | Detailed acceptance criteria |

---

## Production URLs

### Local Development
- Frontend: http://localhost:3001
- Backend API: http://localhost:3000
- MLOps API: http://localhost:8001

### Production (Update these)
- Frontend: https://your-domain.com
- Backend API: https://api.your-domain.com
- MLOps API: https://ml.your-domain.com

---

## Next Steps After Deployment

### Immediate (Hour 0-1)
1. Monitor error rates continuously
2. Watch response times
3. Check user access
4. Verify scheduled jobs

### Short-term (Day 1-7)
1. Daily health checks
2. User feedback collection
3. Performance optimization
4. Documentation updates

### Long-term (Week 2+)
1. Capacity planning
2. Cost optimization
3. Feature enhancements
4. Technical debt reduction

---

## Success Metrics

- ✅ 100% service uptime
- ✅ <2s 95th percentile response time
- ✅ 0 critical errors
- ✅ >95% smoke test pass rate
- ✅ All stakeholders signed off

---

## Emergency Contacts

Keep this list updated with real contact information:

- **DevOps Lead**: name@company.com | +1-xxx-xxx-xxxx
- **Backend Lead**: name@company.com | +1-xxx-xxx-xxxx
- **On-Call Engineer**: name@company.com | +1-xxx-xxx-xxxx
- **CTO**: name@company.com | +1-xxx-xxx-xxxx

---

**Document Version**: 1.0.0  
**Last Updated**: January 9, 2026  
**Next Review**: After first production deployment

---

## Additional Resources

- Full Runbook: `DEPLOYMENT_RUNBOOK.md`
- Acceptance Checklist: `T235_ACCEPTANCE_CHECKLIST.md`
- Previous Deployments: T234, T155, T146, T143, T140, T136
- Architecture: `spec.md`, `plan.md`
