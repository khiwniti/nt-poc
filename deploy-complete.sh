#!/bin/bash
set -e

export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║      Railway Deployment - NT-POC Battery Management System       ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Generate JWT secret
echo -e "${BLUE}[1/12]${NC} Generating JWT secret..."
JWT_SECRET=$(openssl rand -base64 32)
echo "$JWT_SECRET" > jwt-secret.txt
echo -e "${GREEN}✅ JWT Secret generated and saved to jwt-secret.txt${NC}"
echo ""

# Create services
echo -e "${BLUE}[2/12]${NC} Creating services..."
echo -e "${YELLOW}Creating backend service...${NC}"
railway add --service backend || echo -e "${YELLOW}Service may already exist${NC}"
sleep 2

echo -e "${YELLOW}Creating frontend service...${NC}"
railway add --service frontend || echo -e "${YELLOW}Service may already exist${NC}"
sleep 2

echo -e "${YELLOW}Creating mlops service...${NC}"
railway add --service mlops || echo -e "${YELLOW}Service may already exist${NC}"
sleep 2

echo -e "${YELLOW}Creating simulator service...${NC}"
railway add --service simulator || echo -e "${YELLOW}Service may already exist${NC}"
sleep 2

echo -e "${YELLOW}Creating line-bot service...${NC}"
railway add --service line-bot || echo -e "${YELLOW}Service may already exist${NC}"
sleep 2

echo -e "${GREEN}✅ All services created${NC}"
echo ""

# Configure Backend
echo -e "${BLUE}[3/12]${NC} Configuring Backend environment..."
railway variables --service backend \
  --set "NODE_ENV=production" \
  --set "PORT=3000" \
  --set "DB_SSL=true" \
  --set "JWT_SECRET=$JWT_SECRET" \
  --set "JWT_EXPIRY=24h" \
  --set "PREDICTION_JOB_INTERVAL_MINUTES=60" \
  --set "ESCALATION_JOB_INTERVAL_MINUTES=5" \
  --set "SENSOR_INGESTION_ENABLED=true" \
  --set "SENSOR_INGESTION_INTERVAL=10000" \
  --set "LOG_LEVEL=info" \
  --set "MLOPS_SERVICE_URL=http://mlops.railway.internal:8000" \
  --set "SIMULATOR_URL=http://simulator.railway.internal:8001" \
  --set 'DATABASE_URL=${{Postgres.DATABASE_URL}}' \
  --set 'DB_HOST=${{Postgres.PGHOST}}' \
  --set 'DB_PORT=${{Postgres.PGPORT}}' \
  --set 'DB_NAME=${{Postgres.PGDATABASE}}' \
  --set 'DB_USER=${{Postgres.PGUSER}}' \
  --set 'DB_PASSWORD=${{Postgres.PGPASSWORD}}' \
  --set 'REDIS_URL=${{Redis.REDIS_URL}}' \
  --skip-deploys
echo -e "${GREEN}✅ Backend configured${NC}"
echo ""

# Configure Frontend
echo -e "${BLUE}[4/12]${NC} Configuring Frontend environment..."
railway variables --service frontend \
  --set "VITE_APP_NAME=Battery Management System" \
  --set "VITE_ENVIRONMENT=production" \
  --set "NODE_ENV=production" \
  --set "GENERATE_SOURCEMAP=false" \
  --skip-deploys
echo -e "${GREEN}✅ Frontend configured${NC}"
echo ""

# Configure MLOps
echo -e "${BLUE}[5/12]${NC} Configuring MLOps environment..."
railway variables --service mlops \
  --set "PORT=8000" \
  --set "ENVIRONMENT=production" \
  --set "LOG_LEVEL=INFO" \
  --set "MODELS_DIR=/app/models" \
  --set "MODEL_VERSION=v1.0.0" \
  --set 'DATABASE_URL=${{Postgres.DATABASE_URL}}' \
  --set 'DB_HOST=${{Postgres.PGHOST}}' \
  --set 'DB_PORT=${{Postgres.PGPORT}}' \
  --set 'DB_NAME=${{Postgres.PGDATABASE}}' \
  --set 'DB_USER=${{Postgres.PGUSER}}' \
  --set 'DB_PASSWORD=${{Postgres.PGPASSWORD}}' \
  --skip-deploys
echo -e "${GREEN}✅ MLOps configured${NC}"
echo ""

# Configure Simulator
echo -e "${BLUE}[6/12]${NC} Configuring Simulator environment..."
railway variables --service simulator \
  --set "PORT=8001" \
  --set "SENSOR_BACKEND=simulator" \
  --set "SIMULATOR_NOISE_LEVEL=0.02" \
  --set "SIMULATOR_DRIFT_ENABLED=true" \
  --set "SIMULATOR_UPDATE_INTERVAL_MS=1000" \
  --skip-deploys
echo -e "${GREEN}✅ Simulator configured${NC}"
echo ""

# Configure LINE Bot
echo -e "${BLUE}[7/12]${NC} Configuring LINE Bot environment..."
railway variables --service line-bot \
  --set "PORT=3002" \
  --set "NODE_ENV=production" \
  --set "BACKEND_API_URL=http://backend.railway.internal:3000" \
  --set "LINE_CHANNEL_SECRET=e8e575a17c9847b835ff53e9ea81b7fd" \
  --set "LINE_CHANNEL_ACCESS_TOKEN=VAspANGGOvItOzldvJEQGC0XI4xDW5Z0UDTzBVDSqkHGI4zct5C5pcEjCN+jgObzWPs5DwrjSKIeIE2EPyP9mrBKz/XDSKAdEdY+HEOIGNYrB7vju/M7bYSwb2L1o/g0FAWqAe8YGMf0lZfT7BAq9gdB04t89/1O/w1cDnyilFU=" \
  --skip-deploys
echo -e "${GREEN}✅ LINE Bot configured${NC}"
echo ""

# Deploy Backend
echo -e "${BLUE}[8/12]${NC} Deploying Backend..."
railway up --service backend --detach
echo -e "${GREEN}✅ Backend deployment initiated${NC}"
echo ""

# Deploy Frontend
echo -e "${BLUE}[9/12]${NC} Deploying Frontend..."
railway up --service frontend --detach
echo -e "${GREEN}✅ Frontend deployment initiated${NC}"
echo ""

# Deploy MLOps
echo -e "${BLUE}[10/12]${NC} Deploying MLOps..."
railway up --service mlops --detach
echo -e "${GREEN}✅ MLOps deployment initiated${NC}"
echo ""

# Deploy Simulator
echo -e "${BLUE}[11/12]${NC} Deploying Simulator..."
railway up --service simulator --detach
echo -e "${GREEN}✅ Simulator deployment initiated${NC}"
echo ""

# Deploy LINE Bot
echo -e "${BLUE}[12/12]${NC} Deploying LINE Bot..."
railway up --service line-bot --detach
echo -e "${GREEN}✅ LINE Bot deployment initiated${NC}"
echo ""

echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ All services deployed!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
echo ""

echo -e "${YELLOW}⏳ Services are building... This may take 5-10 minutes.${NC}"
echo ""

echo -e "${CYAN}📋 Next Steps:${NC}"
echo ""
echo -e "${BLUE}1. Wait for deployments (30-60 seconds), then enable TimescaleDB:${NC}"
echo "   railway connect Postgres"
echo "   CREATE EXTENSION IF NOT EXISTS timescaledb;"
echo "   \\\\dx"
echo "   \\\\q"
echo ""
echo -e "${BLUE}2. Check deployment status:${NC}"
echo "   railway status"
echo ""
echo -e "${BLUE}3. View logs:${NC}"
echo "   railway logs --service backend"
echo ""
echo -e "${BLUE}4. Run database migrations (wait for backend to be ready):${NC}"
echo "   railway run --service backend npm run migrate"
echo ""
echo -e "${BLUE}5. Get service URLs:${NC}"
echo "   railway domain"
echo ""
echo -e "${BLUE}6. Update Frontend API URL (after getting backend URL):${NC}"
echo "   BACKEND_URL=\\$(railway domain --service backend)"
echo "   railway variables --service frontend --set \"VITE_API_BASE_URL=https://\\$BACKEND_URL/api\""
echo "   railway up --service frontend --detach"
echo ""
echo -e "${BLUE}7. Test endpoints:${NC}"
echo "   curl https://\\$(railway domain --service backend)/api/v1/health"
echo ""
echo -e "${BLUE}8. Update LINE webhook:${NC}"
echo "   LINE_URL=\\$(railway domain --service line-bot)"
echo "   # Go to: https://developers.line.biz/console/"
echo "   # Set webhook: https://\\$LINE_URL/webhook"
echo ""

echo -e "${CYAN}🔗 Project Dashboard:${NC}"
echo "   https://railway.com/project/6eef59c3-ae94-47e1-8151-692b91e1f7f4"
echo ""
