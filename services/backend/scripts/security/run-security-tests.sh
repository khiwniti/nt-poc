#!/usr/bin/env bash

# Security Test Runner Script
# Runs all security tests including OWASP ZAP scans

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$PROJECT_ROOT"

echo "🔒 Security Test Suite"
echo "====================="
echo ""

# Configuration
export ZAP_TARGET_URL="${ZAP_TARGET_URL:-http://localhost:3001}"
export ZAP_API_KEY="${ZAP_API_KEY:-changeme}"
export ZAP_PORT="${ZAP_PORT:-8080}"
export ZAP_HOST="${ZAP_HOST:-localhost}"

# Parse arguments
RUN_UNIT_TESTS=true
RUN_ZAP_SCAN=false
START_ZAP=false
STOP_ZAP_AFTER=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --zap)
      RUN_ZAP_SCAN=true
      shift
      ;;
    --start-zap)
      START_ZAP=true
      shift
      ;;
    --stop-zap)
      STOP_ZAP_AFTER=true
      shift
      ;;
    --unit-only)
      RUN_UNIT_TESTS=true
      RUN_ZAP_SCAN=false
      shift
      ;;
    --help)
      echo "Usage: $0 [options]"
      echo ""
      echo "Options:"
      echo "  --zap          Run OWASP ZAP integration tests"
      echo "  --start-zap    Start ZAP before running tests"
      echo "  --stop-zap     Stop ZAP after running tests"
      echo "  --unit-only    Run only unit security tests (default)"
      echo "  --help         Show this help message"
      echo ""
      echo "Environment Variables:"
      echo "  ZAP_TARGET_URL   Target URL for scanning (default: http://localhost:3001)"
      echo "  ZAP_API_KEY      ZAP API key (default: changeme)"
      echo "  ZAP_PORT         ZAP port (default: 8080)"
      echo ""
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

# Start ZAP if requested
if [ "$START_ZAP" = true ] || [ "$RUN_ZAP_SCAN" = true ]; then
  echo "1. Starting OWASP ZAP..."
  bash scripts/security/zap-start.sh
  echo ""
fi

# Run unit security tests
if [ "$RUN_UNIT_TESTS" = true ]; then
  echo "2. Running Security Unit Tests..."
  echo "--------------------------------"
  npm test -- src/test/security/__tests__/sqlInjection.test.ts
  npm test -- src/test/security/__tests__/xss.test.ts
  npm test -- src/test/security/__tests__/csrf.test.ts
  npm test -- src/test/security/__tests__/authBypass.test.ts
  echo ""
  echo "✓ Unit security tests completed"
  echo ""
fi

# Run ZAP integration tests
if [ "$RUN_ZAP_SCAN" = true ]; then
  echo "3. Running OWASP ZAP Integration Tests..."
  echo "----------------------------------------"
  
  # Ensure backend is running
  if ! curl -s "${ZAP_TARGET_URL}/api/v1/monitoring/health" > /dev/null 2>&1; then
    echo "⚠️  Warning: Backend not responding at ${ZAP_TARGET_URL}"
    echo "   Start backend with: npm run dev"
    echo ""
  fi
  
  npm test -- src/test/security/__tests__/zapIntegration.test.ts
  echo ""
  echo "✓ ZAP integration tests completed"
  echo ""
fi

# Stop ZAP if requested
if [ "$STOP_ZAP_AFTER" = true ]; then
  echo "4. Stopping OWASP ZAP..."
  bash scripts/security/zap-stop.sh
  echo ""
fi

echo "============================================"
echo "✅ Security Test Suite Completed"
echo "============================================"
echo ""
echo "Reports generated in: ./security-reports"
echo ""
