# Database Backup Scripts

Production-ready backup and restore scripts for Railway PostgreSQL.

## Scripts

### 1. backup.sh
**Purpose**: Automated daily database backups with verification

**Features**:
- pg_dump with gzip compression
- 30-day retention with automatic cleanup
- Integrity verification (3-step process)
- Slack notifications
- Comprehensive logging

**Usage**:
```bash
# Manual execution
DATABASE_URL=$DATABASE_URL bash backup.sh

# Automated via Railway cron
# Runs daily at 2:00 AM (see railway.json)
```

**Configuration**:
```bash
DATABASE_URL=<railway-postgres-url>    # Required
BACKUP_DIR=/app/backups                 # Default
RETENTION_DAYS=30                       # Default
SLACK_WEBHOOK_URL=<webhook>             # Optional
```

---

### 2. restore.sh
**Purpose**: Safe database restore with verification

**Features**:
- Interactive mode with confirmation
- Pre-restore backup creation
- Post-restore verification
- List available backups
- Rollback instructions

**Usage**:
```bash
# List available backups
bash restore.sh -l

# Restore from backup (interactive)
bash restore.sh -f backup_20260109_120000.sql.gz

# Restore without confirmation (automated)
bash restore.sh -f backup_20260109_120000.sql.gz -y
```

**Options**:
- `-f <file>`: Backup file to restore
- `-l`: List available backups
- `-y`: Skip confirmation prompt
- `-h`: Show help message

---

### 3. monitor-backups.sh
**Purpose**: Backup health monitoring and alerting

**Features**:
- 6 comprehensive health checks
- Configurable alert thresholds
- Slack integration
- Detailed health reports

**Health Checks**:
1. Backup existence
2. Backup freshness (<26 hours)
3. Backup size (>1MB)
4. Backup integrity
5. Retention compliance
6. Disk space (<80%)

**Usage**:
```bash
# Manual execution
bash monitor-backups.sh

# Automated via Railway cron
# Runs every 6 hours (see railway.json)
```

**Configuration**:
```bash
BACKUP_DIR=/app/backups                 # Default
ALERT_THRESHOLD_HOURS=26                # Default
MIN_BACKUP_SIZE_MB=1                    # Default
SLACK_WEBHOOK_URL=<webhook>             # Optional
```

---

## Railway Setup

### 1. Create Persistent Volume
```yaml
# In Railway Dashboard
Project → Settings → Volumes
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
The `railway.json` file configures automated scheduling:
- **Daily Backup**: 2:00 AM UTC
- **Monitoring**: Every 6 hours

---

## Quick Commands

### Backup Operations
```bash
# Create backup now
bash backup.sh

# List backups
ls -lh /app/backups/backup_*.sql.gz

# Check latest backup
ls -lht /app/backups/backup_*.sql.gz | head -1

# Verify backup integrity
gzip -t /app/backups/backup_20260109_120000.sql.gz
```

### Restore Operations
```bash
# List available backups
bash restore.sh -l

# Restore latest backup
bash restore.sh -f $(ls -t /app/backups/backup_*.sql.gz | head -1)

# Emergency restore (no confirmation)
bash restore.sh -f backup_20260109_120000.sql.gz -y
```

### Monitoring
```bash
# Check backup health
bash monitor-backups.sh

# View backup logs
tail -f /app/backups/backup.log

# Check for errors
grep -i error /app/backups/backup.log
```

---

## File Structure

```
services/backend/scripts/
├── README.md                 # This file
├── backup.sh                 # Main backup script (7.5KB)
├── restore.sh                # Restore script (9.2KB)
├── monitor-backups.sh        # Monitoring script (5.8KB)
└── railway.json              # Railway cron configuration

/app/backups/                 # Persistent volume (Railway)
├── backup_20260109_020000.sql.gz
├── backup_20260108_020000.sql.gz
├── backup.log
└── restore.log
```

---

## Troubleshooting

### Backup Fails
```bash
# Check database connectivity
psql $DATABASE_URL -c "SELECT 1;"

# Check disk space
df -h /app/backups

# Check logs
tail -50 /app/backups/backup.log
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
  -d '{"text":"Test message"}'

# Verify environment variable
echo $SLACK_WEBHOOK_URL
```

---

## Documentation

- **Complete Guide**: `../../T232_BACKUP_STRATEGY.md`
- **Quick Reference**: `../../T232_QUICK_REFERENCE.md`
- **Acceptance Checklist**: `../../T232_ACCEPTANCE_CHECKLIST.md`

---

## Support

For issues or questions:
1. Check logs: `/app/backups/backup.log` and `/app/backups/restore.log`
2. Review documentation: `T232_BACKUP_STRATEGY.md`
3. Run health check: `bash monitor-backups.sh`
4. Contact DevOps team

---

**Last Updated**: January 9, 2026  
**Version**: 1.0.0
