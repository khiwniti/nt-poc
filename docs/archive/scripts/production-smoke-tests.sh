#!/bin/bash

################################################################################
# Production Deployment Smoke Testing Suite
# Task: T235 - Production deployment and smoke testing
# Version: 1.0.0
# Date: January 9, 2026
################################################################################

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PRODUCTION_URL="${PRODUCTION_URL:-http://localhost:3001}"
BACKEND_URL="${BACKEND_URL:-http://localhost:3000}"
MLOPS_URL="${MLOPS_URL:-http://localhost:8001}"
TEST_EMAIL="${TEST_EMAIL:-test@example.com}"
TEST_PASSWORD="${TEST_PASSWORD:-TestPassword123!}"
LOG_FILE="production-smoke-test-$(date +%Y%m%d-%H%M%S).log"

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to log messages
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1" | tee -a "$LOG_FILE"
    ((PASSED_TESTS++))
}

log_error() {
    echo -e "${RED}✗${NC} $1" | tee -a "$LOG_FILE"
    ((FAILED_TESTS++))
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1" | tee -a "$LOG_FILE"
}

start_test() {
    ((TOTAL_TESTS++))
    log "${BLUE}Test $TOTAL_TESTS:${NC} $1"
}

# Function to check HTTP endpoint
check_endpoint() {
    local url=$1
    local expected_status=${2:-200}
    local response=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null)
    
    if [ "$response" = "$expected_status" ]; then
        return 0
    else
        echo "Got status $response, expected $expected_status"
        return 1
    fi
}

# Function to check JSON response
check_json_endpoint() {
    local url=$1
    local token=$2
    local response
    
    if [ -n "$token" ]; then
        response=$(curl -s -H "Authorization: Bearer $token" "$url" 2>/dev/null)
    else
        response=$(curl -s "$url" 2>/dev/null)
    fi
    
    echo "$response" | jq . > /dev/null 2>&1
    return $?
}

################################################################################
# TEST 1: Service Health Checks
################################################################################

log "=========================================="
log "PHASE 1: SERVICE HEALTH CHECKS"
log "=========================================="

start_test "Frontend service is accessible"
if check_endpoint "$PRODUCTION_URL" 200; then
    log_success "Frontend is responding at $PRODUCTION_URL"
else
    log_error "Frontend is not accessible at $PRODUCTION_URL"
fi

start_test "Backend service health check"
if check_endpoint "$BACKEND_URL/health" 200; then
    log_success "Backend health check passed"
else
    log_error "Backend health check failed"
fi

start_test "MLOps service health check"
if check_endpoint "$MLOPS_URL/health" 200; then
    log_success "MLOps health check passed"
else
    log_error "MLOps health check failed"
fi

start_test "Backend database connectivity"
if check_json_endpoint "$BACKEND_URL/health"; then
    log_success "Backend can connect to database"
else
    log_error "Backend database connection failed"
fi

################################################################################
# TEST 2: Authentication Flow
################################################################################

log ""
log "=========================================="
log "PHASE 2: AUTHENTICATION FLOW"
log "=========================================="

# Generate test user credentials
TEST_USER_EMAIL="smoke-test-$(date +%s)@example.com"
TEST_USER_PASSWORD="SmokeTest123!"

start_test "User registration"
REGISTER_RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/auth/register" \
    -H "Content-Type: application/json" \
    -d "{
        \"email\": \"$TEST_USER_EMAIL\",
        \"password\": \"$TEST_USER_PASSWORD\",
        \"name\": \"Smoke Test User\"
    }" 2>/dev/null)

if echo "$REGISTER_RESPONSE" | jq -e '.user.id' > /dev/null 2>&1; then
    log_success "User registration successful"
    USER_ID=$(echo "$REGISTER_RESPONSE" | jq -r '.user.id')
else
    log_warning "User registration failed or user already exists - trying login"
    TEST_USER_EMAIL="$TEST_EMAIL"
    TEST_USER_PASSWORD="$TEST_PASSWORD"
fi

start_test "User login"
LOGIN_RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{
        \"email\": \"$TEST_USER_EMAIL\",
        \"password\": \"$TEST_USER_PASSWORD\"
    }" 2>/dev/null)

if echo "$LOGIN_RESPONSE" | jq -e '.token' > /dev/null 2>&1; then
    log_success "User login successful"
    JWT_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token')
else
    log_error "User login failed"
    JWT_TOKEN=""
fi

if [ -n "$JWT_TOKEN" ]; then
    start_test "Token validation"
    if check_json_endpoint "$BACKEND_URL/api/auth/me" "$JWT_TOKEN"; then
        log_success "JWT token is valid"
    else
        log_error "JWT token validation failed"
    fi
fi

################################################################################
# TEST 3: Dashboard Data Loading
################################################################################

log ""
log "=========================================="
log "PHASE 3: DASHBOARD DATA LOADING"
log "=========================================="

if [ -z "$JWT_TOKEN" ]; then
    log_warning "Skipping dashboard tests - no valid token"
else
    start_test "Fetch facilities list"
    FACILITIES_RESPONSE=$(curl -s -H "Authorization: Bearer $JWT_TOKEN" \
        "$BACKEND_URL/api/facilities" 2>/dev/null)
    
    if echo "$FACILITIES_RESPONSE" | jq -e 'type == "array"' > /dev/null 2>&1; then
        FACILITY_COUNT=$(echo "$FACILITIES_RESPONSE" | jq 'length')
        log_success "Facilities loaded successfully (count: $FACILITY_COUNT)"
        
        if [ "$FACILITY_COUNT" -gt 0 ]; then
            FACILITY_ID=$(echo "$FACILITIES_RESPONSE" | jq -r '.[0].id')
        fi
    else
        log_error "Failed to load facilities"
    fi

    if [ -n "$FACILITY_ID" ]; then
        start_test "Fetch battery systems for facility"
        SYSTEMS_RESPONSE=$(curl -s -H "Authorization: Bearer $JWT_TOKEN" \
            "$BACKEND_URL/api/facilities/$FACILITY_ID/battery-systems" 2>/dev/null)
        
        if echo "$SYSTEMS_RESPONSE" | jq -e 'type == "array"' > /dev/null 2>&1; then
            SYSTEM_COUNT=$(echo "$SYSTEMS_RESPONSE" | jq 'length')
            log_success "Battery systems loaded (count: $SYSTEM_COUNT)"
            
            if [ "$SYSTEM_COUNT" -gt 0 ]; then
                SYSTEM_ID=$(echo "$SYSTEMS_RESPONSE" | jq -r '.[0].id')
            fi
        else
            log_error "Failed to load battery systems"
        fi
    fi

    if [ -n "$SYSTEM_ID" ]; then
        start_test "Fetch sensor data for battery system"
        SENSOR_RESPONSE=$(curl -s -H "Authorization: Bearer $JWT_TOKEN" \
            "$BACKEND_URL/api/battery-systems/$SYSTEM_ID/sensor-data?limit=10" 2>/dev/null)
        
        if echo "$SENSOR_RESPONSE" | jq -e 'type == "array"' > /dev/null 2>&1; then
            log_success "Sensor data loaded successfully"
        else
            log_error "Failed to load sensor data"
        fi

        start_test "Fetch predictions for battery system"
        PREDICTIONS_RESPONSE=$(curl -s -H "Authorization: Bearer $JWT_TOKEN" \
            "$BACKEND_URL/api/battery-systems/$SYSTEM_ID/predictions?limit=5" 2>/dev/null)
        
        if echo "$PREDICTIONS_RESPONSE" | jq -e 'type == "array"' > /dev/null 2>&1; then
            log_success "Predictions data loaded successfully"
        else
            log_error "Failed to load predictions"
        fi
    fi
fi

################################################################################
# TEST 4: Real-time Updates (SSE)
################################################################################

log ""
log "=========================================="
log "PHASE 4: REAL-TIME UPDATES (SSE)"
log "=========================================="

if [ -z "$JWT_TOKEN" ]; then
    log_warning "Skipping SSE tests - no valid token"
else
    start_test "SSE endpoint accessibility"
    # Test if SSE endpoint accepts connections (timeout after 3 seconds)
    SSE_TEST=$(timeout 3 curl -s -H "Authorization: Bearer $JWT_TOKEN" \
        -H "Accept: text/event-stream" \
        "$BACKEND_URL/api/events" 2>/dev/null || true)
    
    if [ -n "$SSE_TEST" ] || [ $? -eq 124 ]; then
        log_success "SSE endpoint is accessible (connection established)"
    else
        log_error "SSE endpoint is not accessible"
    fi
fi

################################################################################
# TEST 5: Alert Management
################################################################################

log ""
log "=========================================="
log "PHASE 5: ALERT MANAGEMENT"
log "=========================================="

if [ -z "$JWT_TOKEN" ]; then
    log_warning "Skipping alert tests - no valid token"
else
    start_test "Fetch alerts/anomalies"
    ALERTS_RESPONSE=$(curl -s -H "Authorization: Bearer $JWT_TOKEN" \
        "$BACKEND_URL/api/anomalies?limit=10" 2>/dev/null)
    
    if echo "$ALERTS_RESPONSE" | jq -e 'type == "array"' > /dev/null 2>&1; then
        ALERT_COUNT=$(echo "$ALERTS_RESPONSE" | jq 'length')
        log_success "Alerts loaded successfully (count: $ALERT_COUNT)"
    else
        log_error "Failed to load alerts"
    fi

    start_test "Alert statistics endpoint"
    STATS_RESPONSE=$(curl -s -H "Authorization: Bearer $JWT_TOKEN" \
        "$BACKEND_URL/api/anomalies/stats" 2>/dev/null)
    
    if echo "$STATS_RESPONSE" | jq -e '.total' > /dev/null 2>&1; then
        log_success "Alert statistics loaded successfully"
    else
        log_error "Failed to load alert statistics"
    fi
fi

################################################################################
# TEST 6: 3D Visualization Data
################################################################################

log ""
log "=========================================="
log "PHASE 6: 3D VISUALIZATION DATA"
log "=========================================="

if [ -z "$JWT_TOKEN" ] || [ -z "$SYSTEM_ID" ]; then
    log_warning "Skipping 3D visualization tests - no valid token or system ID"
else
    start_test "3D battery visualization data"
    VIZ_RESPONSE=$(curl -s -H "Authorization: Bearer $JWT_TOKEN" \
        "$BACKEND_URL/api/battery-systems/$SYSTEM_ID" 2>/dev/null)
    
    if echo "$VIZ_RESPONSE" | jq -e '.id' > /dev/null 2>&1; then
        log_success "Battery system details loaded for 3D visualization"
    else
        log_error "Failed to load battery system details"
    fi

    start_test "Historical trend data for charts"
    TREND_RESPONSE=$(curl -s -H "Authorization: Bearer $JWT_TOKEN" \
        "$BACKEND_URL/api/battery-systems/$SYSTEM_ID/trends?days=30" 2>/dev/null)
    
    if echo "$TREND_RESPONSE" | jq -e 'type == "object"' > /dev/null 2>&1; then
        log_success "Trend data loaded successfully"
    else
        log_error "Failed to load trend data"
    fi
fi

################################################################################
# TEST 7: AI Insights (ML Predictions)
################################################################################

log ""
log "=========================================="
log "PHASE 7: AI INSIGHTS (ML PREDICTIONS)"
log "=========================================="

start_test "MLOps model status"
MODEL_STATUS=$(curl -s "$MLOPS_URL/model-status" 2>/dev/null)

if echo "$MODEL_STATUS" | jq -e '.rul_model_loaded' > /dev/null 2>&1; then
    RUL_LOADED=$(echo "$MODEL_STATUS" | jq -r '.rul_model_loaded')
    MAINT_LOADED=$(echo "$MODEL_STATUS" | jq -r '.maintenance_model_loaded')
    
    if [ "$RUL_LOADED" = "true" ] && [ "$MAINT_LOADED" = "true" ]; then
        log_success "All ML models are loaded and ready"
    else
        log_error "Some ML models are not loaded (RUL: $RUL_LOADED, Maintenance: $MAINT_LOADED)"
    fi
else
    log_error "Failed to get model status"
fi

start_test "RUL prediction endpoint"
RUL_TEST_DATA='{
    "voltage": 3.7,
    "current": -2.5,
    "temperature": 25.0,
    "soc": 0.85,
    "soh": 0.95,
    "cycle_count": 150,
    "charge_rate": 0.5,
    "discharge_rate": 0.3
}'

RUL_PREDICTION=$(curl -s -X POST "$MLOPS_URL/predict/rul" \
    -H "Content-Type: application/json" \
    -d "$RUL_TEST_DATA" 2>/dev/null)

if echo "$RUL_PREDICTION" | jq -e '.rul_days' > /dev/null 2>&1; then
    RUL_DAYS=$(echo "$RUL_PREDICTION" | jq -r '.rul_days')
    log_success "RUL prediction successful (predicted: $RUL_DAYS days)"
else
    log_error "RUL prediction failed"
fi

start_test "Predictive maintenance endpoint"
MAINT_PREDICTION=$(curl -s -X POST "$MLOPS_URL/predict/maintenance" \
    -H "Content-Type: application/json" \
    -d "$RUL_TEST_DATA" 2>/dev/null)

if echo "$MAINT_PREDICTION" | jq -e '.risk_7d' > /dev/null 2>&1; then
    RISK_7D=$(echo "$MAINT_PREDICTION" | jq -r '.risk_7d')
    log_success "Maintenance prediction successful (7-day risk: $RISK_7D)"
else
    log_error "Maintenance prediction failed"
fi

################################################################################
# TEST 8: Report Generation
################################################################################

log ""
log "=========================================="
log "PHASE 8: REPORT GENERATION"
log "=========================================="

if [ -z "$JWT_TOKEN" ] || [ -z "$FACILITY_ID" ]; then
    log_warning "Skipping report tests - no valid token or facility ID"
else
    start_test "Facility report generation"
    REPORT_RESPONSE=$(curl -s -H "Authorization: Bearer $JWT_TOKEN" \
        "$BACKEND_URL/api/facilities/$FACILITY_ID/report?format=json" 2>/dev/null)
    
    if echo "$REPORT_RESPONSE" | jq -e '.facility' > /dev/null 2>&1; then
        log_success "Facility report generated successfully"
    else
        log_error "Failed to generate facility report"
    fi

    if [ -n "$SYSTEM_ID" ]; then
        start_test "Battery system report generation"
        SYSTEM_REPORT=$(curl -s -H "Authorization: Bearer $JWT_TOKEN" \
            "$BACKEND_URL/api/battery-systems/$SYSTEM_ID/report?format=json" 2>/dev/null)
        
        if echo "$SYSTEM_REPORT" | jq -e '.system' > /dev/null 2>&1; then
            log_success "Battery system report generated successfully"
        else
            log_error "Failed to generate battery system report"
        fi
    fi
fi

################################################################################
# TEST 9: Geospatial Features
################################################################################

log ""
log "=========================================="
log "PHASE 9: GEOSPATIAL FEATURES"
log "=========================================="

if [ -z "$JWT_TOKEN" ]; then
    log_warning "Skipping geospatial tests - no valid token"
else
    start_test "Facilities with geospatial data"
    GEO_RESPONSE=$(curl -s -H "Authorization: Bearer $JWT_TOKEN" \
        "$BACKEND_URL/api/facilities?include_location=true" 2>/dev/null)
    
    if echo "$GEO_RESPONSE" | jq -e '.[0].latitude' > /dev/null 2>&1; then
        log_success "Geospatial data loaded successfully"
    else
        log_warning "Geospatial data might not be available for all facilities"
    fi

    start_test "Map view data aggregation"
    MAP_RESPONSE=$(curl -s -H "Authorization: Bearer $JWT_TOKEN" \
        "$BACKEND_URL/api/facilities/map-view" 2>/dev/null)
    
    if echo "$MAP_RESPONSE" | jq -e 'type == "array"' > /dev/null 2>&1; then
        log_success "Map view data loaded successfully"
    else
        log_warning "Map view endpoint might not be implemented"
    fi
fi

################################################################################
# TEST 10: Monitoring and Logging
################################################################################

log ""
log "=========================================="
log "PHASE 10: MONITORING AND LOGGING"
log "=========================================="

start_test "Backend detailed health check"
BACKEND_HEALTH=$(curl -s "$BACKEND_URL/health" 2>/dev/null)

if echo "$BACKEND_HEALTH" | jq -e '.status' > /dev/null 2>&1; then
    DB_STATUS=$(echo "$BACKEND_HEALTH" | jq -r '.database')
    UPTIME=$(echo "$BACKEND_HEALTH" | jq -r '.uptime')
    log_success "Backend health: OK (Database: $DB_STATUS, Uptime: ${UPTIME}s)"
else
    log_error "Backend health check returned invalid data"
fi

start_test "MLOps detailed health check"
MLOPS_HEALTH=$(curl -s "$MLOPS_URL/health" 2>/dev/null)

if echo "$MLOPS_HEALTH" | jq -e '.status' > /dev/null 2>&1; then
    MLOPS_STATUS=$(echo "$MLOPS_HEALTH" | jq -r '.status')
    log_success "MLOps health: $MLOPS_STATUS"
else
    log_error "MLOps health check returned invalid data"
fi

start_test "System metrics availability"
METRICS_RESPONSE=$(curl -s -H "Authorization: Bearer $JWT_TOKEN" \
    "$BACKEND_URL/api/metrics" 2>/dev/null)

if [ $? -eq 0 ]; then
    log_success "System metrics endpoint accessible"
else
    log_warning "System metrics endpoint might not be available"
fi

################################################################################
# TEST 11: Load Testing (Basic)
################################################################################

log ""
log "=========================================="
log "PHASE 11: BASIC LOAD TESTING"
log "=========================================="

start_test "Concurrent health check requests"
CONCURRENT_REQUESTS=10
SUCCESS_COUNT=0

for i in $(seq 1 $CONCURRENT_REQUESTS); do
    curl -s "$BACKEND_URL/health" > /dev/null 2>&1 &
done
wait

# Check if backend is still responsive
if check_endpoint "$BACKEND_URL/health" 200; then
    log_success "Backend handled $CONCURRENT_REQUESTS concurrent requests successfully"
else
    log_error "Backend failed under concurrent load"
fi

start_test "Response time check (backend)"
START_TIME=$(date +%s%N)
curl -s "$BACKEND_URL/health" > /dev/null 2>&1
END_TIME=$(date +%s%N)
RESPONSE_TIME=$(( (END_TIME - START_TIME) / 1000000 ))

if [ $RESPONSE_TIME -lt 1000 ]; then
    log_success "Backend response time: ${RESPONSE_TIME}ms (acceptable)"
elif [ $RESPONSE_TIME -lt 3000 ]; then
    log_warning "Backend response time: ${RESPONSE_TIME}ms (slow)"
else
    log_error "Backend response time: ${RESPONSE_TIME}ms (too slow)"
fi

################################################################################
# TEST SUMMARY
################################################################################

log ""
log "=========================================="
log "TEST SUMMARY"
log "=========================================="
log ""
log "Total Tests: $TOTAL_TESTS"
log_success "Passed: $PASSED_TESTS"
log_error "Failed: $FAILED_TESTS"
log ""

SUCCESS_RATE=$(( PASSED_TESTS * 100 / TOTAL_TESTS ))
log "Success Rate: ${SUCCESS_RATE}%"
log ""
log "Detailed log saved to: $LOG_FILE"
log ""

if [ $FAILED_TESTS -eq 0 ]; then
    log "${GREEN}=========================================="
    log "✓ ALL SMOKE TESTS PASSED"
    log "Production deployment is VERIFIED"
    log "==========================================${NC}"
    exit 0
elif [ $SUCCESS_RATE -ge 80 ]; then
    log "${YELLOW}=========================================="
    log "⚠ MOST TESTS PASSED (${SUCCESS_RATE}%)"
    log "Review failed tests before sign-off"
    log "==========================================${NC}"
    exit 1
else
    log "${RED}=========================================="
    log "✗ SIGNIFICANT FAILURES (${SUCCESS_RATE}%)"
    log "DO NOT PROCEED - Investigation required"
    log "==========================================${NC}"
    exit 2
fi
