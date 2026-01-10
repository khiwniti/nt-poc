#!/bin/bash

################################################################################
# Production Monitoring Script
# Task: T235 - Continuous production monitoring
# Version: 1.0.0
# Date: January 9, 2026
################################################################################

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ALERT_EMAIL="${ALERT_EMAIL:-ops@battery-management.com}"
SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"

# Thresholds
CPU_THRESHOLD=80
MEMORY_THRESHOLD=85
DISK_THRESHOLD=90
RESPONSE_TIME_THRESHOLD=2000

log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

send_alert() {
    local severity=$1
    local message=$2
    
    log_error "ALERT [$severity]: $message"
    
    # Send to Slack if webhook configured
    if [ -n "$SLACK_WEBHOOK" ]; then
        curl -s -X POST "$SLACK_WEBHOOK" \
            -H "Content-Type: application/json" \
            -d "{\"text\": \"🚨 [$severity] $message\"}" > /dev/null
    fi
    
    # Could also send email here
    # echo "$message" | mail -s "[$severity] Production Alert" "$ALERT_EMAIL"
}

check_service_health() {
    log "=========================================="
    log "CHECKING SERVICE HEALTH"
    log "=========================================="
    
    # Backend health
    if curl -s -f http://localhost:3000/api/v1/health > /dev/null 2>&1; then
        log_success "Backend: HEALTHY"
    else
        log_error "Backend: UNHEALTHY"
        send_alert "CRITICAL" "Backend service is down or unhealthy"
        return 1
    fi
    
    # MLOps health
    if curl -s -f http://localhost:8001/health > /dev/null 2>&1; then
        log_success "MLOps: HEALTHY"
    else
        log_error "MLOps: UNHEALTHY"
        send_alert "CRITICAL" "MLOps service is down or unhealthy"
        return 1
    fi
    
    # Frontend
    if curl -s -f http://localhost:3001 > /dev/null 2>&1; then
        log_success "Frontend: HEALTHY"
    else
        log_error "Frontend: UNHEALTHY"
        send_alert "CRITICAL" "Frontend is not accessible"
        return 1
    fi
    
    return 0
}

check_response_times() {
    log ""
    log "=========================================="
    log "CHECKING RESPONSE TIMES"
    log "=========================================="
    
    # Backend API response time
    START=$(date +%s%N)
    curl -s http://localhost:3000/api/v1/health > /dev/null
    END=$(date +%s%N)
    BACKEND_TIME=$(( (END - START) / 1000000 ))
    
    if [ $BACKEND_TIME -lt $RESPONSE_TIME_THRESHOLD ]; then
        log_success "Backend response time: ${BACKEND_TIME}ms"
    else
        log_warning "Backend response time: ${BACKEND_TIME}ms (slow)"
        send_alert "WARNING" "Backend response time is ${BACKEND_TIME}ms (threshold: ${RESPONSE_TIME_THRESHOLD}ms)"
    fi
    
    # MLOps response time
    START=$(date +%s%N)
    curl -s http://localhost:8001/health > /dev/null
    END=$(date +%s%N)
    MLOPS_TIME=$(( (END - START) / 1000000 ))
    
    if [ $MLOPS_TIME -lt $RESPONSE_TIME_THRESHOLD ]; then
        log_success "MLOps response time: ${MLOPS_TIME}ms"
    else
        log_warning "MLOps response time: ${MLOPS_TIME}ms (slow)"
        send_alert "WARNING" "MLOps response time is ${MLOPS_TIME}ms"
    fi
}

check_system_resources() {
    log ""
    log "=========================================="
    log "CHECKING SYSTEM RESOURCES"
    log "=========================================="
    
    # CPU usage
    CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1}')
    if (( $(echo "$CPU_USAGE < $CPU_THRESHOLD" | bc -l) )); then
        log_success "CPU usage: ${CPU_USAGE}%"
    else
        log_warning "CPU usage: ${CPU_USAGE}% (high)"
        send_alert "WARNING" "CPU usage is ${CPU_USAGE}% (threshold: ${CPU_THRESHOLD}%)"
    fi
    
    # Memory usage
    MEMORY_USAGE=$(free | grep Mem | awk '{print ($3/$2) * 100.0}')
    if (( $(echo "$MEMORY_USAGE < $MEMORY_THRESHOLD" | bc -l) )); then
        log_success "Memory usage: ${MEMORY_USAGE}%"
    else
        log_warning "Memory usage: ${MEMORY_USAGE}% (high)"
        send_alert "WARNING" "Memory usage is ${MEMORY_USAGE}% (threshold: ${MEMORY_THRESHOLD}%)"
    fi
    
    # Disk usage
    DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ $DISK_USAGE -lt $DISK_THRESHOLD ]; then
        log_success "Disk usage: ${DISK_USAGE}%"
    else
        log_error "Disk usage: ${DISK_USAGE}% (critical)"
        send_alert "CRITICAL" "Disk usage is ${DISK_USAGE}% (threshold: ${DISK_THRESHOLD}%)"
    fi
}

check_database() {
    log ""
    log "=========================================="
    log "CHECKING DATABASE"
    log "=========================================="
    
    # Database connectivity
    if psql -h "${DB_HOST:-localhost}" -U "${DB_USER:-postgres}" -d "${DB_NAME:-battery_management}" -c "SELECT 1" > /dev/null 2>&1; then
        log_success "Database: CONNECTED"
    else
        log_error "Database: CONNECTION FAILED"
        send_alert "CRITICAL" "Database connection failed"
        return 1
    fi
    
    # Active connections
    ACTIVE_CONNECTIONS=$(psql -h "${DB_HOST:-localhost}" -U "${DB_USER:-postgres}" -d "${DB_NAME:-battery_management}" -t -c "SELECT count(*) FROM pg_stat_activity" 2>/dev/null | xargs)
    if [ -n "$ACTIVE_CONNECTIONS" ]; then
        log_success "Database connections: $ACTIVE_CONNECTIONS"
        
        if [ "$ACTIVE_CONNECTIONS" -gt 50 ]; then
            log_warning "High number of database connections: $ACTIVE_CONNECTIONS"
            send_alert "WARNING" "Database has $ACTIVE_CONNECTIONS active connections"
        fi
    fi
    
    return 0
}

check_docker_containers() {
    log ""
    log "=========================================="
    log "CHECKING DOCKER CONTAINERS"
    log "=========================================="
    
    # MLOps container
    if docker ps | grep -q battery-mlops; then
        STATUS=$(docker inspect -f '{{.State.Status}}' battery-mlops)
        if [ "$STATUS" = "running" ]; then
            log_success "MLOps container: RUNNING"
        else
            log_error "MLOps container: $STATUS"
            send_alert "CRITICAL" "MLOps container is not running (status: $STATUS)"
        fi
        
        # Check container resources
        CONTAINER_CPU=$(docker stats --no-stream --format "{{.CPUPerc}}" battery-mlops | sed 's/%//')
        CONTAINER_MEM=$(docker stats --no-stream --format "{{.MemPerc}}" battery-mlops | sed 's/%//')
        
        log "MLOps container CPU: ${CONTAINER_CPU}%"
        log "MLOps container Memory: ${CONTAINER_MEM}%"
    else
        log_error "MLOps container: NOT FOUND"
        send_alert "CRITICAL" "MLOps container is not running"
    fi
}

check_process_manager() {
    log ""
    log "=========================================="
    log "CHECKING PM2 PROCESSES"
    log "=========================================="
    
    # Backend process
    if pm2 list | grep -q "backend.*online"; then
        log_success "Backend process: ONLINE"
    else
        log_error "Backend process: NOT ONLINE"
        send_alert "CRITICAL" "Backend PM2 process is not online"
    fi
    
    # Frontend process
    if pm2 list | grep -q "frontend.*online"; then
        log_success "Frontend process: ONLINE"
    else
        log_error "Frontend process: NOT ONLINE"
        send_alert "CRITICAL" "Frontend PM2 process is not online"
    fi
}

check_logs_for_errors() {
    log ""
    log "=========================================="
    log "CHECKING LOGS FOR ERRORS"
    log "=========================================="
    
    # Backend logs (last 100 lines)
    BACKEND_ERRORS=$(pm2 logs backend --lines 100 --nostream 2>/dev/null | grep -i "error" | wc -l)
    if [ "$BACKEND_ERRORS" -gt 10 ]; then
        log_warning "Found $BACKEND_ERRORS errors in backend logs (last 100 lines)"
        send_alert "WARNING" "Backend has $BACKEND_ERRORS errors in recent logs"
    else
        log_success "Backend logs: $BACKEND_ERRORS errors (acceptable)"
    fi
    
    # MLOps logs
    MLOPS_ERRORS=$(docker logs battery-mlops --tail 100 2>&1 | grep -i "error" | wc -l)
    if [ "$MLOPS_ERRORS" -gt 10 ]; then
        log_warning "Found $MLOPS_ERRORS errors in MLOps logs (last 100 lines)"
        send_alert "WARNING" "MLOps has $MLOPS_ERRORS errors in recent logs"
    else
        log_success "MLOps logs: $MLOPS_ERRORS errors (acceptable)"
    fi
}

# Main monitoring function
main() {
    log "=========================================="
    log "PRODUCTION MONITORING CHECK"
    log "=========================================="
    log "Timestamp: $(date)"
    log ""
    
    ERRORS=0
    
    check_service_health || ((ERRORS++))
    check_response_times
    check_system_resources
    check_database || ((ERRORS++))
    check_docker_containers
    check_process_manager
    check_logs_for_errors
    
    log ""
    log "=========================================="
    log "MONITORING CHECK COMPLETE"
    log "=========================================="
    
    if [ $ERRORS -eq 0 ]; then
        log_success "All systems operational"
        exit 0
    else
        log_error "$ERRORS critical issues detected"
        exit 1
    fi
}

# Run monitoring check
main
