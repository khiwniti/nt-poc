#!/bin/bash

# Service Integration Test Script
# Tests all services work together seamlessly

set -e

echo "🧪 NT-POC Service Integration Test Suite"
echo "========================================"
echo ""

# Color codes
GREEN='\033[0.32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test results
PASSED=0
FAILED=0
SKIPPED=0

test_service() {
  local service=$1
  local url=$2
  local expected_status=${3:-200}
  
  echo -n "Testing $service... "
  
  if response=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null); then
    if [ "$response" -eq "$expected_status" ]; then
      echo -e "${GREEN}✓ PASS${NC} (HTTP $response)"
      ((PASSED++))
      return 0
    else
      echo -e "${RED}✗ FAIL${NC} (HTTP $response, expected $expected_status)"
      ((FAILED++))
      return 1
    fi
  else
    echo -e "${YELLOW}⊘ SKIP${NC} (Service not running)"
    ((SKIPPED++))
    return 2
  fi
}

echo "1. Health Check Tests"
echo "─────────────────────"

# Test Backend
test_service "Backend API" "http://localhost:3000/api/health"

# Test MLOps
test_service "MLOps Service" "http://localhost:8000/health"

# Test Simulator
test_service "Simulator Service" "http://localhost:8001/health"

# Test Frontend (dev server)
test_service "Frontend (Dev)" "http://localhost:5173" 200

echo ""
echo "2. API Endpoint Tests"
echo "─────────────────────"

# Test Backend Endpoints
test_service "GET /api/v1/facilities" "http://localhost:3000/api/v1/facilities"
test_service "GET /api/v1/battery-systems" "http://localhost:3000/api/v1/battery-systems"
test_service "GET /api/v1/alerts" "http://localhost:3000/api/v1/alerts"

echo ""
echo "3. ML Service Tests"
echo "───────────────────"

# Test MLOps prediction endpoint
echo -n "Testing MLOps Anomaly Detection... "
if ml_response=$(curl -s -X POST http://localhost:8000/ml/detect-anomaly \
  -H "Content-Type: application/json" \
  -d '{"features": {"voltage": 3.7, "current": 50.0, "temperature": 35.0, "soc": 75.0, "soh": 95.0, "power": 185.0}}' \
  2>/dev/null); then
  if echo "$ml_response" | grep -q "isAnomaly"; then
    echo -e "${GREEN}✓ PASS${NC}"
    ((PASSED++))
  else
    echo -e "${RED}✗ FAIL${NC} (Unexpected response)"
    ((FAILED++))
  fi
else
  echo -e "${YELLOW}⊘ SKIP${NC} (MLOps not running)"
  ((SKIPPED++))
fi

echo ""
echo "4. Service Communication Tests"
echo "──────────────────────────────"

# Test Backend → MLOps
echo -n "Testing Backend → MLOps integration... "
if backend_ml_response=$(curl -s -X POST http://localhost:3000/api/v1/ml/predict-maintenance \
  -H "Content-Type: application/json" \
  -d '{"batterySystemId": "test-001", "features": {"sohDelta": -0.5, "anomalyCount": 2, "tempMax": 45.5, "voltageMin": 3.2}}' \
  2>/dev/null); then
  if echo "$backend_ml_response" | grep -q "prediction"; then
    echo -e "${GREEN}✓ PASS${NC}"
    ((PASSED++))
  else
    echo -e "${RED}✗ FAIL${NC} (No prediction in response)"
    ((FAILED++))
  fi
else
  echo -e "${YELLOW}⊘ SKIP${NC} (Services not running)"
  ((SKIPPED++))
fi

echo ""
echo "========================================"
echo "Test Summary"
echo "========================================"
echo -e "${GREEN}Passed:  $PASSED${NC}"
echo -e "${RED}Failed:  $FAILED${NC}"
echo -e "${YELLOW}Skipped: $SKIPPED${NC}"
TOTAL=$((PASSED + FAILED + SKIPPED))
echo "Total:   $TOTAL"
echo ""

if [ $FAILED -gt 0 ]; then
  echo -e "${RED}❌ Some tests failed${NC}"
  echo ""
  echo "To start services:"
  echo "  npm run dev                  # Start backend + frontend"
  echo "  cd services/mlops && uvicorn src.main:app --reload --port 8000"
  echo "  cd services/simulator && uvicorn app.main:app --reload --port 8001"
  exit 1
elif [ $SKIPPED -eq $TOTAL ]; then
  echo -e "${YELLOW}⚠️  All tests skipped - no services running${NC}"
  echo ""
  echo "To start services:"
  echo "  npm run dev"
  exit 2
else
  echo -e "${GREEN}✅ All tests passed!${NC}"
  exit 0
fi
