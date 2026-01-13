#!/bin/bash

# ============================================================================
# COMPLETE RAILWAY DEPLOYMENT - AUTOMATED
# ============================================================================
# This script will deploy all services with shared environment variables
# ============================================================================

set -e

echo "════════════════════════════════════════════════════════════════"
echo "🚀 Starting Complete Railway Deployment"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Step 1: Verify login
echo "STEP 1/4: Verifying Railway authentication..."
echo "────────────────────────────────────────────────────────────────"
if ! railway whoami &>/dev/null; then
    echo "❌ Not logged in to Railway"
    echo ""
    echo "Please run the following command in your terminal:"
    echo "  railway login"
    echo ""
    echo "Then run this script again."
    exit 1
fi

railway whoami
echo "✅ Authenticated successfully"
echo ""

# Step 2: Link project
echo "STEP 2/4: Linking to Railway project..."
echo "────────────────────────────────────────────────────────────────"
railway link --project battery-rul-monitoring || echo "⚠️  Already linked or manual link needed"
railway status
echo "✅ Project linked"
echo ""

# Step 3: Setup environment variables
echo "STEP 3/4: Setting up shared environment variables..."
echo "────────────────────────────────────────────────────────────────"
./setup-shared-env.sh
echo ""

# Step 4: Deploy all services
echo "STEP 4/4: Deploying all services..."
echo "────────────────────────────────────────────────────────────────"
./deploy-all-services.sh
echo ""

echo "════════════════════════════════════════════════════════════════"
echo "✅ Deployment process completed!"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "📋 NEXT STEPS:"
echo "────────────────────────────────────────────────────────────────"
echo "1. Add PostgreSQL plugin via Railway Dashboard"
echo "   https://railway.app/project/battery-rul-monitoring"
echo ""
echo "2. Add Redis plugin via Railway Dashboard"
echo ""
echo "3. Enable TimescaleDB extension:"
echo "   railway run psql \$DATABASE_URL -c \"CREATE EXTENSION IF NOT EXISTS timescaledb;\""
echo ""
echo "4. Get service URLs and update frontend:"
echo "   railway status"
echo "   railway variables --service frontend set VITE_API_BASE_URL=https://<backend-url>/api/v1"
echo ""
echo "5. Verify deployment:"
echo "   ./verify-env.sh"
echo "   railway logs --service backend --follow"
echo ""
echo "════════════════════════════════════════════════════════════════"
