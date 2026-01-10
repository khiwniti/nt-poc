#!/bin/bash
# Validate k6 performance test setup

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}=== k6 Performance Test Setup Validation ===${NC}\n"

ERRORS=0
WARNINGS=0

# Function to check file exists
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1"
    else
        echo -e "${RED}✗${NC} $1 (missing)"
        ((ERRORS++))
    fi
}

# Function to check directory exists
check_dir() {
    if [ -d "$1" ]; then
        echo -e "${GREEN}✓${NC} $1/"
    else
        echo -e "${RED}✗${NC} $1/ (missing)"
        ((ERRORS++))
    fi
}

# Check k6 installation
echo "Checking k6 installation..."
if command -v k6 &> /dev/null; then
    K6_VERSION=$(k6 version | head -1)
    echo -e "${GREEN}✓${NC} k6 installed: $K6_VERSION"
else
    echo -e "${YELLOW}⚠${NC} k6 not installed (optional for validation only)"
    echo "  Install: brew install k6 (macOS) or see https://k6.io/docs/getting-started/installation/"
    ((WARNINGS++))
fi
echo ""

# Check directory structure
echo "Checking directory structure..."
check_dir "tests/performance"
check_dir "tests/performance/scenarios"
check_dir "tests/performance/utils"
check_dir "tests/performance/results"
echo ""

# Check test scenario files
echo "Checking test scenarios..."
check_file "tests/performance/scenarios/load-test.js"
check_file "tests/performance/scenarios/stress-test.js"
check_file "tests/performance/scenarios/spike-test.js"
check_file "tests/performance/scenarios/realtime-test.js"
check_file "tests/performance/scenarios/endurance-test.js"
echo ""

# Check utility files
echo "Checking utility files..."
check_file "tests/performance/utils/api.js"
check_file "tests/performance/utils/monitoring.js"
echo ""

# Check configuration files
echo "Checking configuration files..."
check_file "tests/performance/config.js"
check_file "tests/performance/package.json"
check_file "tests/performance/run-tests.sh"
check_file "tests/performance/docker-compose.perf.yml"
check_file "tests/performance/.gitignore"
echo ""

# Check documentation
echo "Checking documentation..."
check_file "tests/performance/README.md"
check_file "T214_ACCEPTANCE_CHECKLIST.md"
check_file "T214_QUICK_REFERENCE.md"
check_file "T214_IMPLEMENTATION_COMPLETE.md"
echo ""

# Check CI/CD workflow
echo "Checking CI/CD integration..."
check_file ".github/workflows/performance.yml"
echo ""

# Check executable permissions
echo "Checking executable permissions..."
if [ -x "tests/performance/run-tests.sh" ]; then
    echo -e "${GREEN}✓${NC} run-tests.sh is executable"
else
    echo -e "${RED}✗${NC} run-tests.sh is not executable"
    echo "  Fix: chmod +x tests/performance/run-tests.sh"
    ((ERRORS++))
fi
echo ""

# Validate JSON files
echo "Validating JSON files..."
if command -v jq &> /dev/null; then
    if jq empty tests/performance/package.json 2>/dev/null; then
        echo -e "${GREEN}✓${NC} package.json is valid JSON"
    else
        echo -e "${RED}✗${NC} package.json has invalid JSON"
        ((ERRORS++))
    fi
else
    echo -e "${YELLOW}⚠${NC} jq not installed, skipping JSON validation"
    ((WARNINGS++))
fi
echo ""

# Check NPM scripts
echo "Checking NPM scripts..."
if [ -f "tests/performance/package.json" ]; then
    SCRIPTS=$(cat tests/performance/package.json | grep -o '"test:[^"]*"' | wc -l)
    echo -e "${GREEN}✓${NC} Found $SCRIPTS test scripts in package.json"
else
    echo -e "${RED}✗${NC} package.json not found"
    ((ERRORS++))
fi
echo ""

# Backend check
echo "Checking backend availability (optional)..."
if curl -s -f http://localhost:3000/api/v1/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Backend is running at http://localhost:3000"
else
    echo -e "${YELLOW}⚠${NC} Backend is not running (start with: cd services/backend && npm run dev)"
    ((WARNINGS++))
fi
echo ""

# Summary
echo -e "${GREEN}=== Validation Summary ===${NC}"
echo "Files checked: Complete"
echo "Errors: $ERRORS"
echo "Warnings: $WARNINGS"
echo ""

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Install k6 if not already installed:"
    echo "     macOS: brew install k6"
    echo "     Linux: See https://k6.io/docs/getting-started/installation/"
    echo ""
    echo "  2. Start the backend:"
    echo "     cd services/backend && npm run dev"
    echo ""
    echo "  3. Run tests:"
    echo "     cd tests/performance"
    echo "     npm run test:load:light"
    echo ""
    exit 0
else
    echo -e "${RED}✗ Validation failed with $ERRORS error(s)${NC}"
    exit 1
fi
