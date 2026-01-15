#!/bin/bash
set -e

# Add PostgreSQL to PATH
export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo ""
echo -e "${CYAN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║         Railway Complete Deployment - All Services            ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check Railway CLI
echo -e "${BLUE}[1/10]${NC} Checking Railway CLI..."
if ! command -v railway &> /dev/null; then
    echo -e "${RED}❌ Railway CLI not found${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Railway CLI v$(railway --version)${NC}"
echo ""

# Check project
echo -e "${BLUE}[2/10]${NC} Checking Railway project..."
railway status
echo ""

# Generate JWT secret
echo -e "${BLUE}[3/10]${NC} Generating JWT secret..."
JWT_SECRET=$(openssl rand -base64 32)
echo -e "${GREEN}✅ JWT secret: ${JWT_SECRET:0:20}...${NC}"
echo ""

# Deploy Backend
echo -e "${BLUE}[4/10]${NC} Deploying Backend service..."
echo -e "${YELLOW}📦 Deploying from services/backend...${NC}"
cd services/backend
railway up --detach
cd ../..
echo -e "${GREEN}✅ Backend deployment initiated${NC}"
echo ""

# Wait a bit for service to be created
sleep 5

# Set Backend variables
echo -e "${BLUE}[5/10]${NC} Configuring Backend environment..."
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
  --set 'REDIS_URL=${{Redis.REDIS_URL}}'
echo -e "${GREEN}✅ Backend configured${NC}"
echo ""

# Deploy Frontend
echo -e "${BLUE}[6/10]${NC} Deploying Frontend service..."
echo -e "${YELLOW}📦 Deploying from services/frontend...${NC}"
cd services/frontend
railway up --detach
cd ../..
echo -e "${GREEN}✅ Frontend deployment initiated${NC}"
sleep 5
echo ""

# Set Frontend variables
railway variables --service frontend \
  --set "VITE_APP_NAME=Battery Management System" \
  --set "VITE_ENVIRONMENT=production" \
  --set "NODE_ENV=production" \
  --set "GENERATE_SOURCEMAP=false"
echo -e "${GREEN}✅ Frontend configured${NC}"
echo ""

# Deploy MLOps
echo -e "${BLUE}[7/10]${NC} Deploying MLOps service..."
echo -e "${YELLOW}📦 Deploying from services/mlops...${NC}"
cd services/mlops
railway up --detach
cd ../..
echo -e "${GREEN}✅ MLOps deployment initiated${NC}"
sleep 5
echo ""

# Set MLOps variables
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
  --set 'DB_PASSWORD=${{Postgres.PGPASSWORD}}'
echo -e "${GREEN}✅ MLOps configured${NC}"
echo ""

# Deploy Simulator
echo -e "${BLUE}[8/10]${NC} Deploying Simulator service..."
echo -e "${YELLOW}📦 Deploying from services/simulator...${NC}"
cd services/simulator
railway up --detach
cd ../..
echo -e "${GREEN}✅ Simulator deployment initiated${NC}"
sleep 5
echo ""

# Set Simulator variables
railway variables --service simulator \
  --set "PORT=8001" \
  --set "SENSOR_BACKEND=simulator" \
  --set "SIMULATOR_NOISE_LEVEL=0.02" \
  --set "SIMULATOR_DRIFT_ENABLED=true" \
  --set "SIMULATOR_UPDATE_INTERVAL_MS=1000"
echo -e "${GREEN}✅ Simulator configured${NC}"
echo ""

# Deploy LINE Bot
echo -e "${BLUE}[9/10]${NC} Deploying LINE Bot service..."
echo -e "${YELLOW}📦 Deploying from services/line-bot...${NC}"
cd services/line-bot
railway up --detach
cd ../..
echo -e "${GREEN}✅ LINE Bot deployment initiated${NC}"
sleep 5
echo ""

# Set LINE Bot variables
railway variables --service line-bot \
  --set "PORT=3002" \
  --set "NODE_ENV=production" \
  --set "BACKEND_API_URL=http://backend.railway.internal:3000" \
  --set "LINE_CHANNEL_SECRET=e8e575a17c9847b835ff53e9ea81b7fd" \
  --set "LINE_CHANNEL_ACCESS_TOKEN=VAspANGGOvItOzldvJEQGC0XI4xDW5Z0UDTzBVDSqkHGI4zct5C5pcEjCN+jgObzWPs5DwrjSKIeIE2EPyP9mrBKz/XDSKAdEdY+HEOIGNYrB7vju/M7bYSwb2L1o/g0FAWqAe8YGMf0lZfT7BAq9gdB04t89/1O/w1cDnyilFU="
echo -e "${GREEN}✅ LINE Bot configured${NC}"
echo ""

# Enable TimescaleDB
echo -e "${BLUE}[10/10]${NC} Enabling TimescaleDB extension..."
echo -e "${YELLOW}⏳ Waiting 30 seconds for PostgreSQL to be ready...${NC}"
sleep 30

# Get database URL and enable TimescaleDB
DB_URL=$(railway variables --service backend --kv | grep DATABASE_URL | cut -d'=' -f2-)
if [ ! -z "$DB_URL" ]; then
    echo -e "${CYAN}Running: CREATE EXTENSION IF NOT EXISTS timescaledb;${NC}"
    psql "$DB_URL" -c "CREATE EXTENSION IF NOT EXISTS timescaledb;" || echo -e "${YELLOW}⚠️  Extension may already exist${NC}"
    echo -e "${GREEN}✅ TimescaleDB enabled${NC}"
else
    echo -e "${YELLOW}⚠️  DATABASE_URL not found yet. Enable manually with:${NC}"
    echo -e "${CYAN}   railway connect Postgres${NC}"
    echo -e "${CYAN}   CREATE EXTENSION IF NOT EXISTS timescaledb;${NC}"
fi
echo ""

echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
echo ""

echo -e "${YELLOW}⏳ Services are building and deploying. This may take 5-10 minutes.${NC}"
echo ""

echo -e "${CYAN}📋 Next Steps:${NC}"
echo ""
echo -e "${BLUE}1. Check deployment status:${NC}"
echo "   railway status"
echo ""
echo -e "${BLUE}2. View build logs:${NC}"
echo "   railway logs --service backend"
echo ""
echo -e "${BLUE}3. Wait for all services to be ready (check status):${NC}"
echo "   watch railway status"
echo ""
echo -e "${BLUE}4. Run database migrations:${NC}"
echo "   railway run --service backend npm run migrate"
echo ""
echo -e "${BLUE}5. Get service URLs:${NC}"
echo "   railway domain"
echo ""
echo -e "${BLUE}6. Update Frontend API URL:${NC}"
echo "   BACKEND_URL=\$(railway domain --service backend)"
echo "   railway variables --service frontend --set \"VITE_API_BASE_URL=https://\$BACKEND_URL/api\""
echo "   cd services/frontend && railway up && cd ../.."
echo ""
echo -e "${BLUE}7. Test health endpoints:${NC}"
echo "   curl https://\$(railway domain --service backend)/api/v1/health"
echo "   curl https://\$(railway domain --service mlops)/health"
echo ""
echo -e "${BLUE}8. Update LINE webhook:${NC}"
echo "   LINE_URL=\$(railway domain --service line-bot)"
echo "   echo \"Update webhook at: https://developers.line.biz/console/\""
echo "   echo \"Webhook URL: https://\$LINE_URL/webhook\""
echo ""
echo -e "${CYAN}🔗 Project Dashboard:${NC}"
echo "   https://railway.com/project/6eef59c3-ae94-47e1-8151-692b91e1f7f4"
echo ""
