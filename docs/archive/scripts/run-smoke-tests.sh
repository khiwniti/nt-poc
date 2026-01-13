#!/bin/bash

################################################################################
# E2E Smoke Test Runner
# Task: T223 - Add smoke tests for critical flows
# Runs end-to-end smoke tests on staging environment
################################################################################

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
FRONTEND_URL="${FRONTEND_URL:-http://localhost:5173}"
BACKEND_URL="${BACKEND_URL:-http://localhost:3000}"
TEST_ENV="${TEST_ENV:-staging}"
LOG_FILE="smoke-test-$(date +%Y%m%d-%H%M%S).log"

log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}✗${NC} $1" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1" | tee -a "$LOG_FILE"
}

################################################################################
# Pre-flight Checks
################################################################################

log "=========================================="
log "E2E SMOKE TEST SUITE"
log "Environment: $TEST_ENV"
log "=========================================="

log "Pre-flight checks..."

# Check if services are running
if ! curl -s "$FRONTEND_URL" > /dev/null 2>&1; then
    log_error "Frontend is not accessible at $FRONTEND_URL"
    log "Please start the frontend service first"
    exit 1
fi
log_success "Frontend is accessible"

if ! curl -s "$BACKEND_URL/health" > /dev/null 2>&1; then
    log_warning "Backend is not accessible at $BACKEND_URL"
    log "Some tests may fail without backend"
else
    log_success "Backend is accessible"
fi

# Navigate to frontend directory
cd "$(dirname "$0")/services/frontend" || exit 1

# Check if dependencies are installed
if [ ! -d "node_modules/@playwright/test" ]; then
    log "Installing Playwright..."
    npm install
fi

# Check if browsers are installed
if ! npx playwright --version > /dev/null 2>&1; then
    log "Installing Playwright browsers..."
    npx playwright install
fi

################################################################################
# Run Smoke Tests
################################################################################

log ""
log "=========================================="
log "RUNNING SMOKE TESTS"
log "=========================================="

# Set environment variables
export PLAYWRIGHT_BASE_URL="$FRONTEND_URL"

# Run smoke tests only
log "Running authentication smoke tests..."
if npx playwright test e2e/smoke-tests/auth.smoke.spec.ts --project=chromium --reporter=list; then
    log_success "Authentication tests passed"
else
    log_error "Authentication tests failed"
    EXIT_CODE=1
fi

log ""
log "Running dashboard smoke tests..."
if npx playwright test e2e/smoke-tests/dashboard.smoke.spec.ts --project=chromium --reporter=list; then
    log_success "Dashboard tests passed"
else
    log_error "Dashboard tests failed"
    EXIT_CODE=1
fi

log ""
log "Running alerts smoke tests..."
if npx playwright test e2e/smoke-tests/alerts.smoke.spec.ts --project=chromium --reporter=list; then
    log_success "Alert management tests passed"
else
    log_error "Alert management tests failed"
    EXIT_CODE=1
fi

log ""
log "Running reports smoke tests..."
if npx playwright test e2e/smoke-tests/reports.smoke.spec.ts --project=chromium --reporter=list; then
    log_success "Report generation tests passed"
else
    log_error "Report generation tests failed"
    EXIT_CODE=1
fi

################################################################################
# Summary
################################################################################

log ""
log "=========================================="
log "SMOKE TEST SUMMARY"
log "=========================================="
log "Environment: $TEST_ENV"
log "Frontend URL: $FRONTEND_URL"
log "Backend URL: $BACKEND_URL"
log "Log file: $LOG_FILE"
log ""

if [ "${EXIT_CODE:-0}" -eq 0 ]; then
    log_success "All smoke tests passed!"
    log "${GREEN}✓ Safe to deploy to production${NC}"
    exit 0
else
    log_error "Some smoke tests failed"
    log "${RED}✗ DO NOT deploy to production${NC}"
    log "Check the detailed report in: $(pwd)/playwright-report"
    exit 1
fi
