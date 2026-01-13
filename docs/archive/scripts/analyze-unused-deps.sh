#!/bin/bash
# Script to analyze and help identify unused dependencies
# This script uses depcheck to find unused dependencies

set -e

echo "🔍 Analyzing Dependencies for Unused Packages..."
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() {
    echo -e "${BLUE}=====================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}=====================================${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# Check if depcheck is installed
if ! command -v npx &> /dev/null; then
    echo "npx not found. Please install Node.js and npm."
    exit 1
fi

# Analyze Backend
print_header "Analyzing Backend Service"
cd services/backend
echo "Checking for unused dependencies in backend..."
npx depcheck --json > ../../backend-depcheck.json 2>/dev/null || true
npx depcheck
echo ""

# Analyze Frontend
cd ../..
print_header "Analyzing Frontend Service"
cd services/frontend
echo "Checking for unused dependencies in frontend..."
npx depcheck --json > ../../frontend-depcheck.json 2>/dev/null || true
npx depcheck
echo ""

# Back to root
cd ../..

# Summary
print_header "Analysis Complete"
echo ""
print_info "JSON reports saved to:"
echo "  - backend-depcheck.json"
echo "  - frontend-depcheck.json"
echo ""
print_info "Review the output above to identify:"
echo "  1. Unused dependencies (can be removed)"
echo "  2. Unused devDependencies (can be removed)"
echo "  3. Missing dependencies (should be added)"
echo ""
print_success "Analysis complete!"
