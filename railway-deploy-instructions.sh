#!/bin/bash
# Railway Deployment Script - Step by Step
# This script deploys all services defined in railway.toml

set -e
export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  Railway Deployment - NT-POC Battery Management${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════${NC}"
echo ""

# Generate JWT Secret
JWT_SECRET=$(openssl rand -base64 32)
echo -e "${GREEN}✅ Generated JWT Secret${NC}"
echo ""

# Instructions for deployment
echo -e "${YELLOW}📋 Deployment Steps:${NC}"
echo ""
echo -e "${BLUE}Railway CLI v4 requires services to be created via the dashboard first.${NC}"
echo -e "${BLUE}Please follow these steps:${NC}"
echo ""

echo -e "${CYAN}════ Step 1: Create Services in Railway Dashboard ════${NC}"
echo ""
echo "1. Open: https://railway.com/project/6eef59c3-ae94-47e1-8151-692b91e1f7f4"
echo ""
echo "2. Click '+ New' → 'Empty Service' for each:"
echo "   - backend"
echo "   - frontend"
echo "   - mlops"
echo "   - simulator"
echo "   - line-bot"
echo ""
echo "3. For each service, click Settings → Service Name and set the exact name"
echo ""

echo -e "${CYAN}════ Step 2: Deploy from CLI (after services created) ════${NC}"
echo ""
echo "# Deploy all services:"
echo "railway up --service backend &"
echo "railway up --service frontend &"
echo "railway up --service mlops &"
echo "railway up --service simulator &"
echo "railway up --service line-bot &"
echo "wait"
echo ""

echo -e "${CYAN}════ Step 3: Set Environment Variables ════${NC}"
echo ""
echo "# Backend"
echo "railway variables --service backend \\"
echo "  --set \"NODE_ENV=production\" \\"
echo "  --set \"PORT=3000\" \\"
echo "  --set \"DB_SSL=true\" \\"
echo "  --set \"JWT_SECRET=$JWT_SECRET\" \\"
echo "  --set \"JWT_EXPIRY=24h\" \\"
echo "  --set \"PREDICTION_JOB_INTERVAL_MINUTES=60\" \\"
echo "  --set \"LOG_LEVEL=info\" \\"
echo "  --set 'DATABASE_URL=\${{Postgres.DATABASE_URL}}' \\"
echo "  --set 'DB_HOST=\${{Postgres.PGHOST}}' \\"
echo "  --set 'DB_PORT=\${{Postgres.PGPORT}}' \\"
echo "  --set 'DB_NAME=\${{Postgres.PGDATABASE}}' \\"
echo "  --set 'DB_USER=\${{Postgres.PGUSER}}' \\"
echo "  --set 'DB_PASSWORD=\${{Postgres.PGPASSWORD}}' \\"
echo "  --set 'REDIS_URL=\${{Redis.REDIS_URL}}'"
echo ""

echo "# Frontend"
echo "railway variables --service frontend \\"
echo "  --set \"VITE_APP_NAME=Battery Management System\" \\"
echo "  --set \"NODE_ENV=production\""
echo ""

echo "# MLOps"
echo "railway variables --service mlops \\"
echo "  --set \"PORT=8000\" \\"
echo "  --set \"ENVIRONMENT=production\" \\"
echo "  --set 'DATABASE_URL=\${{Postgres.DATABASE_URL}}'"
echo ""

echo "# Simulator"
echo "railway variables --service simulator \\"
echo "  --set \"PORT=8001\" \\"
echo "  --set \"SENSOR_BACKEND=simulator\""
echo ""

echo "# LINE Bot"
echo "railway variables --service line-bot \\"
echo "  --set \"PORT=3002\" \\"
echo "  --set \"NODE_ENV=production\" \\"
echo "  --set \"LINE_CHANNEL_SECRET=e8e575a17c9847b835ff53e9ea81b7fd\" \\"
echo "  --set \"LINE_CHANNEL_ACCESS_TOKEN=VAspANGGOvItOzldvJEQGC0XI4xDW5Z0UDTzBVDSqkHGI4zct5C5pcEjCN+jgObzWPs5DwrjSKIeIE2EPyP9mrBKz/XDSKAdEdY+HEOIGNYrB7vju/M7bYSwb2L1o/g0FAWqAe8YGMf0lZfT7BAq9gdB04t89/1O/w1cDnyilFU=\""
echo ""

echo -e "${CYAN}════ Step 4: Enable TimescaleDB ════${NC}"
echo ""
echo "railway connect Postgres"
echo "# In psql: CREATE EXTENSION IF NOT EXISTS timescaledb;"
echo ""

echo -e "${CYAN}════ Step 5: Run Migrations ════${NC}"
echo ""
echo "railway run --service backend npm run migrate"
echo ""

echo -e "${CYAN}════ Step 6: Get URLs and Update ════${NC}"
echo ""
echo "railway domain"
echo ""

echo -e "${GREEN}JWT Secret saved to: jwt-secret.txt${NC}"
echo "$JWT_SECRET" > jwt-secret.txt
echo ""
