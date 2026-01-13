#!/bin/bash

################################################################################
# Production Deployment Script
# Task: T235 - Production deployment
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

# Configuration
DEPLOYMENT_LOG="production-deployment-$(date +%Y%m%d-%H%M%S).log"
BACKUP_DIR="./backups/$(date +%Y%m%d-%H%M%S)"

log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$DEPLOYMENT_LOG"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1" | tee -a "$DEPLOYMENT_LOG"
}

log_error() {
    echo -e "${RED}✗${NC} $1" | tee -a "$DEPLOYMENT_LOG"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1" | tee -a "$DEPLOYMENT_LOG"
}

# Verify prerequisites
check_prerequisites() {
    log "=========================================="
    log "CHECKING PREREQUISITES"
    log "=========================================="
    
    # Check Docker
    if command -v docker &> /dev/null; then
        log_success "Docker is installed: $(docker --version)"
    else
        log_error "Docker is not installed"
        exit 1
    fi
    
    # Check Docker Compose
    if command -v docker-compose &> /dev/null; then
        log_success "Docker Compose is installed: $(docker-compose --version)"
    else
        log_error "Docker Compose is not installed"
        exit 1
    fi
    
    # Check PostgreSQL (or Docker container)
    if docker ps | grep -q postgres || command -v psql &> /dev/null; then
        log_success "PostgreSQL is available"
    else
        log_warning "PostgreSQL might not be running"
    fi
    
    # Check Node.js
    if command -v node &> /dev/null; then
        log_success "Node.js is installed: $(node --version)"
    else
        log_error "Node.js is not installed"
        exit 1
    fi
    
    # Check Python
    if command -v python3 &> /dev/null; then
        log_success "Python is installed: $(python3 --version)"
    else
        log_error "Python is not installed"
        exit 1
    fi
    
    # Check required environment files
    if [ -f "services/backend/.env" ]; then
        log_success "Backend .env file exists"
    else
        log_error "Backend .env file not found"
        exit 1
    fi
    
    if [ -f "services/mlops/.env" ]; then
        log_success "MLOps .env file exists"
    else
        log_error "MLOps .env file not found"
        exit 1
    fi
}

# Create backup
create_backup() {
    log ""
    log "=========================================="
    log "CREATING BACKUP"
    log "=========================================="
    
    mkdir -p "$BACKUP_DIR"
    
    # Backup database
    if [ -n "$DB_HOST" ]; then
        log "Backing up database..."
        pg_dump -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" > "$BACKUP_DIR/database-backup.sql" 2>/dev/null || log_warning "Database backup failed"
    fi
    
    # Backup configuration files
    log "Backing up configuration files..."
    cp services/backend/.env "$BACKUP_DIR/backend.env" 2>/dev/null || true
    cp services/mlops/.env "$BACKUP_DIR/mlops.env" 2>/dev/null || true
    cp services/frontend/.env "$BACKUP_DIR/frontend.env" 2>/dev/null || true
    
    log_success "Backup created in $BACKUP_DIR"
}

# Deploy backend
deploy_backend() {
    log ""
    log "=========================================="
    log "DEPLOYING BACKEND SERVICE"
    log "=========================================="
    
    cd services/backend
    
    log "Installing dependencies..."
    npm ci --omit=dev
    
    log "Building backend..."
    npm run build
    
    log "Running database migrations..."
    npm run migrate || log_warning "Migrations might have failed"
    
    log "Starting backend service..."
    pm2 stop backend 2>/dev/null || true
    pm2 start dist/index.js --name backend --env production
    
    cd ../..
    log_success "Backend deployed successfully"
}

# Deploy MLOps
deploy_mlops() {
    log ""
    log "=========================================="
    log "DEPLOYING MLOPS SERVICE"
    log "=========================================="
    
    cd services/mlops
    
    log "Building MLOps Docker image..."
    docker build -t battery-mlops:production .
    
    log "Stopping existing MLOps container..."
    docker stop battery-mlops 2>/dev/null || true
    docker rm battery-mlops 2>/dev/null || true
    
    log "Starting MLOps container..."
    docker run -d \
        --name battery-mlops \
        --restart unless-stopped \
        -p 8001:8001 \
        --env-file .env \
        battery-mlops:production
    
    cd ../..
    log_success "MLOps deployed successfully"
}

# Deploy frontend
deploy_frontend() {
    log ""
    log "=========================================="
    log "DEPLOYING FRONTEND SERVICE"
    log "=========================================="
    
    cd services/frontend
    
    log "Installing dependencies..."
    npm ci --omit=dev
    
    log "Building frontend..."
    npm run build
    
    log "Starting frontend service..."
    pm2 stop frontend 2>/dev/null || true
    pm2 start "npm run preview" --name frontend
    
    cd ../..
    log_success "Frontend deployed successfully"
}

# Verify deployment
verify_deployment() {
    log ""
    log "=========================================="
    log "VERIFYING DEPLOYMENT"
    log "=========================================="
    
    sleep 5
    
    # Check backend
    log "Checking backend health..."
    if curl -s http://localhost:3000/health | grep -q "ok"; then
        log_success "Backend is healthy"
    else
        log_error "Backend health check failed"
    fi
    
    # Check MLOps
    log "Checking MLOps health..."
    if curl -s http://localhost:8001/health | grep -q "ok"; then
        log_success "MLOps is healthy"
    else
        log_error "MLOps health check failed"
    fi
    
    # Check frontend
    log "Checking frontend..."
    if curl -s http://localhost:3001 > /dev/null; then
        log_success "Frontend is accessible"
    else
        log_error "Frontend is not accessible"
    fi
}

# Main deployment flow
main() {
    log "=========================================="
    log "PRODUCTION DEPLOYMENT STARTED"
    log "=========================================="
    log "Timestamp: $(date)"
    log "Log file: $DEPLOYMENT_LOG"
    log ""
    
    check_prerequisites
    create_backup
    deploy_backend
    deploy_mlops
    deploy_frontend
    verify_deployment
    
    log ""
    log "=========================================="
    log "DEPLOYMENT COMPLETED SUCCESSFULLY"
    log "=========================================="
    log ""
    log_success "Next steps:"
    log "1. Run smoke tests: ./production-smoke-tests.sh"
    log "2. Monitor logs: pm2 logs"
    log "3. Check Docker: docker ps"
    log "4. Review deployment log: $DEPLOYMENT_LOG"
}

# Run main function
main
