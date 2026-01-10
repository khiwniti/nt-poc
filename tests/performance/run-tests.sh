#!/bin/bash
# Run performance test suite and generate report

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${BASE_URL:-http://localhost:3000}"
RESULTS_DIR="$SCRIPT_DIR/results"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
REPORT_FILE="$RESULTS_DIR/report-${TIMESTAMP}.txt"

echo -e "${GREEN}=== k6 Performance Test Suite ===${NC}"
echo "Base URL: $BASE_URL"
echo "Results directory: $RESULTS_DIR"
echo "Timestamp: $TIMESTAMP"
echo ""

# Check if k6 is installed
if ! command -v k6 &> /dev/null; then
    echo -e "${RED}Error: k6 is not installed${NC}"
    echo "Install k6: https://k6.io/docs/getting-started/installation/"
    exit 1
fi

# Check if backend is running
echo -e "${YELLOW}Checking if backend is running...${NC}"
if ! curl -s -f "${BASE_URL}/api/v1/health" > /dev/null; then
    echo -e "${RED}Error: Backend is not running at ${BASE_URL}${NC}"
    echo "Start the backend first: cd services/backend && npm run dev"
    exit 1
fi
echo -e "${GREEN}✓ Backend is running${NC}"
echo ""

# Create results directory
mkdir -p "$RESULTS_DIR"

# Initialize report
echo "Performance Test Report - ${TIMESTAMP}" > "$REPORT_FILE"
echo "Base URL: ${BASE_URL}" >> "$REPORT_FILE"
echo "========================================" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Run tests
run_test() {
    local test_name=$1
    local test_file=$2
    local test_args=$3
    
    echo -e "${YELLOW}Running ${test_name}...${NC}"
    echo "${test_name}" >> "$REPORT_FILE"
    echo "---" >> "$REPORT_FILE"
    
    if k6 run "scenarios/${test_file}" --env BASE_URL="${BASE_URL}" ${test_args} >> "$REPORT_FILE" 2>&1; then
        echo -e "${GREEN}✓ ${test_name} completed${NC}"
        echo "" >> "$REPORT_FILE"
        return 0
    else
        echo -e "${RED}✗ ${test_name} failed${NC}"
        echo "FAILED" >> "$REPORT_FILE"
        echo "" >> "$REPORT_FILE"
        return 1
    fi
}

# Track results
TESTS_PASSED=0
TESTS_FAILED=0

# Run test suite
echo -e "${GREEN}Starting test suite...${NC}"
echo ""

# 1. Load test - light
if run_test "Load Test (100 users)" "load-test.js" "--env SCENARIO=light"; then
    ((TESTS_PASSED++))
else
    ((TESTS_FAILED++))
fi

# 2. Load test - medium
if run_test "Load Test (500 users)" "load-test.js" "--env SCENARIO=medium"; then
    ((TESTS_PASSED++))
else
    ((TESTS_FAILED++))
fi

# 3. Stress test
if run_test "Stress Test" "stress-test.js" ""; then
    ((TESTS_PASSED++))
else
    ((TESTS_FAILED++))
fi

# 4. Spike test
if run_test "Spike Test" "spike-test.js" ""; then
    ((TESTS_PASSED++))
else
    ((TESTS_FAILED++))
fi

# 5. Real-time test
if run_test "Real-time Latency Test" "realtime-test.js" ""; then
    ((TESTS_PASSED++))
else
    ((TESTS_FAILED++))
fi

# Summary
echo ""
echo -e "${GREEN}=== Test Suite Summary ===${NC}"
echo "Tests passed: ${TESTS_PASSED}"
echo "Tests failed: ${TESTS_FAILED}"
echo "Report: ${REPORT_FILE}"

echo "" >> "$REPORT_FILE"
echo "========================================" >> "$REPORT_FILE"
echo "Summary" >> "$REPORT_FILE"
echo "Tests passed: ${TESTS_PASSED}" >> "$REPORT_FILE"
echo "Tests failed: ${TESTS_FAILED}" >> "$REPORT_FILE"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed${NC}"
    exit 1
fi
