#!/bin/bash
# Dependency Cleanup Script
# This script performs a comprehensive cleanup of project dependencies

set -e

echo "🧹 Starting Dependency Cleanup..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "ℹ $1"
}

# Step 1: Clean Node.js dependencies
echo "Step 1: Cleaning Node.js dependencies..."
if [ -d "node_modules" ]; then
    rm -rf node_modules
    print_success "Removed root node_modules"
fi

if [ -d "services/backend/node_modules" ]; then
    rm -rf services/backend/node_modules
    print_success "Removed backend node_modules"
fi

if [ -d "services/frontend/node_modules" ]; then
    rm -rf services/frontend/node_modules
    print_success "Removed frontend node_modules"
fi

# Step 2: Clean build artifacts
echo ""
echo "Step 2: Cleaning build artifacts..."
if [ -d "services/backend/dist" ]; then
    rm -rf services/backend/dist
    print_success "Removed backend dist"
fi

if [ -d "services/frontend/dist" ]; then
    rm -rf services/frontend/dist
    print_success "Removed frontend dist"
fi

# Step 3: Clean Python cache files
echo ""
echo "Step 3: Cleaning Python cache files..."
find services -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
find services -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
find services -type d -name "*.egg-info" -exec rm -rf {} + 2>/dev/null || true
find services -type f -name "*.pyc" -delete 2>/dev/null || true
print_success "Removed Python cache files"

# Step 4: Clean Python virtual environments (be careful!)
echo ""
echo "Step 4: Cleaning Python virtual environments..."
print_warning "Skipping venv removal - manual action required if needed"
print_info "  To remove venvs, run: find services -type d -name 'venv' -exec rm -rf {} +"
print_info "  To remove .venvs, run: find services -type d -name '.venv' -exec rm -rf {} +"

# Step 5: Clean test coverage reports
echo ""
echo "Step 5: Cleaning test coverage reports..."
find . -type d -name "coverage" -exec rm -rf {} + 2>/dev/null || true
find . -type d -name ".coverage" -exec rm -rf {} + 2>/dev/null || true
find . -type d -name "htmlcov" -exec rm -rf {} + 2>/dev/null || true
find . -type f -name ".coverage" -delete 2>/dev/null || true
print_success "Removed test coverage reports"

# Step 6: Clean playwright artifacts
echo ""
echo "Step 6: Cleaning playwright artifacts..."
if [ -d "services/frontend/playwright-report" ]; then
    rm -rf services/frontend/playwright-report
    print_success "Removed playwright reports"
fi

if [ -d "services/frontend/test-results" ]; then
    rm -rf services/frontend/test-results
    print_success "Removed playwright test results"
fi

# Step 7: Reinstall Node.js dependencies
echo ""
echo "Step 7: Reinstalling Node.js dependencies..."
print_info "This may take a few minutes..."
if npm install; then
    print_success "Node.js dependencies installed successfully"
else
    print_error "Failed to install Node.js dependencies"
    exit 1
fi

# Step 8: Run audit
echo ""
echo "Step 8: Running security audit..."
npm audit --workspaces --omit=dev || print_warning "Some vulnerabilities found (see above)"

# Step 9: Check for outdated packages
echo ""
echo "Step 9: Checking for outdated packages..."
print_info "Top 10 most outdated packages:"
npm outdated 2>/dev/null | head -11 || print_info "No outdated packages found"

# Summary
echo ""
echo "================================================"
echo "🎉 Cleanup Complete!"
echo "================================================"
echo ""
print_info "Next steps:"
echo "  1. Review DEPENDENCY_CLEANUP_REPORT.md for detailed analysis"
echo "  2. Run tests: npm test"
echo "  3. Check for breaking changes before updating major versions"
echo "  4. Consider updating critical packages (see report)"
echo ""
print_success "All cleanup tasks completed successfully!"
