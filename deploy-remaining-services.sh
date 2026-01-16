#!/bin/bash
# Deploy remaining services to Railway
# Run this from the root of the repository

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ROOT_DIR=$(pwd)

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Railway Remaining Services Deployment${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Function to create service if it doesn't exist
create_service_if_needed() {
    local service_name=$1
    echo -e "${YELLOW}Checking if service ${service_name} exists...${NC}"
    
    # Try to get service info - if it fails, create it
    if ! railway service list | grep -q "$service_name"; then
        echo -e "${YELLOW}Service ${service_name} not found. Creating it...${NC}"
        railway service create "$service_name" || {
            echo -e "${RED}Failed to create service ${service_name}${NC}"
            return 1
        }
        echo -e "${GREEN}✓ Service ${service_name} created${NC}"
    else
        echo -e "${GREEN}✓ Service ${service_name} already exists${NC}"
    fi
}

# Function to deploy a service
deploy_service() {
    local service_name=$1
    local service_path="$ROOT_DIR/$2"
    
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}Deploying: ${service_name}${NC}"
    echo -e "${BLUE}Path: ${service_path}${NC}"
    echo -e "${BLUE}========================================${NC}"
    
    if [ ! -d "$service_path" ]; then
        echo -e "${RED}Error: Directory not found: $service_path${NC}"
        return 1
    fi
    
    # Create service if needed
    create_service_if_needed "$service_name"
    
    # Change to service directory
    cd "$service_path" || {
        echo -e "${RED}Failed to cd to ${service_path}${NC}"
        cd "$ROOT_DIR"
        return 1
    }
    
    echo -e "${YELLOW}Deploying from: $(pwd)${NC}"
    
    # Deploy
    if railway up --service "$service_name" --environment production; then
        echo -e "${GREEN}✓ Successfully deployed ${service_name}${NC}"
        cd "$ROOT_DIR"
        return 0
    else
        echo -e "${RED}✗ Failed to deploy ${service_name}${NC}"
        cd "$ROOT_DIR"
        return 1
    fi
}

# Main deployment
main() {
    echo -e "${GREEN}Starting deployment of remaining services...${NC}"
    echo -e "${YELLOW}Current directory: $(pwd)${NC}"
    echo ""
    
    # Track success/failure
    declare -a SUCCESS=()
    declare -a FAILED=()
    
    # Deploy Frontend
    if deploy_service "frontend" "services/frontend"; then
        SUCCESS+=("frontend")
    else
        FAILED+=("frontend")
    fi
    
    # Deploy LINE Bot
    if deploy_service "line-bot" "services/line-bot"; then
        SUCCESS+=("line-bot")
    else
        FAILED+=("line-bot")
    fi
    
    # Deploy MLOps
    if deploy_service "mlops" "services/mlops"; then
        SUCCESS+=("mlops")
    else
        FAILED+=("mlops")
    fi
    
    # Deploy Simulator
    if deploy_service "simulator" "services/simulator"; then
        SUCCESS+=("simulator")
    else
        FAILED+=("simulator")
    fi
    
    # Summary
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}Deployment Summary${NC}"
    echo -e "${BLUE}========================================${NC}"
    
    if [ ${#SUCCESS[@]} -gt 0 ]; then
        echo -e "${GREEN}Successful Deployments (${#SUCCESS[@]}):${NC}"
        for service in "${SUCCESS[@]}"; do
            echo -e "  ${GREEN}✓${NC} $service"
        done
    fi
    
    if [ ${#FAILED[@]} -gt 0 ]; then
        echo ""
        echo -e "${RED}Failed Deployments (${#FAILED[@]}):${NC}"
        for service in "${FAILED[@]}"; do
            echo -e "  ${RED}✗${NC} $service"
        done
        echo ""
        echo -e "${YELLOW}You can retry failed services individually:${NC}"
        for service in "${FAILED[@]}"; do
            echo -e "  cd services/$service && railway up --service $service"
        done
    fi
    
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${YELLOW}Next Steps:${NC}"
    echo "1. Generate domain for frontend: railway domain --service frontend"
    echo "2. Check deployment status: railway status"
    echo "3. View logs: railway logs --service <service-name>"
    echo "4. List all services: railway service list"
}

# Run main
main

echo ""
echo -e "${GREEN}Deployment script completed!${NC}"
