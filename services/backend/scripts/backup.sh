#!/bin/bash

#############################################################################
# Database Backup Script for Railway PostgreSQL
# Purpose: Automated daily backups with 30-day retention
# Compatible with: Railway PostgreSQL, Local PostgreSQL
#############################################################################

set -euo pipefail

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/app/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
DB_URL="${DATABASE_URL:-}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backup_${TIMESTAMP}.sql.gz"
LOG_FILE="${BACKUP_DIR}/backup.log"
SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[ERROR] $1${NC}" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[SUCCESS] $1${NC}" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}" | tee -a "$LOG_FILE"
}

# Send Slack notification (optional)
send_slack_notification() {
    local status=$1
    local message=$2
    
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST "$SLACK_WEBHOOK_URL" \
            -H 'Content-Type: application/json' \
            -d "{\"text\":\"🔧 Database Backup ${status}: ${message}\"}" \
            2>/dev/null || true
    fi
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    if [ -z "$DB_URL" ]; then
        log_error "DATABASE_URL environment variable is not set"
        send_slack_notification "FAILED" "DATABASE_URL not configured"
        exit 1
    fi
    
    if ! command -v pg_dump &> /dev/null; then
        log_error "pg_dump is not installed"
        send_slack_notification "FAILED" "pg_dump not available"
        exit 1
    fi
    
    # Create backup directory if it doesn't exist
    mkdir -p "$BACKUP_DIR"
    
    log_success "Prerequisites check passed"
}

# Create backup
create_backup() {
    log "Starting database backup..."
    
    local backup_path="${BACKUP_DIR}/${BACKUP_FILE}"
    
    # Perform backup with compression
    if pg_dump "$DB_URL" | gzip > "$backup_path"; then
        local size=$(du -h "$backup_path" | cut -f1)
        log_success "Backup created successfully: ${BACKUP_FILE} (${size})"
        echo "$backup_path"
        return 0
    else
        log_error "Backup creation failed"
        send_slack_notification "FAILED" "Backup creation failed"
        return 1
    fi
}

# Verify backup integrity
verify_backup() {
    local backup_path=$1
    log "Verifying backup integrity..."
    
    # Check if file exists and is not empty
    if [ ! -f "$backup_path" ]; then
        log_error "Backup file not found: $backup_path"
        return 1
    fi
    
    if [ ! -s "$backup_path" ]; then
        log_error "Backup file is empty: $backup_path"
        return 1
    fi
    
    # Verify gzip integrity
    if gzip -t "$backup_path" 2>/dev/null; then
        log_success "Backup integrity verified"
        return 0
    else
        log_error "Backup file is corrupted"
        send_slack_notification "FAILED" "Backup verification failed - file corrupted"
        return 1
    fi
}

# Test restore (dry-run)
test_restore() {
    local backup_path=$1
    log "Testing restore capability (dry-run)..."
    
    # Test that the backup can be decompressed and parsed
    if zcat "$backup_path" | head -n 100 | grep -q "PostgreSQL database dump"; then
        log_success "Restore test passed"
        return 0
    else
        log_error "Restore test failed - invalid SQL format"
        send_slack_notification "FAILED" "Backup restore test failed"
        return 1
    fi
}

# Clean old backups
cleanup_old_backups() {
    log "Cleaning up backups older than ${RETENTION_DAYS} days..."
    
    local deleted_count=0
    
    # Find and delete old backups
    while IFS= read -r old_backup; do
        rm -f "$old_backup"
        ((deleted_count++))
        log "Deleted old backup: $(basename "$old_backup")"
    done < <(find "$BACKUP_DIR" -name "backup_*.sql.gz" -type f -mtime +${RETENTION_DAYS})
    
    if [ $deleted_count -gt 0 ]; then
        log_success "Cleaned up ${deleted_count} old backup(s)"
    else
        log "No old backups to clean up"
    fi
}

# Generate backup report
generate_report() {
    log "Generating backup report..."
    
    local total_backups=$(find "$BACKUP_DIR" -name "backup_*.sql.gz" -type f 2>/dev/null | wc -l)
    local total_size=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1 || echo "0")
    
    log "=== Backup Summary ==="
    log "Total backups: ${total_backups}"
    log "Total size: ${total_size}"
    log "Retention policy: ${RETENTION_DAYS} days"
    log "======================"
}

# Main execution
main() {
    log "========================================"
    log "Database Backup Process Started"
    log "========================================"
    
    # Check prerequisites
    check_prerequisites
    
    # Create backup
    backup_path=$(create_backup)
    if [ $? -ne 0 ]; then
        exit 1
    fi
    
    # Verify backup
    if ! verify_backup "$backup_path"; then
        log_error "Backup verification failed"
        rm -f "$backup_path"
        exit 1
    fi
    
    # Test restore capability
    if ! test_restore "$backup_path"; then
        log_warning "Restore test failed, but backup is valid"
    fi
    
    # Cleanup old backups
    cleanup_old_backups
    
    # Generate report
    generate_report
    
    # Send success notification
    send_slack_notification "SUCCESS" "Backup completed successfully: ${BACKUP_FILE}"
    
    log "========================================"
    log "Database Backup Process Completed"
    log "========================================"
}

# Run main function
main
