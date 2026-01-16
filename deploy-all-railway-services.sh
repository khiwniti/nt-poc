#!/bin/bash
# Deploy all services to Railway in the same project
# This script deploys backend, frontend, line-bot, mlops, and simulator

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project name (use existing project or create new one)
PROJECT_NAME="nt-poc-battery-management"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Railway Multi-Service Deployment${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo -e "${RED}Error: Railway CLI is not installed${NC}"
    echo "Install it with: npm i -g @railway/cli"
    exit 1
fi

# Check if logged in
if ! railway whoami &> /dev/null; then
    echo -e "${RED}Error: Not logged in to Railway${NC}"
    echo "Run: railway login"
    exit 1
fi

echo -e "${GREEN}✓ Railway CLI is installed and authenticated${NC}"
echo ""

# Function to deploy a service
deploy_service() {
    local service_name=$1
    local service_path=$2
    local environment=${3:-production}
    local original_dir=$(pwd)
    
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}Deploying: ${service_name}${NC}"
    echo -e "${BLUE}========================================${NC}"
    
    if [ ! -d "$service_path" ]; then
        echo -e "${RED}Error: Service directory not found: $service_path${NC}"
        cd "$original_dir"
        return 1
    fi
    
    echo -e "${YELLOW}Changing to directory: ${service_path}${NC}"
    cd "$service_path" || {
        echo -e "${RED}Failed to change directory to ${service_path}${NC}"
        cd "$original_dir"
        return 1
    }
    
    echo -e "${YELLOW}Deploying service: ${service_name}${NC}"
    
    # Deploy the service
    if railway up --service "$service_name" --environment "$environment"; then
        echo -e "${GREEN}✓ Successfully deployed ${service_name}${NC}"
        cd "$original_dir"
    else
        echo -e "${RED}✗ Failed to deploy ${service_name}${NC}"
        cd "$original_dir"
        return 1
    fi
    
    echo ""
}

# Function to generate domain for frontend
generate_frontend_domain() {
    local original_dir=$(pwd)
    
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}Generating domain for frontend${NC}"
    echo -e "${BLUE}========================================${NC}"
    
    cd services/frontend || {
        echo -e "${RED}Failed to change directory to services/frontend${NC}"
        cd "$original_dir"
        return 1
    }
    
    railway domain --service frontend
    cd "$original_dir"
    echo ""
}

# Main deployment flow
main() {
    local root_dir=$(pwd)
    
    echo -e "${YELLOW}Starting deployment of all services...${NC}"
    echo ""
    
    # Deploy Backend
    echo -e "${GREEN}[1/5] Deploying Backend Service${NC}"
    deploy_service "backend" "$root_dir/services/backend" "production"
    
    # Deploy Frontend
    echo -e "${GREEN}[2/5] Deploying Frontend Service${NC}"
    deploy_service "frontend" "$root_dir/services/frontend" "production"
    
    # Deploy LINE Bot
    echo -e "${GREEN}[3/5] Deploying LINE Bot Service${NC}"
    deploy_service "line-bot" "$root_dir/services/line-bot" "production"
    
    # Deploy MLOps
    echo -e "${GREEN}[4/5] Deploying MLOps Service${NC}"
    deploy_service "mlops" "$root_dir/services/mlops" "production"
    
    # Deploy Simulator
    echo -e "${GREEN}[5/5] Deploying Simulator Service${NC}"
    deploy_service "simulator" "$root_dir/services/simulator" "production"
    
    # Generate domain for frontend
    echo -e "${YELLOW}Generating domain for frontend...${NC}"
    generate_frontend_domain
    
    echo -e "${BLUE}========================================${NC}"
    echo -e "${GREEN}✓ All services deployed successfully!${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo "1. Check deployment status: railway status"
    echo "2. View logs: railway logs --service <service-name>"
    echo "3. List services: railway service list"
    echo ""
    echo -e "${YELLOW}Note: ML service is not deployed as it's for training only${NC}"
}

# Run main deployment
main

echo -e "${GREEN}Deployment script completed!${NC}"
