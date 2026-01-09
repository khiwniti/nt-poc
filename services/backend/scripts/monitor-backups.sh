#!/bin/bash

#############################################################################
# Backup Monitoring Script for Railway PostgreSQL
# Purpose: Monitor backup health and send alerts
# Compatible with: Railway PostgreSQL, Local PostgreSQL
#############################################################################

set -euo pipefail

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/app/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
ALERT_THRESHOLD_HOURS="${ALERT_THRESHOLD_HOURS:-26}"  # Alert if no backup in 26 hours
MIN_BACKUP_SIZE_MB="${MIN_BACKUP_SIZE_MB:-1}"  # Minimum expected backup size
SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Send alert
send_alert() {
    local severity=$1
    local message=$2
    local emoji="⚠️"
    
    case $severity in
        "CRITICAL") emoji="🚨" ;;
        "WARNING") emoji="⚠️" ;;
        "INFO") emoji="ℹ️" ;;
    esac
    
    echo -e "${RED}[${severity}] ${message}${NC}"
    
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST "$SLACK_WEBHOOK_URL" \
            -H 'Content-Type: application/json' \
            -d "{\"text\":\"${emoji} **Backup ${severity}**: ${message}\"}" \
            2>/dev/null || true
    fi
}

# Check if backups exist
check_backup_existence() {
    echo "Checking backup existence..."
    
    if [ ! -d "$BACKUP_DIR" ]; then
        send_alert "CRITICAL" "Backup directory does not exist: $BACKUP_DIR"
        return 1
    fi
    
    local backup_count=$(find "$BACKUP_DIR" -name "backup_*.sql.gz" -type f 2>/dev/null | wc -l)
    
    if [ "$backup_count" -eq 0 ]; then
        send_alert "CRITICAL" "No backups found in $BACKUP_DIR"
        return 1
    fi
    
    echo "✓ Found $backup_count backup(s)"
    return 0
}

# Check backup freshness
check_backup_freshness() {
    echo "Checking backup freshness..."
    
    local latest_backup=$(find "$BACKUP_DIR" -name "backup_*.sql.gz" -type f -exec stat -f '%m %N' {} \; | sort -rn | head -1 | cut -d' ' -f2)
    
    if [ -z "$latest_backup" ]; then
        send_alert "CRITICAL" "No backups found"
        return 1
    fi
    
    local backup_time=$(stat -f %m "$latest_backup")
    local current_time=$(date +%s)
    local age_hours=$(( (current_time - backup_time) / 3600 ))
    
    echo "Latest backup: $(basename "$latest_backup")"
    echo "Backup age: ${age_hours} hours"
    
    if [ "$age_hours" -gt "$ALERT_THRESHOLD_HOURS" ]; then
        send_alert "CRITICAL" "Latest backup is ${age_hours} hours old (threshold: ${ALERT_THRESHOLD_HOURS}h)"
        return 1
    elif [ "$age_hours" -gt 24 ]; then
        send_alert "WARNING" "Latest backup is ${age_hours} hours old"
        return 0
    fi
    
    echo "✓ Backup is fresh (${age_hours}h old)"
    return 0
}

# Check backup size
check_backup_size() {
    echo "Checking backup sizes..."
    
    local latest_backup=$(find "$BACKUP_DIR" -name "backup_*.sql.gz" -type f -exec stat -f '%m %N' {} \; | sort -rn | head -1 | cut -d' ' -f2)
    
    if [ -z "$latest_backup" ]; then
        return 1
    fi
    
    local size_bytes=$(stat -f %z "$latest_backup")
    local size_mb=$((size_bytes / 1024 / 1024))
    
    echo "Latest backup size: ${size_mb}MB"
    
    if [ "$size_mb" -lt "$MIN_BACKUP_SIZE_MB" ]; then
        send_alert "WARNING" "Backup size (${size_mb}MB) is below threshold (${MIN_BACKUP_SIZE_MB}MB)"
        return 1
    fi
    
    echo "✓ Backup size is acceptable"
    return 0
}

# Check backup integrity
check_backup_integrity() {
    echo "Checking backup integrity..."
    
    local latest_backup=$(find "$BACKUP_DIR" -name "backup_*.sql.gz" -type f -exec stat -f '%m %N' {} \; | sort -rn | head -1 | cut -d' ' -f2)
    
    if [ -z "$latest_backup" ]; then
        return 1
    fi
    
    if gzip -t "$latest_backup" 2>/dev/null; then
        echo "✓ Latest backup integrity verified"
        return 0
    else
        send_alert "CRITICAL" "Latest backup file is corrupted: $(basename "$latest_backup")"
        return 1
    fi
}

# Check retention policy compliance
check_retention_policy() {
    echo "Checking retention policy compliance..."
    
    local old_backups=$(find "$BACKUP_DIR" -name "backup_*.sql.gz" -type f -mtime +${RETENTION_DAYS} 2>/dev/null | wc -l)
    
    if [ "$old_backups" -gt 0 ]; then
        send_alert "WARNING" "Found ${old_backups} backup(s) older than ${RETENTION_DAYS} days (cleanup needed)"
        return 1
    fi
    
    echo "✓ Retention policy compliant"
    return 0
}

# Check disk space
check_disk_space() {
    echo "Checking disk space..."
    
    if [ ! -d "$BACKUP_DIR" ]; then
        return 1
    fi
    
    local usage=$(df -h "$BACKUP_DIR" | tail -1 | awk '{print $5}' | sed 's/%//')
    
    echo "Disk usage: ${usage}%"
    
    if [ "$usage" -gt 90 ]; then
        send_alert "CRITICAL" "Disk space critical: ${usage}% used"
        return 1
    elif [ "$usage" -gt 80 ]; then
        send_alert "WARNING" "Disk space high: ${usage}% used"
        return 0
    fi
    
    echo "✓ Disk space healthy"
    return 0
}

# Generate health report
generate_health_report() {
    echo ""
    echo "=========================================="
    echo "Backup Health Report"
    echo "=========================================="
    echo "Timestamp: $(date)"
    echo "Backup Directory: $BACKUP_DIR"
    echo ""
    
    local total_backups=$(find "$BACKUP_DIR" -name "backup_*.sql.gz" -type f 2>/dev/null | wc -l)
    local total_size=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1 || echo "0")
    
    echo "Total backups: ${total_backups}"
    echo "Total size: ${total_size}"
    echo ""
    
    if [ "$total_backups" -gt 0 ]; then
        echo "Recent backups:"
        find "$BACKUP_DIR" -name "backup_*.sql.gz" -type f -exec stat -f '%Sm %z %N' -t '%Y-%m-%d %H:%M' {} \; | sort -r | head -5 | while read -r date time size filepath; do
            filename=$(basename "$filepath")
            size_mb=$((size / 1024 / 1024))
            echo "  - ${filename} (${size_mb}MB) - ${date} ${time}"
        done
    fi
    
    echo "=========================================="
}

# Main execution
main() {
    echo "Starting backup monitoring..."
    echo ""
    
    local checks_passed=0
    local checks_failed=0
    
    # Run all checks
    check_backup_existence && ((checks_passed++)) || ((checks_failed++))
    check_backup_freshness && ((checks_passed++)) || ((checks_failed++))
    check_backup_size && ((checks_passed++)) || ((checks_failed++))
    check_backup_integrity && ((checks_passed++)) || ((checks_failed++))
    check_retention_policy && ((checks_passed++)) || ((checks_failed++))
    check_disk_space && ((checks_passed++)) || ((checks_failed++))
    
    echo ""
    echo "Checks passed: ${checks_passed}/6"
    echo "Checks failed: ${checks_failed}/6"
    
    # Generate report
    generate_health_report
    
    # Send summary notification
    if [ "$checks_failed" -eq 0 ]; then
        echo -e "${GREEN}All backup health checks passed!${NC}"
        if [ -n "$SLACK_WEBHOOK_URL" ]; then
            curl -X POST "$SLACK_WEBHOOK_URL" \
                -H 'Content-Type: application/json' \
                -d "{\"text\":\"✅ Backup monitoring: All checks passed (${checks_passed}/6)\"}" \
                2>/dev/null || true
        fi
        exit 0
    else
        echo -e "${RED}Some backup health checks failed!${NC}"
        exit 1
    fi
}

# Run main function
main
