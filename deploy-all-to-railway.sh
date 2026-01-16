#!/bin/bash
# Deploy all services to Railway project: nt-poc-battery-management

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "========================================="
echo "  Deploying to nt-poc-battery-management"
echo "========================================="
echo ""

# Function to deploy a service
deploy_service() {
    local service_name=$1
    local service_path=$2
    
    echo -e "${BLUE}📦 Deploying ${service_name}...${NC}"
    
    cd "${service_path}"
    
    # Link to the service
    railway service "${service_name}" --yes 2>/dev/null || true
    
    # Deploy
    railway up
    
    echo -e "${GREEN}✅ ${service_name} deployment initiated${NC}"
    echo ""
    
    cd - > /dev/null
}

# Deploy Backend (with migration fix)
echo -e "${YELLOW}Step 1/4: Backend${NC}"
deploy_service "backend" "/Users/khiwn/nt-poc/nt-poc"

# Deploy Frontend
echo -e "${YELLOW}Step 2/4: Frontend${NC}"
deploy_service "frontend" "/Users/khiwn/nt-poc/nt-poc/services/frontend"

# Deploy MLOps
echo -e "${YELLOW}Step 3/4: MLOps${NC}"
deploy_service "mlops" "/Users/khiwn/nt-poc/nt-poc/services/mlops"

# Deploy Simulator
echo -e "${YELLOW}Step 4/4: Simulator${NC}"
deploy_service "simulator" "/Users/khiwn/nt-poc/nt-poc/services/simulator"

echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}  All Services Deployed! ${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo "View status: railway status"
echo "View logs: railway logs"
echo "Dashboard: https://railway.app/project/6eef59c3-ae94-47e1-8151-692b91e1f7f4"
