#!/bin/bash

################################################################################
# Production Rollback Script
# Task: T235 - Production rollback procedures
# Version: 1.0.0
# Date: January 9, 2026
################################################################################

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ROLLBACK_LOG="production-rollback-$(date +%Y%m%d-%H%M%S).log"

log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$ROLLBACK_LOG"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1" | tee -a "$ROLLBACK_LOG"
}

log_error() {
    echo -e "${RED}✗${NC} $1" | tee -a "$ROLLBACK_LOG"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1" | tee -a "$ROLLBACK_LOG"
}

# Get previous version tag
get_previous_version() {
    cd services/backend
    PREVIOUS_TAG=$(git tag --sort=-v:refname | head -2 | tail -1)
    cd ../..
    echo "$PREVIOUS_TAG"
}

# Rollback backend
rollback_backend() {
    log ""
    log "=========================================="
    log "ROLLING BACK BACKEND SERVICE"
    log "=========================================="
    
    PREVIOUS_TAG=$(get_previous_version)
    log "Rolling back to: $PREVIOUS_TAG"
    
    cd services/backend
    
    log "Stopping current backend..."
    pm2 stop backend || true
    
    log "Checking out previous version..."
    git fetch --tags
    git checkout "$PREVIOUS_TAG"
    
    log "Installing dependencies..."
    npm ci --omit=dev
    
    log "Building..."
    npm run build
    
    log "Starting backend..."
    pm2 start dist/index.js --name backend --env production
    
    cd ../..
    log_success "Backend rolled back to $PREVIOUS_TAG"
}

# Rollback MLOps
rollback_mlops() {
    log ""
    log "=========================================="
    log "ROLLING BACK MLOPS SERVICE"
    log "=========================================="
    
    log "Stopping current MLOps container..."
    docker stop battery-mlops || true
    docker rm battery-mlops || true
    
    log "Starting previous MLOps version..."
    docker run -d \
        --name battery-mlops \
        --restart unless-stopped \
        -p 8001:8001 \
        --env-file services/mlops/.env \
        battery-mlops:previous
    
    log_success "MLOps rolled back to previous version"
}

# Rollback frontend
rollback_frontend() {
    log ""
    log "=========================================="
    log "ROLLING BACK FRONTEND SERVICE"
    log "=========================================="
    
    PREVIOUS_TAG=$(get_previous_version)
    
    cd services/frontend
    
    log "Stopping current frontend..."
    pm2 stop frontend || true
    
    log "Checking out previous version..."
    git fetch --tags
    git checkout "$PREVIOUS_TAG"
    
    log "Installing dependencies..."
    npm ci --omit=dev
    
    log "Building..."
    npm run build
    
    log "Starting frontend..."
    pm2 start "npm run preview" --name frontend
    
    cd ../..
    log_success "Frontend rolled back to $PREVIOUS_TAG"
}

# Restore database (dangerous - requires confirmation)
restore_database() {
    log ""
    log "=========================================="
    log "DATABASE RESTORE (OPTIONAL)"
    log "=========================================="
    
    log_warning "Database restore is a destructive operation!"
    read -p "Do you want to restore the database from backup? (yes/no): " confirm
    
    if [ "$confirm" = "yes" ]; then
        # Find most recent backup
        LATEST_BACKUP=$(ls -t backups/*/database-backup.sql 2>/dev/null | head -1)
        
        if [ -n "$LATEST_BACKUP" ]; then
            log "Restoring from: $LATEST_BACKUP"
            log_warning "This will overwrite all current data!"
            read -p "Are you absolutely sure? (yes/no): " confirm2
            
            if [ "$confirm2" = "yes" ]; then
                psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" < "$LATEST_BACKUP"
                log_success "Database restored from backup"
            else
                log "Database restore cancelled"
            fi
        else
            log_error "No database backup found"
        fi
    else
        log "Skipping database restore"
    fi
}

# Verify rollback
verify_rollback() {
    log ""
    log "=========================================="
    log "VERIFYING ROLLBACK"
    log "=========================================="
    
    sleep 5
    
    # Check backend
    if curl -s http://localhost:3000/health | grep -q "ok"; then
        log_success "Backend is healthy"
    else
        log_error "Backend health check failed"
    fi
    
    # Check MLOps
    if curl -s http://localhost:8001/health | grep -q "ok"; then
        log_success "MLOps is healthy"
    else
        log_error "MLOps health check failed"
    fi
    
    # Check frontend
    if curl -s http://localhost:3001 > /dev/null; then
        log_success "Frontend is accessible"
    else
        log_error "Frontend is not accessible"
    fi
}

# Main rollback flow
main() {
    log "=========================================="
    log "PRODUCTION ROLLBACK INITIATED"
    log "=========================================="
    log "Timestamp: $(date)"
    log "Reason: ${1:-Manual rollback}"
    log ""
    
    log_warning "This will rollback all services to the previous version"
    read -p "Continue with rollback? (yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        log "Rollback cancelled"
        exit 0
    fi
    
    rollback_backend
    rollback_mlops
    rollback_frontend
    restore_database
    verify_rollback
    
    log ""
    log "=========================================="
    log "ROLLBACK COMPLETED"
    log "=========================================="
    log ""
    log_success "System rolled back successfully"
    log ""
    log "Next steps:"
    log "1. Run smoke tests: ./production-smoke-tests.sh"
    log "2. Monitor logs: pm2 logs"
    log "3. Investigate root cause of deployment failure"
    log "4. Schedule post-mortem meeting"
    log ""
    log "Rollback log: $ROLLBACK_LOG"
}

# Run main function
main "$@"
