#!/bin/bash
# Railway Deployment Script for NT-POC Battery Management System
# Deploys all services to Railway with proper configuration

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color
BLUE='\033[0;34m'

echo "========================================="
echo "  NT-POC Railway Deployment Script"
echo "========================================="
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo -e "${RED}✗${NC} Railway CLI not found. Please install it:"
    echo "  npm install -g @railway/cli"
    echo "  Or visit: https://docs.railway.app/develop/cli"
    exit 1
fi

echo -e "${GREEN}✓${NC} Railway CLI found"

# Check if logged in
if ! railway whoami &> /dev/null; then
    echo -e "${YELLOW}!${NC} Not logged in to Railway"
    echo "  Running: railway login"
    railway login

    if ! railway whoami &> /dev/null; then
        echo -e "${RED}✗${NC} Login failed. Please try again."
        exit 1
    fi
fi

RAILWAY_USER=$(railway whoami)
echo -e "${GREEN}✓${NC} Logged in as: ${RAILWAY_USER}"
echo ""

# Check if project is linked
if ! railway status &> /dev/null; then
    echo -e "${YELLOW}!${NC} Project not linked"
    echo ""
    echo "Choose an option:"
    echo "  1) Link to existing project"
    echo "  2) Create new project"
    read -p "Enter choice (1 or 2): " choice

    case $choice in
        1)
            echo "Linking to existing project..."
            railway link
            ;;
        2)
            read -p "Enter project name (default: nt-poc-battery-management): " project_name
            project_name=${project_name:-nt-poc-battery-management}
            echo "Creating new project: ${project_name}"
            railway init --name "${project_name}"
            ;;
        *)
            echo -e "${RED}✗${NC} Invalid choice"
            exit 1
            ;;
    esac

    if ! railway status &> /dev/null; then
        echo -e "${RED}✗${NC} Failed to link/create project"
        exit 1
    fi
fi

PROJECT_INFO=$(railway status 2>&1 | head -5)
echo -e "${GREEN}✓${NC} Project linked"
echo "${PROJECT_INFO}"
echo ""

# Ask about database plugins
echo "========================================="
echo "  Database & Cache Setup"
echo "========================================="
echo ""

read -p "Have you added PostgreSQL database? (y/n): " has_postgres
if [[ "$has_postgres" != "y" ]]; then
    echo -e "${YELLOW}!${NC} Adding PostgreSQL database..."
    railway add --database postgres
    echo -e "${GREEN}✓${NC} PostgreSQL added"
    echo ""
    echo -e "${YELLOW}⚠️  IMPORTANT:${NC} Enable TimescaleDB extension:"
    echo "  1. railway connect Postgres"
    echo "  2. In psql: CREATE EXTENSION IF NOT EXISTS timescaledb;"
    echo "  3. Verify: \\dx"
    echo "  4. Exit: \\q"
    echo ""
    read -p "Press Enter after enabling TimescaleDB..."
fi

read -p "Have you added Redis cache? (y/n): " has_redis
if [[ "$has_redis" != "y" ]]; then
    echo -e "${YELLOW}!${NC} Adding Redis cache..."
    railway add --database redis
    echo -e "${GREEN}✓${NC} Redis added"
fi

echo ""

# Configure environment variables
echo "========================================="
echo "  Environment Variables Configuration"
echo "========================================="
echo ""

read -p "Configure environment variables now? (y/n): " configure_vars
if [[ "$configure_vars" == "y" ]]; then
    echo ""
    echo "Generating JWT secret..."
    JWT_SECRET=$(openssl rand -base64 32)

    echo "Setting backend variables..."
    railway variables set --service backend \
      NODE_ENV=production \
      PORT=3000 \
      DB_SSL=true \
      JWT_SECRET="${JWT_SECRET}" \
      JWT_EXPIRY=24h \
      PREDICTION_JOB_INTERVAL_MINUTES=60 \
      ESCALATION_JOB_INTERVAL_MINUTES=5 \
      SENSOR_INGESTION_ENABLED=true \
      SENSOR_INGESTION_INTERVAL=10000 \
      LOG_LEVEL=info

    echo "Linking database variables..."
    railway variables set --service backend \
      'DATABASE_URL=${{Postgres.DATABASE_URL}}' \
      'DB_HOST=${{Postgres.PGHOST}}' \
      'DB_PORT=${{Postgres.PGPORT}}' \
      'DB_NAME=${{Postgres.PGDATABASE}}' \
      'DB_USER=${{Postgres.PGUSER}}' \
      'DB_PASSWORD=${{Postgres.PGPASSWORD}}' \
      'REDIS_URL=${{Redis.REDIS_URL}}'

    echo "Setting service URLs..."
    railway variables set --service backend \
      MLOPS_SERVICE_URL=http://mlops.railway.internal:8000 \
      SIMULATOR_URL=http://simulator.railway.internal:8001

    echo "Setting frontend variables..."
    railway variables set --service frontend \
      VITE_APP_NAME="Battery Management System" \
      VITE_ENVIRONMENT=production \
      NODE_ENV=production \
      GENERATE_SOURCEMAP=false

    echo "Setting MLOps variables..."
    railway variables set --service mlops \
      PORT=8000 \
      ENVIRONMENT=production \
      LOG_LEVEL=INFO \
      MODELS_DIR=/app/models \
      MODEL_VERSION=v1.0.0

    railway variables set --service mlops \
      'DATABASE_URL=${{Postgres.DATABASE_URL}}' \
      'DB_HOST=${{Postgres.PGHOST}}' \
      'DB_PORT=${{Postgres.PGPORT}}' \
      'DB_NAME=${{Postgres.PGDATABASE}}' \
      'DB_USER=${{Postgres.PGUSER}}' \
      'DB_PASSWORD=${{Postgres.PGPASSWORD}}' \
      'REDIS_URL=${{Redis.REDIS_URL}}'

    echo "Setting simulator variables..."
    railway variables set --service simulator \
      PORT=8001 \
      SENSOR_BACKEND=simulator \
      SIMULATOR_NOISE_LEVEL=0.02 \
      SIMULATOR_DRIFT_ENABLED=true \
      SIMULATOR_UPDATE_INTERVAL_MS=1000

    echo "Setting LINE Bot variables..."
    railway variables set --service line-bot \
      PORT=3002 \
      NODE_ENV=production

    echo -e "${GREEN}✓${NC} Environment variables configured"
    echo ""
    echo -e "${YELLOW}⚠️  Manual Configuration Required:${NC}"
    echo "  - LINE Bot: Set LINE_CHANNEL_ACCESS_TOKEN and LINE_CHANNEL_SECRET"
    echo "  - Frontend: Set VITE_API_BASE_URL after backend deployment"
    echo "  - Optional: Set SENDGRID_API_KEY for email alerts"
    echo ""
else
    echo -e "${YELLOW}!${NC} Skipping environment variables configuration"
    echo "  Configure manually via: railway variables set KEY=value"
fi

echo ""

# Deploy services
echo "========================================="
echo "  Deploying Services"
echo "========================================="
echo ""

read -p "Deploy all services now? (y/n): " deploy_now
if [[ "$deploy_now" != "y" ]]; then
    echo -e "${YELLOW}!${NC} Deployment skipped"
    echo ""
    echo "To deploy manually:"
    echo "  railway up --service backend"
    echo "  railway up --service frontend"
    echo "  railway up --service mlops"
    echo "  railway up --service simulator"
    echo "  railway up --service line-bot"
    exit 0
fi

# Deploy each service
services=("backend" "mlops" "simulator" "line-bot" "frontend")

for service in "${services[@]}"; do
    echo ""
    echo -e "${BLUE}→${NC} Deploying ${service}..."

    if railway up --service "${service}"; then
        echo -e "${GREEN}✓${NC} ${service} deployed successfully"
    else
        echo -e "${RED}✗${NC} ${service} deployment failed"
        echo "  Check logs: railway logs --service ${service}"
    fi
done

echo ""
echo "========================================="
echo "  Post-Deployment Tasks"
echo "========================================="
echo ""

read -p "Run database migrations? (y/n): " run_migrations
if [[ "$run_migrations" == "y" ]]; then
    echo "Running migrations..."
    railway run --service backend npm run migrate
    echo -e "${GREEN}✓${NC} Migrations complete"
fi

echo ""
echo "========================================="
echo "  Deployment Summary"
echo "========================================="
echo ""

railway status

echo ""
echo "View logs:"
for service in "${services[@]}"; do
    echo "  railway logs --service ${service}"
done

echo ""
echo "Get service URLs:"
echo "  railway domain"

echo ""
echo -e "${GREEN}✓${NC} Deployment script complete!"
echo ""
echo "Next steps:"
echo "  1. Check service status: railway status"
echo "  2. View logs: railway logs"
echo "  3. Get domains: railway domain"
echo "  4. Update LINE webhook URL with your Railway domain"
echo "  5. Update frontend VITE_API_BASE_URL with backend domain"
echo ""
echo "Documentation: RAILWAY_DEPLOYMENT_GUIDE.md"
echo ""
