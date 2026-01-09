#!/bin/bash

#############################################################################
# Database Restore Script for Railway PostgreSQL
# Purpose: Restore database from backup with safety checks
# Compatible with: Railway PostgreSQL, Local PostgreSQL
#############################################################################

set -euo pipefail

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/app/backups}"
DB_URL="${DATABASE_URL:-}"
LOG_FILE="${BACKUP_DIR}/restore.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

log_info() {
    echo -e "${BLUE}[INFO] $1${NC}" | tee -a "$LOG_FILE"
}

# Show usage
usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Restore PostgreSQL database from backup

OPTIONS:
    -f <file>       Backup file to restore from (required)
    -l              List available backups
    -y              Skip confirmation prompt
    -h              Show this help message

EXAMPLES:
    # List available backups
    $0 -l

    # Restore from specific backup (with confirmation)
    $0 -f backup_20260109_120000.sql.gz

    # Restore without confirmation (use with caution!)
    $0 -f backup_20260109_120000.sql.gz -y

EOF
    exit 1
}

# List available backups
list_backups() {
    log_info "Available backups in ${BACKUP_DIR}:"
    echo ""
    
    if [ ! -d "$BACKUP_DIR" ] || [ -z "$(ls -A "$BACKUP_DIR"/backup_*.sql.gz 2>/dev/null)" ]; then
        log_warning "No backups found"
        exit 0
    fi
    
    # Display backups with details
    printf "%-30s %-10s %-20s\n" "BACKUP FILE" "SIZE" "DATE"
    printf "%s\n" "--------------------------------------------------------------------------------"
    
    find "$BACKUP_DIR" -name "backup_*.sql.gz" -type f -exec stat -f '%Sm %z %N' -t '%Y-%m-%d %H:%M:%S' {} \; | sort -r | while read -r date time size filepath; do
        filename=$(basename "$filepath")
        
        # Convert size to human readable
        if command -v numfmt &>/dev/null; then
            human_size=$(numfmt --to=iec-i --suffix=B "$size" 2>/dev/null || echo "${size}B")
        else
            human_size="${size}B"
        fi
        
        printf "%-30s %-10s %-20s\n" "$filename" "$human_size" "$date $time"
    done
    
    echo ""
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    if [ -z "$DB_URL" ]; then
        log_error "DATABASE_URL environment variable is not set"
        exit 1
    fi
    
    if ! command -v psql &> /dev/null; then
        log_error "psql is not installed"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Verify backup file
verify_backup_file() {
    local backup_file=$1
    
    log "Verifying backup file: $backup_file"
    
    if [ ! -f "$backup_file" ]; then
        log_error "Backup file not found: $backup_file"
        exit 1
    fi
    
    if [ ! -s "$backup_file" ]; then
        log_error "Backup file is empty: $backup_file"
        exit 1
    fi
    
    # Verify gzip integrity
    if ! gzip -t "$backup_file" 2>/dev/null; then
        log_error "Backup file is corrupted"
        exit 1
    fi
    
    log_success "Backup file verification passed"
}

# Create pre-restore backup
create_pre_restore_backup() {
    log "Creating pre-restore backup of current database..."
    
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local pre_restore_backup="${BACKUP_DIR}/pre_restore_${timestamp}.sql.gz"
    
    if pg_dump "$DB_URL" | gzip > "$pre_restore_backup"; then
        local size=$(du -h "$pre_restore_backup" | cut -f1)
        log_success "Pre-restore backup created: $(basename "$pre_restore_backup") (${size})"
        echo "$pre_restore_backup"
        return 0
    else
        log_error "Failed to create pre-restore backup"
        return 1
    fi
}

# Perform restore
perform_restore() {
    local backup_file=$1
    
    log "Starting database restore..."
    log_warning "This will overwrite the current database!"
    
    # Drop and recreate database (safer than DROP DATABASE)
    log "Terminating existing connections..."
    psql "$DB_URL" -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = current_database() AND pid <> pg_backend_pid();" 2>/dev/null || true
    
    log "Dropping existing tables and schema..."
    psql "$DB_URL" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" 2>&1 | tee -a "$LOG_FILE"
    
    log "Restoring from backup..."
    if zcat "$backup_file" | psql "$DB_URL" 2>&1 | tee -a "$LOG_FILE"; then
        log_success "Database restored successfully"
        return 0
    else
        log_error "Database restore failed"
        return 1
    fi
}

# Verify restore
verify_restore() {
    log "Verifying restored database..."
    
    # Check if key tables exist
    local tables=("facilities" "battery_systems" "sensor_readings" "anomalies" "predictions")
    local missing_tables=()
    
    for table in "${tables[@]}"; do
        if ! psql "$DB_URL" -c "SELECT 1 FROM $table LIMIT 1;" &>/dev/null; then
            missing_tables+=("$table")
        fi
    done
    
    if [ ${#missing_tables[@]} -gt 0 ]; then
        log_error "Missing tables after restore: ${missing_tables[*]}"
        return 1
    fi
    
    # Check record counts
    log_info "Database record counts:"
    psql "$DB_URL" -c "
        SELECT 
            'facilities' as table_name, COUNT(*) as count FROM facilities
        UNION ALL
        SELECT 'battery_systems', COUNT(*) FROM battery_systems
        UNION ALL
        SELECT 'sensor_readings', COUNT(*) FROM sensor_readings
        UNION ALL
        SELECT 'anomalies', COUNT(*) FROM anomalies
        UNION ALL
        SELECT 'predictions', COUNT(*) FROM predictions;
    " 2>&1 | tee -a "$LOG_FILE"
    
    log_success "Database verification passed"
    return 0
}

# Main execution
main() {
    local backup_file=""
    local skip_confirmation=false
    
    # Parse command line arguments
    while getopts "f:lyh" opt; do
        case $opt in
            f)
                backup_file="$OPTARG"
                ;;
            l)
                list_backups
                exit 0
                ;;
            y)
                skip_confirmation=true
                ;;
            h)
                usage
                ;;
            \?)
                echo "Invalid option: -$OPTARG" >&2
                usage
                ;;
        esac
    done
    
    # Check if backup file is provided
    if [ -z "$backup_file" ]; then
        log_error "Backup file not specified"
        usage
    fi
    
    # Handle relative paths
    if [[ ! "$backup_file" = /* ]]; then
        backup_file="${BACKUP_DIR}/${backup_file}"
    fi
    
    log "========================================"
    log "Database Restore Process Started"
    log "========================================"
    log "Backup file: $backup_file"
    
    # Check prerequisites
    check_prerequisites
    
    # Verify backup file
    verify_backup_file "$backup_file"
    
    # Confirmation prompt
    if [ "$skip_confirmation" = false ]; then
        echo ""
        log_warning "=========================================="
        log_warning "WARNING: This will OVERWRITE the current database!"
        log_warning "=========================================="
        echo ""
        read -p "Are you sure you want to continue? (type 'yes' to confirm): " confirmation
        
        if [ "$confirmation" != "yes" ]; then
            log "Restore cancelled by user"
            exit 0
        fi
    fi
    
    # Create pre-restore backup
    pre_restore_backup=$(create_pre_restore_backup)
    if [ $? -ne 0 ]; then
        log_error "Failed to create pre-restore backup. Aborting restore."
        exit 1
    fi
    
    # Perform restore
    if ! perform_restore "$backup_file"; then
        log_error "Restore failed!"
        log_warning "You can restore the previous state using: $0 -f $(basename "$pre_restore_backup")"
        exit 1
    fi
    
    # Verify restore
    if ! verify_restore; then
        log_error "Restore verification failed!"
        log_warning "Database may be in an inconsistent state"
        log_warning "You can restore the previous state using: $0 -f $(basename "$pre_restore_backup")"
        exit 1
    fi
    
    log "========================================"
    log "Database Restore Process Completed"
    log "========================================"
    log_info "Pre-restore backup saved at: $(basename "$pre_restore_backup")"
}

# Run main function
main "$@"
