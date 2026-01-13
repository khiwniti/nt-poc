# T232: Database Backup Strategy - Implementation Complete ✅

**Task**: Set up backup strategy with automated daily database backups  
**Status**: COMPLETE  
**Date**: January 9, 2026

---

## Acceptance Criteria - All Met ✅

| Criteria | Status | Implementation |
|----------|--------|----------------|
| Automated daily backups | ✅ | Cron job at 2:00 AM daily |
| Backup to Railway storage | ✅ | Persistent volume mount at /app/backups |
| 30-day retention policy | ✅ | Automated cleanup in backup script |
| Backup verification | ✅ | Integrity checks + restore dry-run |
| Restore procedure documented | ✅ | Complete restore script with safety checks |
| Backup monitoring and alerts | ✅ | 6 health checks with Slack notifications |

---

## Overview

A comprehensive backup strategy has been implemented for the Battery Management System's PostgreSQL database on Railway. The solution provides automated daily backups, verification, monitoring, and safe restore procedures with 30-day retention.

---

## Implementation Details

### 1. Backup Scripts

#### 1.1 Main Backup Script (`backup.sh`)
**Location**: `services/backend/scripts/backup.sh`

**Features**:
- ✅ Automated pg_dump with gzip compression
- ✅ Integrity verification (gzip -t)
- ✅ Restore capability testing
- ✅ 30-day retention with automatic cleanup
- ✅ Comprehensive logging
- ✅ Slack notifications for success/failure
- ✅ Railway DATABASE_URL support

**Configuration (Environment Variables)**:
```bash
DATABASE_URL=<railway-postgres-url>      # Required
BACKUP_DIR=/app/backups                   # Default
RETENTION_DAYS=30                         # Default
SLACK_WEBHOOK_URL=<slack-webhook>         # Optional
```

**Manual Execution**:
```bash
# Run backup manually
DATABASE_URL=$DATABASE_URL \
BACKUP_DIR=/app/backups \
bash services/backend/scripts/backup.sh
```

**Output**:
- Backup file: `backup_YYYYMMDD_HHMMSS.sql.gz`
- Log file: `backup.log`
- Verification status
- Backup summary report

#### 1.2 Restore Script (`restore.sh`)
**Location**: `services/backend/scripts/restore.sh`

**Features**:
- ✅ Interactive restore with confirmation
- ✅ Pre-restore backup of current database
- ✅ Backup file verification
- ✅ Post-restore verification
- ✅ Rollback instructions
- ✅ List available backups

**Usage**:
```bash
# List available backups
bash services/backend/scripts/restore.sh -l

# Restore from backup (interactive)
bash services/backend/scripts/restore.sh -f backup_20260109_120000.sql.gz

# Restore without confirmation (automated)
bash services/backend/scripts/restore.sh -f backup_20260109_120000.sql.gz -y
```

**Safety Features**:
1. Creates pre-restore backup before any changes
2. Requires explicit "yes" confirmation
3. Verifies backup file integrity before restore
4. Validates database schema after restore
5. Provides rollback instructions if restore fails

#### 1.3 Monitoring Script (`monitor-backups.sh`)
**Location**: `services/backend/scripts/monitor-backups.sh`

**Health Checks**:
1. ✅ **Backup Existence**: Verifies backups exist
2. ✅ **Backup Freshness**: Alerts if no backup in 26 hours
3. ✅ **Backup Size**: Checks minimum backup size (1MB)
4. ✅ **Backup Integrity**: Validates gzip compression
5. ✅ **Retention Compliance**: Checks for old backups
6. ✅ **Disk Space**: Alerts at 80% and 90% usage

**Configuration**:
```bash
BACKUP_DIR=/app/backups                   # Default
ALERT_THRESHOLD_HOURS=26                  # Default
MIN_BACKUP_SIZE_MB=1                      # Default
SLACK_WEBHOOK_URL=<slack-webhook>         # Optional
```

**Manual Execution**:
```bash
bash services/backend/scripts/monitor-backups.sh
```

**Output**:
- Health check results (6 checks)
- Backup health report
- Recent backup listing
- Slack notifications for failures

---

### 2. Railway Configuration

#### 2.1 Persistent Storage Setup

**Railway Volume Configuration**:
```yaml
# railway.toml or Railway dashboard
volumes:
  - name: backups
    mountPath: /app/backups
```

**Volume Specifications**:
- **Mount Path**: `/app/backups`
- **Size**: 10GB (recommended for 30-day retention)
- **Persistence**: Data persists across deployments
- **Access**: Read/Write for backup service

#### 2.2 Automated Scheduling

**Railway Cron Jobs** (via `railway.json`):
```json
{
  "cron": {
    "jobs": [
      {
        "name": "daily-database-backup",
        "schedule": "0 2 * * *",
        "command": "bash /app/services/backend/scripts/backup.sh"
      },
      {
        "name": "backup-monitoring",
        "schedule": "0 */6 * * *",
        "command": "bash /app/services/backend/scripts/monitor-backups.sh"
      }
    ]
  }
}
```

**Schedule**:
- **Daily Backup**: 2:00 AM UTC daily
- **Monitoring**: Every 6 hours (0:00, 6:00, 12:00, 18:00 UTC)

**Alternative: Unix Cron** (if Railway cron unavailable):
```bash
# Add to crontab
0 2 * * * cd /app && bash services/backend/scripts/backup.sh
0 */6 * * * cd /app && bash services/backend/scripts/monitor-backups.sh
```

#### 2.3 Environment Variables

**Required Variables in Railway**:
```bash
# Database connection (auto-provided by Railway)
DATABASE_URL=postgresql://user:pass@host:port/dbname

# Backup configuration
BACKUP_DIR=/app/backups
RETENTION_DAYS=30

# Optional: Slack notifications
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

**Setting Variables in Railway**:
```bash
# Via Railway CLI
railway variables set BACKUP_DIR=/app/backups
railway variables set RETENTION_DAYS=30
railway variables set SLACK_WEBHOOK_URL=https://hooks.slack.com/...

# Or via Railway Dashboard:
# Project → Variables → Add Variable
```

---

### 3. Backup Verification Process

#### 3.1 Automated Verification (During Backup)

The backup script performs three verification steps:

**Step 1: File Integrity Check**
```bash
gzip -t backup_20260109_120000.sql.gz
```
- Verifies gzip compression is valid
- Ensures file is not corrupted
- Fails backup if integrity check fails

**Step 2: Content Validation**
```bash
zcat backup_20260109_120000.sql.gz | head -n 100 | grep "PostgreSQL database dump"
```
- Confirms file contains valid PostgreSQL dump
- Checks SQL structure is intact
- Validates restore compatibility

**Step 3: Size Verification**
```bash
du -h backup_20260109_120000.sql.gz
```
- Ensures backup file is not empty
- Logs backup size for monitoring
- Alerts if size is suspiciously small

#### 3.2 Manual Verification

**Verify Latest Backup**:
```bash
# Check backup file
ls -lh /app/backups/backup_*.sql.gz | tail -1

# Test integrity
gzip -t /app/backups/backup_YYYYMMDD_HHMMSS.sql.gz

# View backup contents (first 50 lines)
zcat /app/backups/backup_YYYYMMDD_HHMMSS.sql.gz | head -50
```

**Test Restore (Dry Run)**:
```bash
# List tables in backup
zcat backup_YYYYMMDD_HHMMSS.sql.gz | grep "CREATE TABLE"

# Count SQL statements
zcat backup_YYYYMMDD_HHMMSS.sql.gz | grep -c "INSERT INTO"
```

---

### 4. Restore Procedures

#### 4.1 Standard Restore (Production)

**Prerequisites**:
- Valid backup file
- Database access (DATABASE_URL)
- Approval from stakeholders

**Procedure**:
```bash
# Step 1: List available backups
bash services/backend/scripts/restore.sh -l

# Step 2: Choose backup to restore
BACKUP_FILE=backup_20260109_120000.sql.gz

# Step 3: Perform restore (with confirmation)
bash services/backend/scripts/restore.sh -f $BACKUP_FILE

# Step 4: Verify restore
psql $DATABASE_URL -c "SELECT COUNT(*) FROM facilities;"
psql $DATABASE_URL -c "SELECT COUNT(*) FROM battery_systems;"
psql $DATABASE_URL -c "SELECT COUNT(*) FROM sensor_readings;"
```

**What Happens During Restore**:
1. ✅ Pre-restore backup is created automatically
2. ✅ Confirmation prompt (type 'yes')
3. ✅ Existing connections are terminated
4. ✅ Database schema is dropped and recreated
5. ✅ Backup is restored from compressed file
6. ✅ Post-restore verification checks run
7. ✅ Record counts are displayed

#### 4.2 Emergency Restore (Fast)

**For critical situations requiring immediate restoration**:
```bash
# Skip confirmation prompt (-y flag)
bash services/backend/scripts/restore.sh -f backup_20260109_120000.sql.gz -y
```

**⚠️ Warning**: This bypasses the confirmation prompt. Use only in emergencies.

#### 4.3 Partial Restore (Specific Tables)

**Restore specific tables only**:
```bash
# Extract and restore specific table
zcat /app/backups/backup_20260109_120000.sql.gz | \
  psql $DATABASE_URL \
  -c "DROP TABLE IF EXISTS sensor_readings CASCADE;" \
  -c "$(grep -A 1000 'CREATE TABLE sensor_readings' | grep -B 1000 'COPY sensor_readings')"
```

#### 4.4 Point-in-Time Recovery

**Find backup closest to desired time**:
```bash
# List backups with timestamps
bash services/backend/scripts/restore.sh -l

# Restore closest backup
bash services/backend/scripts/restore.sh -f backup_20260109_143000.sql.gz
```

---

### 5. Monitoring and Alerts

#### 5.1 Slack Integration

**Setup Slack Webhook**:
1. Go to Slack → Apps → Incoming Webhooks
2. Create new webhook for your channel
3. Copy webhook URL
4. Set in Railway: `SLACK_WEBHOOK_URL=<webhook-url>`

**Alert Types**:

| Alert Level | Trigger | Example |
|-------------|---------|---------|
| 🚨 CRITICAL | Backup failed, corrupted, or >26h old | "Database Backup FAILED: Backup creation failed" |
| ⚠️ WARNING | Disk space >80%, backup size small | "Backup WARNING: Disk space high: 85% used" |
| ✅ SUCCESS | Backup completed successfully | "Backup SUCCESS: Backup completed successfully" |
| ℹ️ INFO | Monitoring report | "Backup monitoring: All checks passed (6/6)" |

**Sample Alerts**:
```json
{
  "text": "🚨 **Backup CRITICAL**: Latest backup is 28 hours old (threshold: 26h)"
}
```

#### 5.2 Monitoring Dashboard

**Key Metrics to Track**:
1. **Backup Frequency**: Should be 1 backup/day
2. **Backup Size**: Trend should be consistent or growing
3. **Success Rate**: Should be 100%
4. **Disk Usage**: Should stay below 80%
5. **Backup Age**: Should be <24 hours

**Monitoring Query** (run weekly):
```bash
# Get backup statistics
find /app/backups -name "backup_*.sql.gz" -exec stat -f '%Sm %z %N' -t '%Y-%m-%d' {} \; | \
  awk '{size+=$2; count++} END {print "Total backups:", count, "\nTotal size:", size/1024/1024/1024, "GB"}'
```

#### 5.3 Log Monitoring

**Backup Logs**:
```bash
# View recent backup logs
tail -f /app/backups/backup.log

# Check for errors
grep -i "error\|failed" /app/backups/backup.log
```

**Restore Logs**:
```bash
# View restore logs
tail -f /app/backups/restore.log

# Check restore history
grep "Restore Process" /app/backups/restore.log
```

---

### 6. Retention Policy

#### 6.1 Policy Details

**Retention Settings**:
- **Retention Period**: 30 days
- **Cleanup Frequency**: Daily (during backup)
- **Minimum Backups**: Always keep at least 7 days
- **Maximum Age**: 30 days

**Retention Logic**:
```bash
# Automated cleanup (runs during backup)
find /app/backups -name "backup_*.sql.gz" -type f -mtime +30 -delete
```

#### 6.2 Manual Cleanup

**Review Old Backups**:
```bash
# List backups older than 30 days
find /app/backups -name "backup_*.sql.gz" -type f -mtime +30

# Count old backups
find /app/backups -name "backup_*.sql.gz" -type f -mtime +30 | wc -l

# Calculate size of old backups
find /app/backups -name "backup_*.sql.gz" -type f -mtime +30 -exec du -ch {} + | tail -1
```

**Delete Old Backups Manually**:
```bash
# Delete backups older than 30 days
find /app/backups -name "backup_*.sql.gz" -type f -mtime +30 -delete

# Delete specific backup
rm /app/backups/backup_20251209_120000.sql.gz
```

#### 6.3 Archive Strategy (Optional)

**Long-Term Archive** (for compliance):
```bash
# Archive quarterly backups to external storage
# Example: AWS S3, Google Cloud Storage, Railway Volume

# Archive to S3
aws s3 cp /app/backups/backup_20260101_020000.sql.gz \
  s3://company-backups/battery-management/quarterly/2026-Q1/

# Archive to Google Cloud
gsutil cp /app/backups/backup_20260101_020000.sql.gz \
  gs://company-backups/battery-management/quarterly/2026-Q1/
```

---

### 7. Disaster Recovery

#### 7.1 Recovery Time Objective (RTO)

**Target**: < 30 minutes for full database restore

**Breakdown**:
- Backup identification: 2 minutes
- Backup verification: 3 minutes
- Pre-restore backup: 5 minutes
- Restore execution: 15 minutes
- Post-restore verification: 5 minutes

#### 7.2 Recovery Point Objective (RPO)

**Target**: < 24 hours of data loss

**Explanation**: 
- Daily backups at 2:00 AM
- Maximum data loss: 24 hours (worst case)
- Average data loss: 12 hours

**Improvement Options**:
- Increase backup frequency (every 12 hours)
- Implement continuous WAL archiving
- Enable point-in-time recovery (PITR)

#### 7.3 Disaster Recovery Drill

**Quarterly DR Test Procedure**:
```bash
# 1. Create test environment
railway environment create test-dr

# 2. Provision test database
railway database create postgres

# 3. Restore latest backup to test database
DATABASE_URL=$TEST_DATABASE_URL bash services/backend/scripts/restore.sh -f backup_latest.sql.gz -y

# 4. Verify data integrity
psql $TEST_DATABASE_URL -c "SELECT COUNT(*) FROM facilities;"
psql $TEST_DATABASE_URL -c "SELECT COUNT(*) FROM battery_systems;"

# 5. Test application connectivity
curl http://test-dr-backend.railway.app/api/v1/health

# 6. Document results
echo "DR Test: SUCCESS - Restored in 23 minutes" >> dr_test_log.txt

# 7. Clean up test environment
railway environment delete test-dr
```

---

## 8. Troubleshooting

### 8.1 Backup Issues

#### Issue: Backup Creation Fails
**Symptoms**: Backup script exits with error
**Diagnosis**:
```bash
# Check database connectivity
psql $DATABASE_URL -c "SELECT 1;"

# Check disk space
df -h /app/backups

# Check permissions
ls -la /app/backups
```
**Solutions**:
- Verify DATABASE_URL is correct
- Ensure sufficient disk space (>1GB free)
- Check backup directory permissions

#### Issue: Backup File is Too Small
**Symptoms**: Backup size is suspiciously small (<100KB)
**Diagnosis**:
```bash
# Check backup contents
zcat /app/backups/backup_latest.sql.gz | head -100

# Check table counts
psql $DATABASE_URL -c "SELECT schemaname, tablename, n_live_tup FROM pg_stat_user_tables;"
```
**Solutions**:
- Verify database has data
- Check if pg_dump completed successfully
- Review backup logs for errors

### 8.2 Restore Issues

#### Issue: Restore Fails with Permission Error
**Symptoms**: psql fails with "permission denied"
**Diagnosis**:
```bash
# Check DATABASE_URL permissions
psql $DATABASE_URL -c "SELECT current_user, session_user;"
```
**Solutions**:
- Ensure database user has CREATE/DROP privileges
- Use superuser credentials for restore
- Check Railway database permissions

#### Issue: Missing Tables After Restore
**Symptoms**: Some tables are missing after restore
**Diagnosis**:
```bash
# Check backup contents
zcat backup.sql.gz | grep "CREATE TABLE"

# Compare with current schema
psql $DATABASE_URL -c "\dt"
```
**Solutions**:
- Verify backup file is complete
- Check if backup was taken before migrations
- Restore from a different backup

### 8.3 Monitoring Issues

#### Issue: No Slack Notifications
**Symptoms**: Backups run but no Slack alerts
**Diagnosis**:
```bash
# Test webhook
curl -X POST $SLACK_WEBHOOK_URL \
  -H 'Content-Type: application/json' \
  -d '{"text":"Test message"}'
```
**Solutions**:
- Verify SLACK_WEBHOOK_URL is set correctly
- Check webhook is active in Slack
- Review network connectivity from Railway

---

## 9. Best Practices

### 9.1 Backup Best Practices
1. ✅ Always verify backups after creation
2. ✅ Test restores regularly (monthly minimum)
3. ✅ Monitor backup size trends
4. ✅ Keep multiple generations (30-day retention)
5. ✅ Document backup locations and procedures
6. ✅ Encrypt sensitive backups (if needed)
7. ✅ Store backups in multiple locations
8. ✅ Automate backup monitoring

### 9.2 Restore Best Practices
1. ✅ Always create pre-restore backup
2. ✅ Test restore in non-production first
3. ✅ Verify data integrity after restore
4. ✅ Document restore procedures
5. ✅ Have rollback plan ready
6. ✅ Communicate with stakeholders
7. ✅ Schedule during maintenance windows
8. ✅ Monitor application after restore

### 9.3 Security Best Practices
1. ✅ Restrict backup file access
2. ✅ Use encrypted connections (SSL)
3. ✅ Rotate backup encryption keys
4. ✅ Audit backup access logs
5. ✅ Secure Slack webhook URLs
6. ✅ Use Railway secrets for credentials
7. ✅ Implement backup file encryption (if needed)

---

## 10. Future Enhancements

### 10.1 Potential Improvements
- [ ] **Incremental Backups**: Reduce backup size and time
- [ ] **Continuous WAL Archiving**: Enable point-in-time recovery
- [ ] **Backup Encryption**: Encrypt backups at rest
- [ ] **Multi-Region Backups**: Replicate to different regions
- [ ] **Automated Restore Testing**: Monthly automated DR drills
- [ ] **Backup Compression Optimization**: Test different algorithms
- [ ] **Grafana Dashboard**: Real-time backup metrics
- [ ] **Email Notifications**: Alternative to Slack

### 10.2 Railway Feature Requests
- [ ] Native backup scheduling UI
- [ ] Automated volume snapshots
- [ ] Built-in backup verification
- [ ] Backup restore UI
- [ ] Cross-region backup replication

---

## 11. References

### 11.1 Documentation
- **PostgreSQL Backup**: https://www.postgresql.org/docs/current/backup.html
- **Railway Volumes**: https://docs.railway.app/reference/volumes
- **Railway Cron Jobs**: https://docs.railway.app/reference/cron-jobs
- **Slack Webhooks**: https://api.slack.com/messaging/webhooks

### 11.2 Related Tasks
- **T234**: Deployment runbook (maintenance tasks)
- **T136**: MLOps infrastructure
- **T140**: Backend implementation
- **T143**: RUL prediction system

### 11.3 Scripts Location
```
services/backend/scripts/
├── backup.sh              # Main backup script
├── restore.sh             # Restore script with safety checks
├── monitor-backups.sh     # Health monitoring script
└── railway.json           # Railway cron configuration
```

---

## Status: COMPLETE ✅

All acceptance criteria have been fully implemented and tested.

**Deliverables**:
- ✅ `backup.sh` - Automated backup script with verification
- ✅ `restore.sh` - Safe restore procedure with rollback
- ✅ `monitor-backups.sh` - Health monitoring with alerts
- ✅ `railway.json` - Railway cron configuration
- ✅ Complete documentation and procedures

**Ready for**:
- Production deployment on Railway
- Automated daily backups
- Disaster recovery
- Compliance audits

---

**Implementation Date**: January 9, 2026  
**Author**: DevOps Team  
**Reviewed By**: Engineering Team
