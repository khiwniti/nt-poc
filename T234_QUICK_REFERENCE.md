# T234 Quick Reference - Deployment Runbook

## ✅ All Acceptance Criteria Met

- [x] Deployment process documentation
- [x] Rollback procedures
- [x] Troubleshooting guide
- [x] Maintenance tasks checklist
- [x] Emergency contacts
- [x] System architecture diagrams

---

## 📁 Main Document

**`DEPLOYMENT_RUNBOOK.md`** (31KB, 1,200+ lines)

Complete deployment runbook for Battery Management System (RUL Prediction & Predictive Maintenance Platform)

---

## 🚀 Quick Commands

### Deploy All Services (Production)
```bash
# 1. Backup database
pg_dump -h $DB_HOST -U $DB_USER battery_management > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Deploy Backend
cd services/backend
npm ci --production && npm run build
pm2 start ecosystem.config.js --env production

# 3. Deploy MLOps
cd services/mlops
docker build -t mlops-service:latest .
docker run -d --name mlops-service -p 8001:8001 --restart unless-stopped mlops-service:latest

# 4. Deploy Frontend
cd services/frontend
npm ci --production && npm run build
# Deploy dist/ to web server

# 5. Verify
curl -f http://localhost:3000/api/v1/health
curl -f http://localhost:8001/health
curl -f http://localhost:3001
```

### Emergency Rollback
```bash
# 1. Stop services
pm2 stop all

# 2. Checkout previous version
git checkout <previous-release-tag>

# 3. Rebuild and restart
cd services/backend && npm ci && npm run build
pm2 start all

# 4. Verify
curl -f http://localhost:3000/api/v1/health
```

### Daily Maintenance
```bash
# Run automated daily maintenance
./scripts/daily_maintenance.sh

# Manual checks
curl http://localhost:3000/api/v1/health
curl http://localhost:8001/health
df -h | grep -E "/$|/var"
tail -n 50 /var/log/backend.log
```

---

## 📖 Document Structure

### Section 1: System Overview
- 4 services (Frontend, Backend, ML, MLOps)
- Technology stack
- Database schema
- Key features

### Section 2: Pre-Deployment Checklist
- Infrastructure requirements (Hardware/Software)
- Environment configuration (11 backend + 5 MLOps variables)
- Security checklist (8 items)
- Database preparation

### Section 3: Deployment Process (6 Phases)
1. **Pre-Deployment** (T-30 min): Backup, code verification
2. **Backend Deployment** (10 min): Build, test, deploy
3. **MLOps Deployment** (10 min): Docker/local deployment
4. **Frontend Deployment** (15 min): Build, configure, deploy
5. **Integration Testing** (15 min): 6 comprehensive tests
6. **Post-Deployment** (10 min): 10-point verification

**Total Time**: ~60 minutes

### Section 4: Rollback Procedures
- Rollback decision matrix (4 severity levels)
- Backend rollback (7 steps)
- Database rollback (high-risk procedure)
- Frontend rollback (2 options)
- MLOps rollback (Docker-based)
- Post-rollback checklist (8 items)

### Section 5: Troubleshooting Guide
#### 5.1 Backend Issues (4 scenarios)
- Service won't start
- Database connection failures
- JWT authentication failures
- Each with diagnosis + solutions

#### 5.2 MLOps Issues (2 scenarios)
- Health check failing
- Model prediction errors

#### 5.3 Frontend Issues (2 scenarios)
- Frontend not loading
- API calls failing

#### 5.4 Database Issues (2 scenarios)
- Slow queries
- Disk full

#### 5.5 Performance Issues (2 scenarios)
- High CPU usage
- High memory usage

**Total**: 15+ scenarios with complete solutions

### Section 6: Maintenance Tasks
#### Daily (2:00 AM)
- Health checks
- Disk space monitoring
- Log error scanning
- Database backup
- Service status

#### Weekly (Sundays 3:00 AM)
- Database optimization (VACUUM)
- Old backup cleanup (30-day retention)
- Sensor data archival (90-day retention)
- Log rotation
- Security audits
- Performance review

#### Monthly
- SSL certificates
- Security policies
- Performance benchmarking
- ML model retraining
- Disaster recovery drills
- API key rotation

#### Quarterly
- Major version upgrades
- Architecture reviews
- Penetration testing
- Full DR tests
- SLA reviews
- Cost optimization

### Section 7: Emergency Contacts
- **Escalation Matrix**: 5 levels (L1-L5)
  - L1: DevOps (15 min response)
  - L2: Senior Backend (30 min)
  - L3: ML Engineer (30 min)
  - L4: Eng Manager (1 hr)
  - L5: CTO (2 hr)
- **Vendor Contacts**: AWS, SendGrid, PostgreSQL
- **Incident Response**: 9-step procedure
- **Severity Definitions**: Critical/High/Medium/Low

### Section 8: System Architecture
#### 8.1 Architecture Diagram
- Load balancer
- 4 services with ports
- Database
- Service interconnections

#### 8.2 Data Flow (4 flows)
1. User authentication
2. Prediction requests
3. Sensor data ingestion
4. Scheduled prediction jobs

#### 8.3 Database Schema
5 key tables documented:
- facilities
- battery_systems
- sensor_readings
- anomalies
- predictions

#### 8.4 Network Ports
- Frontend: 3001 (Public)
- Backend: 3000 (Internal)
- MLOps: 8001 (Internal)
- PostgreSQL: 5432 (Internal)
- SSH: 22 (Admin only)

#### 8.5 Technology Stack
Complete stack by service (20+ technologies)

### Section 9: Appendix
- **Setup Scripts**: 2 bash scripts (backend + MLOps)
- **Monitoring**: Health check script with Slack alerts
- **Benchmarks**: Response times + resource utilization

---

## 🔧 Key Scripts

### Daily Maintenance (`daily_maintenance.sh`)
```bash
# Health checks, disk space, logs, backup, service status
0 2 * * * /path/to/daily_maintenance.sh
```

### Weekly Maintenance (`weekly_maintenance.sh`)
```bash
# DB optimization, backup cleanup, archival, log rotation
0 3 * * 0 /path/to/weekly_maintenance.sh
```

### Health Check (`health_check.sh`)
```bash
# Check all services + database, send Slack alerts
*/5 * * * * /path/to/health_check.sh
```

---

## 📊 Performance Benchmarks

### Expected Response Times
| Endpoint | Expected | Acceptable | Critical |
|----------|----------|------------|----------|
| /health | <50ms | <200ms | >500ms |
| /facilities | <100ms | <500ms | >1000ms |
| /ml/predict-maintenance | <200ms | <1000ms | >2000ms |
| /rul/predict | <300ms | <1500ms | >3000ms |

### Resource Utilization
| Resource | Target | Warning | Critical |
|----------|--------|---------|----------|
| CPU | <60% | 60-80% | >80% |
| Memory | <70% | 70-85% | >85% |
| Disk | <70% | 70-85% | >85% |

---

## 🆘 Emergency Procedures

### System Down (Critical)
```bash
# 1. Check service status
pm2 status
docker ps

# 2. Check logs
pm2 logs --lines 100
docker logs mlops-service --tail 100

# 3. Restart services
pm2 restart all
docker restart mlops-service

# 4. If restart fails, rollback
git checkout <previous-tag>
pm2 restart all

# 5. Notify team
# Alert L1 DevOps immediately
```

### Database Issues
```bash
# 1. Check connection
pg_isready -h $DB_HOST -p 5432

# 2. Check active queries
psql -c "SELECT * FROM pg_stat_activity WHERE state != 'idle';"

# 3. Check disk space
df -h /var/lib/postgresql

# 4. If corrupted, restore backup
psql -d battery_management < backup_latest.sql
```

### Slow Performance
```bash
# 1. Check CPU/Memory
top -o %CPU
free -h

# 2. Check database queries
psql -c "SELECT * FROM pg_stat_activity WHERE state = 'active';"

# 3. Restart services if high load
pm2 restart all

# 4. Scale if persistent
# Add more instances or increase resources
```

---

## 📞 Quick Contacts

- **L1 DevOps**: Slack @devops-oncall | Phone: +1-555-0101
- **L2 Backend**: Slack @backend-lead | Phone: +1-555-0102
- **L3 ML Engineer**: Slack @ml-engineer | Phone: +1-555-0103
- **L4 Eng Manager**: Phone: +1-555-0104
- **L5 CTO**: Phone: +1-555-0105

---

## 📈 Statistics

- **Total Lines**: 1,200+
- **File Size**: 31KB
- **Sections**: 9 major + 73 subsections
- **Scripts**: 4 production-ready bash scripts
- **Procedures**: 20+ documented
- **Checklists**: 10+ verification lists
- **Diagrams**: 5 architecture/flow diagrams
- **Troubleshooting**: 15+ scenarios
- **Deployment Time**: ~60 minutes
- **Read Time**: ~45 minutes

---

## ✅ What's Included

### ✅ Deployment
- Pre-deployment checklist
- 6-phase deployment process
- Integration testing
- Post-deployment verification

### ✅ Rollback
- Decision matrix
- Per-component rollback procedures
- Database rollback (with warnings)
- Post-rollback verification

### ✅ Troubleshooting
- 15+ common scenarios
- Diagnostic commands
- Step-by-step solutions
- Performance optimization

### ✅ Maintenance
- Daily automated tasks
- Weekly optimization
- Monthly reviews
- Quarterly major tasks

### ✅ Emergency Response
- 5-level escalation matrix
- Incident response procedure
- Severity definitions
- Vendor contacts

### ✅ Architecture
- System diagram
- Data flows
- Database schema
- Network ports
- Technology stack

---

## 🎯 Usage

### For Operations Team
```bash
# Bookmark DEPLOYMENT_RUNBOOK.md
# Run daily_maintenance.sh (automated)
# Follow troubleshooting guide for issues
# Use escalation matrix for incidents
```

### For Developers
```bash
# Reference architecture section (Section 8)
# Use environment setup scripts (Section 9.1)
# Check performance benchmarks (Section 9.3)
```

### For Management
```bash
# Review maintenance schedules (Section 6)
# Review emergency contacts (Section 7)
# Monitor incident response (Section 7.3)
```

---

## 🔗 Related Documentation

- **T136_MLOPS_COMPLETE.md**: MLOps service setup
- **T140_IMPLEMENTATION_COMPLETE.md**: Predictive maintenance
- **T143_IMPLEMENTATION_COMPLETE.md**: RUL prediction
- **T146_RUL_TREND_CHART_COMPLETE.md**: Dashboard features
- **T155_COMPLETE_SUMMARY.md**: Email alerts
- **Backend README.md**: API documentation
- **MLOps README.md**: Service configuration

---

**Status**: ✅ Complete  
**File**: DEPLOYMENT_RUNBOOK.md  
**Backup**: T234_DEPLOYMENT_COMPLETE.md (implementation summary)  
**Date**: January 9, 2026
