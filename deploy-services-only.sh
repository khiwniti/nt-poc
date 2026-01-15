#!/bin/bash
set -e

export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo -e "${CYAN}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║    Railway Deployment (Service-by-Service)           ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════╝${NC}"
echo ""

# Services are already created and configured
# Now deploy each service from its directory

echo -e "${BLUE}[1/6]${NC} Deploying Backend..."
cd services/backend
railway up --service backend --detach
cd ../..
echo -e "${GREEN}✅ Backend deploying${NC}"
echo ""

echo -e "${BLUE}[2/6]${NC} Deploying Frontend..."
cd services/frontend
railway up --service frontend --detach
cd ../..
echo -e "${GREEN}✅ Frontend deploying${NC}"
echo ""

echo -e "${BLUE}[3/6]${NC} Deploying MLOps..."
cd services/mlops
railway up --service mlops --detach
cd ../..
echo -e "${GREEN}✅ MLOps deploying${NC}"
echo ""

echo -e "${BLUE}[4/6]${NC} Deploying Simulator..."
cd services/simulator
railway up --service simulator --detach
cd ../..
echo -e "${GREEN}✅ Simulator deploying${NC}"
echo ""

echo -e "${BLUE}[5/6]${NC} Deploying LINE Bot..."
cd services/line-bot
railway up --service line-bot --detach
cd ../..
echo -e "${GREEN}✅ LINE Bot deploying${NC}"
echo ""

echo -e "${BLUE}[6/6]${NC} Waiting for PostgreSQL and enabling TimescaleDB..."
echo -e "${YELLOW}⏳ Waiting 45 seconds for services to start...${NC}"
sleep 45

# Enable TimescaleDB
DB_URL=$(railway variables --service backend --kv | grep ^DATABASE_URL= | cut -d'=' -f2-)
if [ ! -z "$DB_URL" ]; then
    echo -e "${CYAN}Enabling TimescaleDB extension...${NC}"
    psql "$DB_URL" -c "CREATE EXTENSION IF NOT EXISTS timescaledb;" 2>&1 | grep -v "already exists" || true
    echo -e "${GREEN}✅ TimescaleDB enabled${NC}"
else
    echo -e "${YELLOW}⚠️  DATABASE_URL not ready yet${NC}"
fi
echo ""

echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ All deployments initiated!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo ""

echo -e "${YELLOW}⏳ Builds in progress (5-10 minutes)${NC}"
echo ""

echo -e "${CYAN}📋 Next Steps:${NC}"
echo ""
echo -e "${BLUE}1. Check status:${NC} railway status"
echo -e "${BLUE}2. View logs:${NC} railway logs --service backend"
echo -e "${BLUE}3. Run migrations (when backend ready):${NC} railway run --service backend npm run migrate"
echo -e "${BLUE}4. Get URLs:${NC} railway domain"
echo ""
