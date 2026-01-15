#!/bin/bash
set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo -e "${CYAN}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║    Railway Redeployment with Procfiles Fixed         ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════╝${NC}"
echo ""

# Verify all Procfiles exist
echo -e "${BLUE}Verifying Procfiles...${NC}"
ls -l services/*/Procfile
echo ""

# Deploy all services with Procfiles
echo -e "${BLUE}[1/5]${NC} Deploying Backend..."
cd services/backend
railway up --service backend --detach
cd ../..
echo -e "${GREEN}✅ Backend deployed${NC}"
echo ""

echo -e "${BLUE}[2/5]${NC} Deploying Frontend..."
cd services/frontend
railway up --service frontend --detach
cd ../..
echo -e "${GREEN}✅ Frontend deployed${NC}"
echo ""

echo -e "${BLUE}[3/5]${NC} Deploying MLOps..."
cd services/mlops
railway up --service mlops --detach
cd ../..
echo -e "${GREEN}✅ MLOps deployed${NC}"
echo ""

echo -e "${BLUE}[4/5]${NC} Deploying Simulator..."
cd services/simulator
railway up --service simulator --detach
cd ../..
echo -e "${GREEN}✅ Simulator deployed${NC}"
echo ""

echo -e "${BLUE}[5/5]${NC} Deploying LINE Bot..."
cd services/line-bot
railway up --service line-bot --detach
cd ../..
echo -e "${GREEN}✅ LINE Bot deployed${NC}"
echo ""

echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ All services redeployed with Procfiles!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
echo ""

echo -e "${YELLOW}⏳ Waiting 60 seconds for builds to start...${NC}"
sleep 60

# Check status
echo -e "${CYAN}📊 Checking deployment status...${NC}"
railway status
echo ""

# Show next steps
echo -e "${CYAN}📋 Monitor Progress:${NC}"
echo ""
echo -e "${BLUE}1. Watch backend logs:${NC}"
echo "   railway logs --service backend"
echo ""
echo -e "${BLUE}2. Check all services:${NC}"
echo "   railway status"
echo ""
echo -e "${BLUE}3. View build logs in browser:${NC}"
echo "   https://railway.com/project/6eef59c3-ae94-47e1-8151-692b91e1f7f4"
echo ""
echo -e "${BLUE}4. When backend is ready, enable TimescaleDB:${NC}"
echo "   railway run --service backend 'psql \$DATABASE_URL -c \"CREATE EXTENSION IF NOT EXISTS timescaledb;\"'"
echo ""
echo -e "${BLUE}5. Run migrations:${NC}"
echo "   railway run --service backend npm run migrate"
echo ""
echo -e "${BLUE}6. Get service URLs:${NC}"
echo "   railway domain"
echo ""
