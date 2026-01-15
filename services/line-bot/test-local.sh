#!/bin/bash

# LINE Bot Local Testing Script
# This script tests all major functionality of the LINE Bot service locally

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}✗ Error: .env file not found${NC}"
    echo "Please create .env file from .env.example"
    exit 1
fi

# Load environment variables
source .env

# Check if API_SECRET_KEY is set
if [ -z "$API_SECRET_KEY" ]; then
    echo -e "${YELLOW}⚠ Warning: API_SECRET_KEY not set in .env${NC}"
    echo "Generate one with: openssl rand -hex 32"
fi

# Configuration
BASE_URL="http://localhost:${PORT:-3002}"
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     LINE Bot Local Development Testing        ║${NC}"
echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo ""
echo -e "Base URL: ${BLUE}$BASE_URL${NC}"
echo -e "Environment: ${BLUE}${NODE_ENV:-development}${NC}"
echo ""

# Function to print test result
print_result() {
    local test_name=$1
    local result=$2
    local message=$3
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if [ "$result" = "pass" ]; then
        echo -e "${GREEN}✓${NC} $test_name"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}✗${NC} $test_name"
        if [ -n "$message" ]; then
            echo -e "  ${RED}Error: $message${NC}"
        fi
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

# Function to check if service is running
check_service() {
    echo -e "${YELLOW}Checking if service is running...${NC}"
    
    if curl -s -f "$BASE_URL/health" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Service is running${NC}"
        return 0
    else
        echo -e "${RED}✗ Service is not running${NC}"
        echo -e "${YELLOW}Please start the service with: npm run dev${NC}"
        exit 1
    fi
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}1. Service Health Check${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

check_service

# Test 1: Health endpoint
response=$(curl -s "$BASE_URL/health")
if echo "$response" | jq -e '.status == "ok" and .service == "line-bot"' > /dev/null 2>&1; then
    print_result "Health endpoint returns correct response" "pass"
else
    print_result "Health endpoint returns correct response" "fail" "Response: $response"
fi

# Test response time
start_time=$(date +%s%N)
curl -s "$BASE_URL/health" > /dev/null
end_time=$(date +%s%N)
response_time=$(( (end_time - start_time) / 1000000 ))

if [ $response_time -lt 100 ]; then
    print_result "Health endpoint response time < 100ms ($response_time ms)" "pass"
else
    print_result "Health endpoint response time < 100ms ($response_time ms)" "fail"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}2. Authentication & Security${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Test 2: Request without API key
http_code=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "$BASE_URL/notify" \
    -H "Content-Type: application/json" \
    -d '{"message": "Test"}')

if [ "$http_code" = "401" ]; then
    print_result "Rejects requests without API key (401)" "pass"
else
    print_result "Rejects requests without API key (401)" "fail" "Got HTTP $http_code"
fi

# Test 3: Request with invalid API key
http_code=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "$BASE_URL/notify" \
    -H "Content-Type: application/json" \
    -H "x-api-key: invalid_key_12345" \
    -d '{"message": "Test"}')

if [ "$http_code" = "401" ]; then
    print_result "Rejects requests with invalid API key (401)" "pass"
else
    print_result "Rejects requests with invalid API key (401)" "fail" "Got HTTP $http_code"
fi

# Test 4: Request with valid API key (if set)
if [ -n "$API_SECRET_KEY" ]; then
    http_code=$(curl -s -o /dev/null -w "%{http_code}" \
        -X POST "$BASE_URL/notify" \
        -H "Content-Type: application/json" \
        -H "x-api-key: $API_SECRET_KEY" \
        -d '{"message": "Test notification from automation script 🤖"}')
    
    if [ "$http_code" = "200" ]; then
        print_result "Accepts requests with valid API key (200)" "pass"
    else
        print_result "Accepts requests with valid API key (200)" "fail" "Got HTTP $http_code"
    fi
else
    echo -e "${YELLOW}⚠ Skipping valid API key test (API_SECRET_KEY not set)${NC}"
fi

# Test 5: Security headers
headers=$(curl -s -I "$BASE_URL/health")

if echo "$headers" | grep -q "X-Content-Type-Options: nosniff"; then
    print_result "Security header: X-Content-Type-Options present" "pass"
else
    print_result "Security header: X-Content-Type-Options present" "fail"
fi

if echo "$headers" | grep -q "X-Frame-Options"; then
    print_result "Security header: X-Frame-Options present" "pass"
else
    print_result "Security header: X-Frame-Options present" "fail"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}3. Input Validation${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -n "$API_SECRET_KEY" ]; then
    # Test 6: Empty message
    response=$(curl -s -X POST "$BASE_URL/notify" \
        -H "Content-Type: application/json" \
        -H "x-api-key: $API_SECRET_KEY" \
        -d '{"message": ""}')
    
    if echo "$response" | grep -q "cannot be empty"; then
        print_result "Rejects empty messages" "pass"
    else
        print_result "Rejects empty messages" "fail" "Response: $response"
    fi
    
    # Test 7: Missing message
    response=$(curl -s -X POST "$BASE_URL/notify" \
        -H "Content-Type: application/json" \
        -H "x-api-key: $API_SECRET_KEY" \
        -d '{}')
    
    if echo "$response" | grep -q "required"; then
        print_result "Rejects missing message field" "pass"
    else
        print_result "Rejects missing message field" "fail" "Response: $response"
    fi
    
    # Test 8: Non-string message
    response=$(curl -s -X POST "$BASE_URL/notify" \
        -H "Content-Type: application/json" \
        -H "x-api-key: $API_SECRET_KEY" \
        -d '{"message": 123}')
    
    if echo "$response" | grep -q "must be a string"; then
        print_result "Rejects non-string messages" "pass"
    else
        print_result "Rejects non-string messages" "fail" "Response: $response"
    fi
    
    # Test 9: Valid message with emoji
    http_code=$(curl -s -o /dev/null -w "%{http_code}" \
        -X POST "$BASE_URL/notify" \
        -H "Content-Type: application/json" \
        -H "x-api-key: $API_SECRET_KEY" \
        -d '{"message": "Test message with emoji 🚀✅🔒"}')
    
    if [ "$http_code" = "200" ]; then
        print_result "Accepts valid messages with emoji" "pass"
    else
        print_result "Accepts valid messages with emoji" "fail" "Got HTTP $http_code"
    fi
else
    echo -e "${YELLOW}⚠ Skipping validation tests (API_SECRET_KEY not set)${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}4. Configuration Check${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check environment variables
env_checks=(
    "LINE_CHANNEL_ACCESS_TOKEN:LINE Channel Access Token"
    "LINE_CHANNEL_SECRET:LINE Channel Secret"
    "OPENAI_API_KEY:OpenAI API Key"
    "API_SECRET_KEY:API Secret Key"
)

for check in "${env_checks[@]}"; do
    IFS=':' read -r var_name display_name <<< "$check"
    if [ -n "${!var_name}" ]; then
        echo -e "${GREEN}✓${NC} $display_name is configured"
    else
        echo -e "${YELLOW}⚠${NC} $display_name is NOT configured"
    fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}5. Summary${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo -e "Total Tests:  ${BLUE}$TOTAL_TESTS${NC}"
echo -e "Passed:       ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed:       ${RED}$FAILED_TESTS${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}╔════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║           🎉 All tests passed! 🎉              ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BLUE}Next Steps:${NC}"
    echo "1. Configure LINE webhook with ngrok"
    echo "2. Test webhook integration via LINE app"
    echo "3. Test AI responses"
    echo "4. Check logs for any warnings"
    echo ""
    exit 0
else
    echo -e "${RED}╔════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║          ⚠️  Some tests failed  ⚠️             ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${YELLOW}Troubleshooting:${NC}"
    echo "1. Check .env file configuration"
    echo "2. Verify service is running (npm run dev)"
    echo "3. Check logs for errors"
    echo "4. Review failed test output above"
    echo ""
    exit 1
