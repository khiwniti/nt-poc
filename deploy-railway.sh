#!/bin/bash
set -e

# NT-POC Production Fleet - Railway Deployment Script
# Deploys all services: Backend, Simulator, MLOps, Frontend
# Fleet: 1,944 batteries across 9 data centers

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo ""
echo "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo "${BLUE}║   NT-POC Production Fleet - Railway Deployment            ║${NC}"
echo "${BLUE}║   1,944 Batteries | 9 Data Centers | 4 Services           ║${NC}"
echo "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check Railway CLI
if ! command -v railway &> /dev/null; then
    echo "${RED}❌ Railway CLI not found${NC}"
    echo "Install: npm install -g @railway/cli"
    exit 1
fi

# Check authentication
if ! railway whoami &> /dev/null; then
    echo "${RED}❌ Not logged in to Railway${NC}"
    echo "Run: railway login"
    exit 1
fi

echo "${GREEN}✅ Railway CLI authenticated${NC}"
echo ""

# Prompt for confirmation
read -p "Deploy to Railway? This will create/update all services. (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled"
    exit 0
fi

echo ""
echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "${BLUE}Step 1: Initializing Railway Project${NC}"
echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

railway init --name nt-poc-production 2>/dev/null || echo "${YELLOW}Project already initialized${NC}"
echo "${GREEN}✅ Railway project ready${NC}"

echo ""
echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "${BLUE}Step 2: Provisioning PostgreSQL Database${NC}"
echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

railway add --plugin postgresql 2>/dev/null || echo "${YELLOW}PostgreSQL already provisioned${NC}"
echo "${GREEN}✅ PostgreSQL database ready${NC}"

# Wait for database to be fully provisioned
echo "Waiting for database to be ready..."
sleep 10

echo ""
echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "${BLUE}Step 3: Deploying Backend Service${NC}"
echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

cd services/backend

# Create service if it doesn't exist
railway service 2>/dev/null || railway up --service backend

# Set environment variables
echo "Configuring backend environment..."
railway variables set \
  NODE_ENV=production \
  PORT=3000 \
  DB_SSL=true \
  PREDICTION_JOB_INTERVAL_MINUTES=60 \
  ESCALATION_JOB_INTERVAL_MINUTES=5 \
  SENSOR_INGESTION_ENABLED=true \
  SENSOR_INGESTION_INTERVAL=10000

# Deploy backend
echo "Deploying backend service..."
railway up --detach

echo "${GREEN}✅ Backend service deployed${NC}"
BACKEND_URL=$(railway domain 2>/dev/null || echo "pending")
echo "   URL: ${BACKEND_URL}"

# Wait for backend deployment
echo "Waiting for backend to be ready..."
sleep 30

echo ""
echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "${BLUE}Step 4: Initializing Database${NC}"
echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo "Running database migrations..."
railway run npm run migrate || echo "${YELLOW}Migrations may have already run${NC}"

echo "Seeding production data (1,944 batteries)..."
railway run npm run seed:production || echo "${YELLOW}Data may already be seeded${NC}"

# Verify data
echo "Verifying database..."
BATTERY_COUNT=$(railway run bash -c 'psql $DATABASE_URL -t -c "SELECT COUNT(*) FROM battery_systems;"' 2>/dev/null | tr -d ' \n')
echo "   Batteries in database: ${BATTERY_COUNT}"

if [ "$BATTERY_COUNT" = "1944" ]; then
    echo "${GREEN}✅ Database initialized successfully${NC}"
else
    echo "${YELLOW}⚠️  Expected 1,944 batteries, found ${BATTERY_COUNT}${NC}"
fi

cd ../..

echo ""
echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "${BLUE}Step 5: Deploying Simulator Service${NC}"
echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

cd services/simulator

# Create service if it doesn't exist
railway service 2>/dev/null || railway up --service simulator

# Set environment variables
echo "Configuring simulator environment..."
railway variables set \
  ENVIRONMENT=production \
  PORT=8001 \
  SIMULATOR_CACHE_SIZE=500 \
  BATCH_MAX_SIZE=200 \
  BATCH_PARALLEL_WORKERS=10 \
  LOG_LEVEL=INFO

# Deploy simulator
echo "Deploying simulator service..."
railway up --detach

echo "${GREEN}✅ Simulator service deployed${NC}"
SIMULATOR_URL=$(railway domain 2>/dev/null || echo "pending")
echo "   URL: ${SIMULATOR_URL}"

cd ../..

# Update backend with simulator URL
if [ "$SIMULATOR_URL" != "pending" ]; then
    cd services/backend
    echo "Linking simulator to backend..."
    railway variables set SIMULATOR_URL="https://${SIMULATOR_URL}"
    cd ../..
fi

echo ""
echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "${BLUE}Step 6: Deploying MLOps Service${NC}"
echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

cd services/mlops

# Create service if it doesn't exist
railway service 2>/dev/null || railway up --service mlops

# Set environment variables
echo "Configuring MLOps environment..."
railway variables set \
  ENVIRONMENT=production \
  PORT=8001 \
  BATCH_MAX_SIZE=500 \
  BATCH_PARALLEL_WORKERS=10 \
  MODEL_CACHE_SIZE=4 \
  PREDICTION_BATCH_SIZE=50 \
  FEATURE_WINDOW_SIZE=10 \
  LOG_LEVEL=INFO

# Deploy MLOps
echo "Deploying MLOps service..."
railway up --detach

echo "${GREEN}✅ MLOps service deployed${NC}"
MLOPS_URL=$(railway domain 2>/dev/null || echo "pending")
echo "   URL: ${MLOPS_URL}"

cd ../..

echo ""
echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "${BLUE}Step 7: Deploying Frontend Service${NC}"
echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

cd services/frontend

# Create service if it doesn't exist
railway service 2>/dev/null || railway up --service frontend

# Set environment variables
echo "Configuring frontend environment..."
if [ "$BACKEND_URL" != "pending" ]; then
    railway variables set VITE_API_URL="https://${BACKEND_URL}"
else
    echo "${YELLOW}⚠️  Backend URL not ready, you'll need to set VITE_API_URL manually${NC}"
fi

# Deploy frontend
echo "Deploying frontend service..."
railway up --detach

echo "${GREEN}✅ Frontend service deployed${NC}"
FRONTEND_URL=$(railway domain 2>/dev/null || echo "pending")
echo "   URL: ${FRONTEND_URL}"

cd ../..

echo ""
echo "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo "${GREEN}║               🎉 Deployment Complete! 🎉                   ║${NC}"
echo "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "${BLUE}Service URLs:${NC}"
echo "  🌐 Frontend:  ${FRONTEND_URL:-pending}"
echo "  🔧 Backend:   ${BACKEND_URL:-pending}"
echo "  🤖 Simulator: ${SIMULATOR_URL:-pending}"
echo "  🧠 MLOps:     ${MLOPS_URL:-pending}"
echo ""
echo "${BLUE}Next Steps:${NC}"
echo "  1. Verify services: ${YELLOW}railway status${NC}"
echo "  2. Check logs: ${YELLOW}railway logs --service backend${NC}"
echo "  3. Monitor health: ${YELLOW}curl https://${BACKEND_URL}/api/v1/health${NC}"
echo "  4. Visit frontend: ${YELLOW}open https://${FRONTEND_URL}${NC}"
echo ""
echo "${BLUE}Database Status:${NC}"
echo "  📊 Batteries: ${BATTERY_COUNT}/1944"
echo "  🏢 Facilities: 9"
echo "  🔋 Strings: 81"
echo ""
echo "${YELLOW}Note: If URLs show 'pending', run 'railway domain' in each service directory${NC}"
echo ""
