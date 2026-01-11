#!/bin/bash
# OWASP ZAP Automated Security Scan Script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SECURITY_DIR="$(dirname "$SCRIPT_DIR")"
REPORTS_DIR="${SECURITY_DIR}/reports"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create reports directory
mkdir -p "$REPORTS_DIR"

echo -e "${GREEN}Starting OWASP ZAP Security Scan${NC}"
echo "Timestamp: $TIMESTAMP"
echo "Reports will be saved to: $REPORTS_DIR"

# Start services
echo -e "${YELLOW}Starting test environment...${NC}"
cd "$SECURITY_DIR"
docker-compose -f docker-compose.zap.yml up -d

# Wait for services to be healthy
echo -e "${YELLOW}Waiting for services to be ready...${NC}"
for i in {1..30}; do
    if docker-compose -f docker-compose.zap.yml ps | grep -q "healthy"; then
        echo -e "${GREEN}Services are ready${NC}"
        break
    fi
    echo -n "."
    sleep 2
done

# Wait additional time for ZAP to fully initialize
echo -e "${YELLOW}Initializing ZAP...${NC}"
sleep 10

# Get backend URL
BACKEND_URL="http://backend:3000"
ZAP_HOST="localhost"
ZAP_PORT="8080"

echo -e "${YELLOW}Checking ZAP availability...${NC}"
for i in {1..10}; do
    if curl -s "http://${ZAP_HOST}:${ZAP_PORT}" > /dev/null 2>&1; then
        echo -e "${GREEN}ZAP is accessible${NC}"
        break
    fi
    echo -n "."
    sleep 2
done

# Generate JWT token for authenticated scanning
echo -e "${YELLOW}Generating authentication token...${NC}"
JWT_TOKEN=$(docker-compose -f docker-compose.zap.yml exec -T backend node -e "
const jwt = require('jsonwebtoken');
const token = jwt.sign(
  { userId: 'test-user', role: 'admin' },
  process.env.JWT_SECRET || 'test-security-secret',
  { expiresIn: '2h' }
);
console.log(token);
" 2>/dev/null | tr -d '\r')

if [ -z "$JWT_TOKEN" ]; then
    echo -e "${RED}Failed to generate JWT token${NC}"
    JWT_TOKEN="dummy-token-for-unauth-tests"
fi

echo "JWT Token: ${JWT_TOKEN:0:20}..."

# Run ZAP baseline scan
echo -e "${YELLOW}Running ZAP Baseline Scan...${NC}"
docker-compose -f docker-compose.zap.yml exec -T zap \
    zap-baseline.py \
    -t "$BACKEND_URL/api/v1" \
    -r "baseline-report-${TIMESTAMP}.html" \
    -w "baseline-report-${TIMESTAMP}.md" \
    -J "baseline-report-${TIMESTAMP}.json" \
    -x "baseline-report-${TIMESTAMP}.xml" \
    -d \
    -I \
    -m 5 \
    || echo -e "${YELLOW}Baseline scan completed with findings${NC}"

# Run ZAP full scan using automation framework
echo -e "${YELLOW}Running ZAP Full Scan with Automation Framework...${NC}"
docker-compose -f docker-compose.zap.yml exec -T -e JWT_TOKEN="$JWT_TOKEN" zap \
    zap.sh \
    -cmd \
    -autorun /zap/zap-config.yaml \
    -addonupdate \
    || echo -e "${YELLOW}Full scan completed${NC}"

# Run API scan
echo -e "${YELLOW}Running ZAP API Scan...${NC}"
docker-compose -f docker-compose.zap.yml exec -T zap \
    zap-api-scan.py \
    -t "$BACKEND_URL/api/v1" \
    -f openapi \
    -r "api-report-${TIMESTAMP}.html" \
    -w "api-report-${TIMESTAMP}.md" \
    -J "api-report-${TIMESTAMP}.json" \
    -x "api-report-${TIMESTAMP}.xml" \
    -d \
    -I \
    || echo -e "${YELLOW}API scan completed with findings${NC}"

# Copy reports from container
echo -e "${YELLOW}Copying reports...${NC}"
docker cp owasp-zap:/zap/reports/. "$REPORTS_DIR/" 2>/dev/null || true
docker cp owasp-zap:/zap/wrk/. "$REPORTS_DIR/" 2>/dev/null || true

# Generate summary
echo -e "${YELLOW}Generating summary report...${NC}"
bash "${SCRIPT_DIR}/analyze-zap-results.sh" "$REPORTS_DIR" "$TIMESTAMP"

# Cleanup
if [ "${KEEP_RUNNING}" != "true" ]; then
    echo -e "${YELLOW}Stopping test environment...${NC}"
    docker-compose -f docker-compose.zap.yml down -v
fi

echo -e "${GREEN}Security scan completed!${NC}"
echo "Reports available in: $REPORTS_DIR"
echo ""
echo "View the HTML report: open $REPORTS_DIR/baseline-report-${TIMESTAMP}.html"
echo "View the summary: cat $REPORTS_DIR/summary-${TIMESTAMP}.txt"
