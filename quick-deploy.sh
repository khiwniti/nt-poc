#!/bin/bash
# Quick Railway Setup Script with Your LINE Credentials

set -e

echo "========================================="
echo "  Quick Railway Deployment"
echo "========================================="
echo ""

# Check Railway CLI
if ! railway whoami &> /dev/null; then
    echo "Please login first: railway login"
    exit 1
fi

echo "✓ Logged in to Railway"
echo ""

# Step 1: Enable TimescaleDB
echo "========================================="
echo "  Step 1: Enable TimescaleDB"
echo "========================================="
echo ""
echo "Run this command and follow instructions:"
echo ""
echo "  railway connect Postgres"
echo ""
echo "Then in psql, run:"
echo "  CREATE EXTENSION IF NOT EXISTS timescaledb;"
echo "  \\dx"
echo "  \\q"
echo ""
read -p "Press Enter after TimescaleDB is enabled..."
echo ""

# Step 2: Set Environment Variables
echo "========================================="
echo "  Step 2: Configure Variables"
echo "========================================="
echo ""

# Generate JWT Secret
JWT_SECRET=$(openssl rand -base64 32)
echo "✓ Generated JWT secret"

# Backend variables
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

railway variables set --service backend \
  'DATABASE_URL=${{Postgres.DATABASE_URL}}' \
  'DB_HOST=${{Postgres.PGHOST}}' \
  'DB_PORT=${{Postgres.PGPORT}}' \
  'DB_NAME=${{Postgres.PGDATABASE}}' \
  'DB_USER=${{Postgres.PGUSER}}' \
  'DB_PASSWORD=${{Postgres.PGPASSWORD}}' \
  'REDIS_URL=${{Redis.REDIS_URL}}'

railway variables set --service backend \
  MLOPS_SERVICE_URL=http://mlops.railway.internal:8000 \
  SIMULATOR_URL=http://simulator.railway.internal:8001

echo "✓ Backend configured"

# Frontend variables
echo "Setting frontend variables..."
railway variables set --service frontend \
  VITE_APP_NAME="Battery Management System" \
  VITE_ENVIRONMENT=production \
  NODE_ENV=production \
  GENERATE_SOURCEMAP=false

echo "✓ Frontend configured"

# MLOps variables
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

echo "✓ MLOps configured"

# Simulator variables
echo "Setting simulator variables..."
railway variables set --service simulator \
  PORT=8001 \
  SENSOR_BACKEND=simulator \
  SIMULATOR_NOISE_LEVEL=0.02 \
  SIMULATOR_DRIFT_ENABLED=true \
  SIMULATOR_UPDATE_INTERVAL_MS=1000

echo "✓ Simulator configured"

# LINE Bot variables (with your credentials)
echo "Setting LINE Bot variables..."
railway variables set --service line-bot \
  PORT=3002 \
  NODE_ENV=production \
  BACKEND_API_URL=http://backend.railway.internal:3000 \
  LINE_CHANNEL_SECRET=e8e575a17c9847b835ff53e9ea81b7fd \
  LINE_CHANNEL_ACCESS_TOKEN=VAspANGGOvItOzldvJEQGC0XI4xDW5Z0UDTzBVDSqkHGI4zct5C5pcEjCN+jgObzWPs5DwrjSKIeIE2EPyP9mrBKz/XDSKAdEdY+HEOIGNYrB7vju/M7bYSwb2L1o/g0FAWqAe8YGMf0lZfT7BAq9gdB04t89/1O/w1cDnyilFU=

echo "✓ LINE Bot configured"
echo ""

# Step 3: Deploy Services
echo "========================================="
echo "  Step 3: Deploy Services"
echo "========================================="
echo ""

services=("backend" "mlops" "simulator" "line-bot" "frontend")

for service in "${services[@]}"; do
    echo "→ Deploying ${service}..."
    if railway up --service "${service}"; then
        echo "✓ ${service} deployed"
    else
        echo "✗ ${service} failed"
    fi
    echo ""
done

# Step 4: Run Migrations
echo "========================================="
echo "  Step 4: Run Migrations"
echo "========================================="
echo ""
echo "Running database migrations..."
railway run --service backend npm run migrate
echo "✓ Migrations complete"
echo ""

# Summary
echo "========================================="
echo "  Deployment Complete!"
echo "========================================="
echo ""
echo "Check status: railway status"
echo "View logs: railway logs --service backend"
echo "Get URLs: railway domain"
echo ""
echo "Next steps:"
echo "1. Get your backend URL: railway domain --service backend"
echo "2. Update frontend: railway variables set --service frontend VITE_API_BASE_URL=https://<backend-url>/api"
echo "3. Redeploy frontend: railway up --service frontend"
echo "4. Get LINE Bot URL and update LINE Console webhook"
echo ""
