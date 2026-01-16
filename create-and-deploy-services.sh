#!/bin/bash
# Create and deploy all Railway services

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Creating and Deploying Railway Services${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Add services using Railway CLI
echo -e "${YELLOW}Creating services in Railway...${NC}"
echo ""

# Create frontend service
echo -e "${GREEN}Creating frontend service...${NC}"
railway add -s frontend 2>/dev/null || echo -e "${YELLOW}Frontend service may already exist${NC}"

# Create line-bot service
echo -e "${GREEN}Creating line-bot service...${NC}"
railway add -s line-bot 2>/dev/null || echo -e "${YELLOW}Line-bot service may already exist${NC}"

# Create mlops service
echo -e "${GREEN}Creating mlops service...${NC}"
railway add -s mlops 2>/dev/null || echo -e "${YELLOW}MLOps service may already exist${NC}"

# Create simulator service
echo -e "${GREEN}Creating simulator service...${NC}"
railway add -s simulator 2>/dev/null || echo -e "${YELLOW}Simulator service may already exist${NC}"

echo ""
echo -e "${GREEN}✓ Services created!${NC}"
echo ""

# Deploy each service
echo -e "${YELLOW}Deploying services...${NC}"
echo ""

# Deploy Backend
echo -e "${GREEN}[1/5] Deploying Backend...${NC}"
cd services/backend && railway up --service backend --environment production && cd ../..

# Deploy Frontend  
echo -e "${GREEN}[2/5] Deploying Frontend...${NC}"
cd services/frontend && railway up --service frontend --environment production && cd ../..

# Deploy LINE Bot
echo -e "${GREEN}[3/5] Deploying LINE Bot...${NC}"
cd services/line-bot && railway up --service line-bot --environment production && cd ../..

# Deploy MLOps
echo -e "${GREEN}[4/5] Deploying MLOps...${NC}"
cd services/mlops && railway up --service mlops --environment production && cd ../..

# Deploy Simulator
echo -e "${GREEN}[5/5] Deploying Simulator...${NC}"
cd services/simulator && railway up --service simulator --environment production && cd ../..

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✓ All services deployed!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${YELLOW}Next: Generate domains and check URLs${NC}"
