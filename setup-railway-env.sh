#!/bin/bash
set -e

# Add PostgreSQL to PATH
export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║     Railway Deployment - NT-POC Battery Management System      ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Step 1: Check Railway CLI
echo -e "${BLUE}[1/8]${NC} Checking Railway CLI..."
if ! command -v railway &> /dev/null; then
    echo -e "${RED}❌ Railway CLI not found${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Railway CLI found ($(railway --version))${NC}"
echo ""

# Step 2: Check project status
echo -e "${BLUE}[2/8]${NC} Checking Railway project status..."
railway status
echo ""

# Step 3: Generate JWT secret
echo -e "${BLUE}[3/8]${NC} Generating JWT secret..."
JWT_SECRET=$(openssl rand -base64 32)
echo -e "${GREEN}✅ JWT secret generated${NC}"
echo ""

# Step 4: Set Backend environment variables
echo -e "${BLUE}[4/8]${NC} Setting Backend environment variables..."
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
  --set "SIMULATOR_URL=http://simulator.railway.internal:8001"

echo -e "${YELLOW}Linking Backend to databases...${NC}"
railway variables --service backend \
  --set 'DATABASE_URL=${{Postgres.DATABASE_URL}}' \
  --set 'DB_HOST=${{Postgres.PGHOST}}' \
  --set 'DB_PORT=${{Postgres.PGPORT}}' \
  --set 'DB_NAME=${{Postgres.PGDATABASE}}' \
  --set 'DB_USER=${{Postgres.PGUSER}}' \
  --set 'DB_PASSWORD=${{Postgres.PGPASSWORD}}' \
  --set 'REDIS_URL=${{Redis.REDIS_URL}}'

echo -e "${GREEN}✅ Backend variables configured${NC}"
echo ""

# Step 5: Set Frontend environment variables
echo -e "${BLUE}[5/8]${NC} Setting Frontend environment variables..."
railway variables --service frontend \
  --set "VITE_APP_NAME=Battery Management System" \
  --set "VITE_ENVIRONMENT=production" \
  --set "NODE_ENV=production" \
  --set "GENERATE_SOURCEMAP=false" \
  --set "VITE_ENABLE_ANALYTICS=false"

echo -e "${GREEN}✅ Frontend variables configured${NC}"
echo ""

# Step 6: Set MLOps environment variables
echo -e "${BLUE}[6/8]${NC} Setting MLOps environment variables..."
railway variables --service mlops \
  --set "PORT=8000" \
  --set "ENVIRONMENT=production" \
  --set "LOG_LEVEL=INFO" \
  --set "MODELS_DIR=/app/models" \
  --set "MODEL_VERSION=v1.0.0"

railway variables --service mlops \
  --set 'DATABASE_URL=${{Postgres.DATABASE_URL}}' \
  --set 'DB_HOST=${{Postgres.PGHOST}}' \
  --set 'DB_PORT=${{Postgres.PGPORT}}' \
  --set 'DB_NAME=${{Postgres.PGDATABASE}}' \
  --set 'DB_USER=${{Postgres.PGUSER}}' \
  --set 'DB_PASSWORD=${{Postgres.PGPASSWORD}}' \
  --set 'REDIS_URL=${{Redis.REDIS_URL}}'

echo -e "${GREEN}✅ MLOps variables configured${NC}"
echo ""

# Step 7: Set Simulator environment variables
echo -e "${BLUE}[7/8]${NC} Setting Simulator environment variables..."
railway variables --service simulator \
  --set "PORT=8001" \
  --set "SENSOR_BACKEND=simulator" \
  --set "SIMULATOR_NOISE_LEVEL=0.02" \
  --set "SIMULATOR_DRIFT_ENABLED=true" \
  --set "SIMULATOR_UPDATE_INTERVAL_MS=1000"

echo -e "${GREEN}✅ Simulator variables configured${NC}"
echo ""

# Step 8: Set LINE Bot environment variables
echo -e "${BLUE}[8/8]${NC} Setting LINE Bot environment variables..."
railway variables --service line-bot \
  --set "PORT=3002" \
  --set "NODE_ENV=production" \
  --set "BACKEND_API_URL=http://backend.railway.internal:3000" \
  --set "LINE_CHANNEL_SECRET=e8e575a17c9847b835ff53e9ea81b7fd" \
  --set "LINE_CHANNEL_ACCESS_TOKEN=VAspANGGOvItOzldvJEQGC0XI4xDW5Z0UDTzBVDSqkHGI4zct5C5pcEjCN+jgObzWPs5DwrjSKIeIE2EPyP9mrBKz/XDSKAdEdY+HEOIGNYrB7vju/M7bYSwb2L1o/g0FAWqAe8YGMf0lZfT7BAq9gdB04t89/1O/w1cDnyilFU="

echo -e "${GREEN}✅ LINE Bot variables configured${NC}"
echo ""

echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ All environment variables configured!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
echo ""

echo -e "${YELLOW}📋 Next steps:${NC}"
echo ""
echo -e "${BLUE}1. Enable TimescaleDB extension:${NC}"
echo "   ./enable-timescaledb.sh"
echo ""
echo -e "${BLUE}2. Deploy all services:${NC}"
echo "   railway up"
echo ""
echo -e "${BLUE}3. Run database migrations:${NC}"
echo "   railway run --service backend npm run migrate"
echo ""
echo -e "${BLUE}4. Get service URLs:${NC}"
echo "   railway domain"
echo ""
echo -e "${BLUE}5. Update frontend API URL:${NC}"
echo "   railway domain --service backend  # Copy this URL"
echo "   railway variables set --service frontend VITE_API_BASE_URL=\"https://<backend-url>/api\""
echo "   railway up --service frontend"
echo ""
echo -e "${BLUE}6. Update LINE webhook:${NC}"
echo "   railway domain --service line-bot  # Copy this URL"
echo "   # Update at: https://developers.line.biz/console/"
echo ""
