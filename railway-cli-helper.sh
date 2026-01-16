#!/bin/bash

# Railway CLI Helper Script
# This script provides common Railway CLI commands for the NT-POC project

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}==================================${NC}"
echo -e "${BLUE}Railway CLI Helper for NT-POC${NC}"
echo -e "${BLUE}==================================${NC}"
echo ""

# Function to print section headers
print_header() {
    echo -e "\n${GREEN}>>> $1${NC}\n"
}

# Function to print commands
print_cmd() {
    echo -e "${YELLOW}$ $1${NC}"
}

# Function to run command
run_cmd() {
    echo -e "${YELLOW}$ $1${NC}"
    eval "$1"
    echo ""
}

# Check if Railway is installed
print_header "1. Checking Railway CLI"
run_cmd "railway --version"

# Show current project
print_header "2. Current Project Info"
run_cmd "railway status"

# Show all services
print_header "3. List All Services"
run_cmd "railway service list"

# Show backend service details
print_header "4. Backend Service Status"
print_cmd "railway link --service backend && railway status"
railway link --service backend
railway status
echo ""

# Show backend environment variables
print_header "5. Backend Environment Variables"
print_cmd "railway variables"
railway variables | grep -E "NODE_ENV|PORT|DATABASE_URL|RAILWAY_SERVICE" || railway variables
echo ""

# Check latest backend deployment
print_header "6. Latest Backend Deployment"
print_cmd "railway deployments list --limit 1"
railway deployments list --limit 1 || echo "Command not available in CLI v4.23"
echo ""

# Show backend logs (last 50 lines)
print_header "7. Backend Recent Logs"
print_cmd "railway logs --limit 50"
echo -e "${YELLOW}Note: Press Ctrl+C to stop log streaming${NC}"
echo ""
sleep 2
railway logs --limit 50 || railway logs
echo ""

print_header "8. Available Railway CLI Commands"
echo -e "${BLUE}Common commands you can use:${NC}"
echo ""
echo -e "  ${GREEN}railway status${NC}              - Show current project and service"
echo -e "  ${GREEN}railway service list${NC}        - List all services in project"
echo -e "  ${GREEN}railway link --service <name>${NC} - Link to specific service"
echo -e "  ${GREEN}railway variables${NC}           - Show environment variables"
echo -e "  ${GREEN}railway variables set KEY=value${NC} - Set environment variable"
echo -e "  ${GREEN}railway logs${NC}                - Stream service logs"
echo -e "  ${GREEN}railway logs --limit 100${NC}    - Show last 100 log lines"
echo -e "  ${GREEN}railway up${NC}                  - Deploy current directory"
echo -e "  ${GREEN}railway run <command>${NC}       - Run command with Railway env vars"
echo -e "  ${GREEN}railway connect${NC}             - Connect to database (psql)"
echo ""

print_header "9. What CLI CANNOT Do"
echo -e "${RED}❌ Cannot delete services${NC} - Use Railway Dashboard"
echo -e "${RED}❌ Cannot create new services${NC} - Use Railway Dashboard"
echo -e "${RED}❌ Cannot change builder settings${NC} - Use Railway Dashboard"
echo -e "${RED}❌ Cannot run migrations directly${NC} - Database URL uses internal networking"
echo ""

print_header "10. Service Recreation Instructions"
echo -e "${BLUE}To recreate frontend/mlops/simulator services:${NC}"
echo ""
echo -e "1. Go to Railway Dashboard: ${GREEN}https://railway.app/dashboard${NC}"
echo -e "2. Open project: ${GREEN}nt-poc-battery-management${NC}"
echo -e "3. For each service (frontend, mlops, simulator):"
echo -e "   - Click service → Settings → Delete Service"
echo -e "   - Click + New → Empty Service"
echo -e "   - Name: ${GREEN}<service-name>${NC}"
echo -e "   - Settings → Source → Connect ${GREEN}khiwniti/nt-poc${NC}"
echo -e "   - Settings → Build → Builder: ${GREEN}Dockerfile${NC}"
echo -e "   - Dockerfile Path: ${GREEN}services/<service>/Dockerfile${NC}"
echo ""

print_header "11. Database Migration Instructions"
echo -e "${BLUE}To run database migrations:${NC}"
echo ""
echo -e "1. Go to Railway Dashboard"
echo -e "2. Click ${GREEN}backend${NC} service"
echo -e "3. Find 'Run Command' or 'One-off Commands'"
echo -e "4. Run: ${GREEN}npm run migrate${NC}"
echo -e "5. (Optional) Run: ${GREEN}npm run seed:run${NC}"
echo ""
echo -e "${YELLOW}Why not from CLI?${NC}"
echo -e "DATABASE_URL uses ${RED}postgres.railway.internal${NC} which is only"
echo -e "accessible from within Railway's network, not from your local machine."
echo ""

print_header "12. Quick Links"
echo -e "${GREEN}Backend URL:${NC}   https://backend-production-77f7.up.railway.app"
echo -e "${GREEN}LINE-bot URL:${NC}  https://line-bot-production-8114.up.railway.app"
echo -e "${GREEN}Railway Dashboard:${NC} https://railway.app/dashboard"
echo ""

print_header "13. Documentation"
echo -e "📚 ${BLUE}FRONTEND_RECREATION_STEPS.md${NC} - Interactive frontend recreation guide"
echo -e "📚 ${BLUE}RAILWAY_MLOPS_SIMULATOR_RECREATION_GUIDE.md${NC} - Python services guide"
echo -e "📚 ${BLUE}DATABASE_MIGRATION_RAILWAY_INSTRUCTIONS.md${NC} - Database migration guide"
echo -e "📚 ${BLUE}LINE_OA_CONFIGURATION_GUIDE.md${NC} - LINE webhook setup"
echo ""

echo -e "${GREEN}==================================${NC}"
echo -e "${GREEN}Script Complete!${NC}"
echo -e "${GREEN}==================================${NC}"
echo ""

# Ask user what they want to do
echo -e "${BLUE}What would you like to do?${NC}"
echo ""
echo "1) View backend logs (streaming)"
echo "2) Check backend environment variables"
echo "3) Link to LINE-bot service"
echo "4) Link to frontend service"
echo "5) Link to mlops service"
echo "6) Link to simulator service"
echo "7) Exit"
echo ""
read -p "Enter choice [1-7]: " choice

case $choice in
    1)
        print_header "Streaming Backend Logs (Ctrl+C to stop)"
        railway link --service backend
        railway logs
        ;;
    2)
        print_header "Backend Environment Variables"
        railway link --service backend
        railway variables
        ;;
    3)
        print_header "Linking to LINE-bot Service"
        railway link --service line-bot
        railway status
        ;;
    4)
        print_header "Linking to Frontend Service"
        railway link --service frontend
        railway status
        ;;
    5)
        print_header "Linking to MLOps Service"
        railway link --service mlops
        railway status
        ;;
    6)
        print_header "Linking to Simulator Service"
        railway link --service simulator
        railway status
        ;;
    7)
        echo -e "${GREEN}Goodbye!${NC}"
        ;;
    *)
        echo -e "${RED}Invalid choice${NC}"
        ;;
esac

echo ""
echo -e "${BLUE}Tip: Run this script anytime with: ${GREEN}./railway-cli-helper.sh${NC}"
echo ""