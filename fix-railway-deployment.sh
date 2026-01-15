#!/bin/bash
# Railway Deployment Fix Script
# This script provides instructions and automation to fix the Railway deployment

set -e

echo "======================================================================"
echo "Railway Deployment Fix for nt-poc-battery-management"
echo "======================================================================"
echo ""
echo "Root Cause: Railway Dashboard builder settings override railway.toml"
echo "Status: Config file updated ✅ (removed global NIXPACKS builder)"
echo "Next Step: Manual Dashboard configuration required"
echo ""

echo "======================================================================"
echo "STEP 1: Open Railway Dashboard"
echo "======================================================================"
echo ""
echo "URL: https://railway.com/project/6eef59c3-ae94-47e1-8151-692b91e1f7f4"
echo ""
echo "Press Enter when ready to continue..."
read

echo ""
echo "======================================================================"
echo "STEP 2: Configure Builder for Each Service"
echo "======================================================================"
echo ""
echo "For EACH of the 5 services, follow these steps:"
echo ""
echo "Services to configure:"
echo "  1. backend"
echo "  2. frontend"
echo "  3. mlops"
echo "  4. simulator"
echo "  5. line-bot"
echo ""
echo "For each service:"
echo "  a) Click on the service name"
echo "  b) Go to 'Settings' tab"
echo "  c) Scroll to 'Build' section"
echo "  d) Change 'Builder' dropdown from 'Nixpacks' to 'Dockerfile'"
echo "  e) Verify 'Dockerfile Path' shows: Dockerfile"
echo "  f) Verify 'Root Directory' is BLANK (uses railway.toml source path)"
echo "  g) Click 'Deploy' button at the top"
echo ""
echo "Press Enter after configuring ALL 5 services..."
read

echo ""
echo "======================================================================"
echo "STEP 3: Monitor Deployments"
echo "======================================================================"
echo ""
echo "Checking deployment status..."
echo ""

# Check deployment status using Railway CLI
railway status || echo "Run 'railway status' to check deployment progress"

echo ""
echo "To monitor build logs for each service, run:"
echo "  railway logs --service backend"
echo "  railway logs --service frontend"
echo "  railway logs --service mlops"
echo "  railway logs --service simulator"
echo "  railway logs --service line-bot"
echo ""
echo "Press Enter when all deployments show SUCCESS..."
read

echo ""
echo "======================================================================"
echo "STEP 4: Post-Deployment Configuration"
echo "======================================================================"
echo ""
echo "Running post-deployment tasks..."
echo ""

echo "4.1 Enabling TimescaleDB extension..."
railway run --service backend psql \$DATABASE_URL -c "CREATE EXTENSION IF NOT EXISTS timescaledb;" || echo "Note: May need to run manually if this fails"

echo ""
echo "4.2 Running database migrations..."
cd services/backend
railway run --service backend npm run migrate || echo "Note: May need to run manually if this fails"
cd ../..

echo ""
echo "======================================================================"
echo "STEP 5: Verify Deployments"
echo "======================================================================"
echo ""
echo "Testing health endpoints..."
echo ""

echo "Backend Health:"
curl -s https://backend-production-77f7.up.railway.app/api/v1/health | jq . || echo "Backend not responding"

echo ""
echo "MLOps Health:"
curl -s https://mlops-production-3b39.up.railway.app/health | jq . || echo "MLOps not responding"

echo ""
echo "Simulator Health:"
curl -s https://simulator-production-a018.up.railway.app/health | jq . || echo "Simulator not responding"

echo ""
echo "LINE Bot Health:"
curl -s https://line-bot-production-8114.up.railway.app/health | jq . || echo "LINE Bot not responding"

echo ""
echo "Frontend (should return HTML):"
curl -s -I https://frontend-production-036e.up.railway.app | head -n 1

echo ""
echo "======================================================================"
echo "STEP 6: Update LINE Webhook (if needed)"
echo "======================================================================"
echo ""
echo "LINE Bot URL: https://line-bot-production-8114.up.railway.app"
echo "Webhook URL: https://line-bot-production-8114.up.railway.app/webhook"
echo ""
echo "Update in LINE Developers Console:"
echo "https://developers.line.biz/console/"
echo ""

echo ""
echo "======================================================================"
echo "Deployment Fix Complete! ✅"
echo "======================================================================"
echo ""
echo "Next steps:"
echo "  1. Verify all services are running: railway status"
echo "  2. Check service logs if any issues: railway logs --service <name>"
echo "  3. Update frontend API URL if backend domain changed"
echo "  4. Test end-to-end functionality"
echo ""
echo "Service URLs:"
echo "  Backend:   https://backend-production-77f7.up.railway.app"
echo "  Frontend:  https://frontend-production-036e.up.railway.app"
echo "  MLOps:     https://mlops-production-3b39.up.railway.app"
echo "  Simulator: https://simulator-production-a018.up.railway.app"
echo "  LINE Bot:  https://line-bot-production-8114.up.railway.app"
echo ""
