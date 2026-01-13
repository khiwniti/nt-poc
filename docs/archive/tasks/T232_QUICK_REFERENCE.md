# T232: Database Backup Strategy - Quick Reference

## Quick Start

### Daily Operations
```bash
# Run backup manually
bash services/backend/scripts/backup.sh

# Check backup health
bash services/backend/scripts/monitor-backups.sh

# List available backups
bash services/backend/scripts/restore.sh -l
```

### Emergency Restore
```bash
# 1. List backups
bash services/backend/scripts/restore.sh -l

# 2. Restore latest backup
bash services/backend/scripts/restore.sh -f backup_YYYYMMDD_HHMMSS.sql.gz
```

---

## Scripts Overview

| Script | Purpose | Schedule | Location |
|--------|---------|----------|----------|
| `backup.sh` | Create daily backups | 2:00 AM daily | `services/backend/scripts/` |
| `restore.sh` | Restore from backup | On-demand | `services/backend/scripts/` |
| `monitor-backups.sh` | Health monitoring | Every 6 hours | `services/backend/scripts/` |

---

## Environment Variables

### Required
```bash
DATABASE_URL=postgresql://...        # Railway auto-provides
BACKUP_DIR=/app/backups              # Persistent volume
```

### Optional
```bash
RETENTION_DAYS=30                    # Default: 30 days
SLACK_WEBHOOK_URL=https://...        # For alerts
```

---

## Railway Setup

### 1. Create Persistent Volume
```bash
# In Railway Dashboard
Project → Settings → Volumes → Add Volume
Name: backups
Mount Path: /app/backups
Size: 10GB
```

### 2. Set Environment Variables
```bash
railway variables set BACKUP_DIR=/app/backups
railway variables set RETENTION_DAYS=30
railway variables set SLACK_WEBHOOK_URL=https://hooks.slack.com/...
```

### 3. Deploy with Cron Jobs
```bash
# Ensure railway.json is included
git add services/backend/scripts/railway.json
git commit -m "Add backup cron jobs"
railway up
```

---

## Backup Commands

### Create Backup
```bash
DATABASE_URL=$DATABASE_URL bash services/backend/scripts/backup.sh
```

### Verify Latest Backup
```bash
# Check file
ls -lh /app/backups/backup_*.sql.gz | tail -1

# Test integrity
gzip -t /app/backups/backup_*.sql.gz
```

### Manual Cleanup
```bash
# Delete backups older than 30 days
find /app/backups -name "backup_*.sql.gz" -mtime +30 -delete
```

---

## Restore Commands

### List Backups
```bash
bash services/backend/scripts/restore.sh -l
```

### Restore (Interactive)
```bash
bash services/backend/scripts/restore.sh -f backup_20260109_120000.sql.gz
```

### Restore (Automated - No Confirmation)
```bash
bash services/backend/scripts/restore.sh -f backup_20260109_120000.sql.gz -y
```

---

## Monitoring

### Health Checks
```bash
# Run all health checks
bash services/backend/scripts/monitor-backups.sh
```

### Check Logs
```bash
# Backup logs
tail -f /app/backups/backup.log

# Restore logs
tail -f /app/backups/restore.log

# Check for errors
grep -i error /app/backups/*.log
```

### Backup Statistics
```bash
# Count backups
find /app/backups -name "backup_*.sql.gz" | wc -l

# Total size
du -sh /app/backups

# Recent backups (last 5)
ls -lht /app/backups/backup_*.sql.gz | head -5
```

---

## Troubleshooting

### Backup Fails
```bash
# Check database connectivity
psql $DATABASE_URL -c "SELECT 1;"

# Check disk space
df -h /app/backups

# Check permissions
ls -la /app/backups
```

### Restore Fails
```bash
# Verify backup file
gzip -t backup_20260109_120000.sql.gz

# Check database permissions
psql $DATABASE_URL -c "SELECT current_user;"

# View backup contents
zcat backup_20260109_120000.sql.gz | head -50
```

### No Slack Alerts
```bash
# Test webhook
curl -X POST $SLACK_WEBHOOK_URL \
  -H 'Content-Type: application/json' \
  -d '{"text":"Test"}'

# Check environment variable
echo $SLACK_WEBHOOK_URL
```

---

## Key Metrics

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Backup Age | <24 hours | >26 hours (CRITICAL) |
| Backup Size | >1MB | <1MB (WARNING) |
| Success Rate | 100% | <95% (CRITICAL) |
| Disk Usage | <70% | >80% (WARNING), >90% (CRITICAL) |
| Retention | 30 days | Old backups exist (WARNING) |

---

## Emergency Contacts

### Backup Issues
- **L1**: DevOps Engineer (15 min response)
- **L2**: Database Administrator (30 min response)
- **L3**: Engineering Manager (1 hour response)

### Escalation
1. Check backup logs
2. Run health monitoring
3. Test database connectivity
4. Contact on-call engineer
5. Escalate to management if critical

---

## Best Practices

### DO ✅
- ✅ Run backups daily
- ✅ Monitor backup health
- ✅ Test restores monthly
- ✅ Keep 30-day retention
- ✅ Verify after backup
- ✅ Document all restores

### DON'T ❌
- ❌ Skip backup verification
- ❌ Delete backups manually without review
- ❌ Restore without pre-restore backup
- ❌ Ignore monitoring alerts
- ❌ Test restores in production
- ❌ Skip confirmation prompts

---

## Files Reference

```
services/backend/scripts/
├── backup.sh              # 7KB - Main backup script
├── restore.sh             # 9KB - Restore with safety checks  
├── monitor-backups.sh     # 5KB - Health monitoring
└── railway.json           # 1KB - Cron configuration

/app/backups/              # Persistent volume
├── backup_20260109_020000.sql.gz
├── backup_20260108_020000.sql.gz
├── backup.log
└── restore.log
```

---

## Common Tasks

### Weekly Review
```bash
# Check backup health
bash services/backend/scripts/monitor-backups.sh

# Review logs
tail -100 /app/backups/backup.log | grep -i error

# Verify disk space
df -h /app/backups
```

### Monthly Tasks
```bash
# Test restore in non-production
bash services/backend/scripts/restore.sh -l
bash services/backend/scripts/restore.sh -f backup_latest.sql.gz

# Archive oldest backup (optional)
# aws s3 cp /app/backups/backup_oldest.sql.gz s3://archive/

# Review retention policy
find /app/backups -name "backup_*.sql.gz" -mtime +25
```

### Quarterly Tasks
```bash
# Disaster recovery drill
# (See T232_BACKUP_STRATEGY.md Section 7.3)

# Review and update procedures
# Update documentation if needed

# Backup metrics review
# Generate backup statistics report
```

---

**Last Updated**: January 9, 2026  
**Full Documentation**: See `T232_BACKUP_STRATEGY.md`
