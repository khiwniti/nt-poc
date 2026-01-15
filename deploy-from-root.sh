#!/bin/bash
set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   Railway Deployment from Root with railway.toml          ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${YELLOW}📋 Deploying from project root to use railway.toml configuration${NC}"
echo ""

# Deploy all services from root directory
echo -e "${BLUE}[1/5]${NC} Deploying Backend..."
railway up --service backend --detach
echo -e "${GREEN}✅ Backend deployment initiated${NC}"
echo "   Build logs: https://railway.com/project/6eef59c3-ae94-47e1-8151-692b91e1f7f4/service/backend"
echo ""

echo -e "${BLUE}[2/5]${NC} Deploying Frontend..."
railway up --service frontend --detach
echo -e "${GREEN}✅ Frontend deployment initiated${NC}"
echo "   Build logs: https://railway.com/project/6eef59c3-ae94-47e1-8151-692b91e1f7f4/service/frontend"
echo ""

echo -e "${BLUE}[3/5]${NC} Deploying MLOps..."
railway up --service mlops --detach
echo -e "${GREEN}✅ MLOps deployment initiated${NC}"
echo "   Build logs: https://railway.com/project/6eef59c3-ae94-47e1-8151-692b91e1f7f4/service/mlops"
echo ""

echo -e "${BLUE}[4/5]${NC} Deploying Simulator..."
railway up --service simulator --detach
echo -e "${GREEN}✅ Simulator deployment initiated${NC}"
echo "   Build logs: https://railway.com/project/6eef59c3-ae94-47e1-8151-692b91e1f7f4/service/simulator"
echo ""

echo -e "${BLUE}[5/5]${NC} Deploying LINE Bot..."
railway up --service line-bot --detach
echo -e "${GREEN}✅ LINE Bot deployment initiated${NC}"
echo "   Build logs: https://railway.com/project/6eef59c3-ae94-47e1-8151-692b91e1f7f4/service/line-bot"
echo ""

echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ All 5 services deployed from root directory!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo ""

echo -e "${YELLOW}⏳ Builds starting... This will take 5-10 minutes.${NC}"
echo ""

echo -e "${CYAN}📊 Monitor Progress:${NC}"
echo ""
echo -e "${BLUE}1. Check status:${NC} railway status"
echo -e "${BLUE}2. Watch logs:${NC} railway logs --service backend"
echo -e "${BLUE}3. Dashboard:${NC} https://railway.com/project/6eef59c3-ae94-47e1-8151-692b91e1f7f4"
echo ""

echo -e "${CYAN}⏳ Waiting 90 seconds for builds, then checking status...${NC}"
sleep 90

echo ""
echo -e "${CYAN}Current Status:${NC}"
railway status

echo ""
echo -e "${CYAN}📋 Next Steps (run after builds complete ~5-10 min):${NC}"
echo ""
echo -e "${BLUE}1. Enable TimescaleDB:${NC}"
echo "   railway run --service backend 'psql \$DATABASE_URL -c \"CREATE EXTENSION IF NOT EXISTS timescaledb;\"'"
echo ""
echo -e "${BLUE}2. Run migrations:${NC}"
echo "   railway run --service backend npm run migrate"
echo ""
echo -e "${BLUE}3. Get URLs:${NC}"
echo "   railway domain"
echo ""
echo -e "${BLUE}4. Update frontend API URL:${NC}"
echo "   BACKEND_URL=\$(railway domain --service backend)"
echo "   railway variables --service frontend --set \"VITE_API_BASE_URL=https://\$BACKEND_URL/api\""
echo "   railway up --service frontend --detach"
echo ""
echo -e "${BLUE}5. Test endpoints:${NC}"
echo "   curl https://\$(railway domain --service backend)/api/v1/health"
echo ""
