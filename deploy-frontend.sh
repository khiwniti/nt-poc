#!/bin/bash
set -e

echo "=============================================="
echo "Frontend Service Deployment Script"
echo "=============================================="
echo ""

# Check if frontend service exists
echo "🔍 Checking if frontend service exists..."
if railway status --service frontend 2>&1 | grep -q "Service not found"; then
    echo "❌ Frontend service not found in Railway"
    echo ""
    echo "⚠️  MANUAL ACTION REQUIRED:"
    echo "1. Open: https://railway.com/project/6eef59c3-ae94-47e1-8151-692b91e1f7f4"
    echo "2. Click '+ New' → 'Empty Service'"
    echo "3. Name it: frontend"
    echo "4. Run this script again"
    exit 1
fi

echo "✅ Frontend service found"
echo ""

# Get backend URL
echo "🔍 Getting backend URL..."
BACKEND_URL=$(railway domain --service backend 2>&1 | grep -o 'https://[^[:space:]]*' | head -1)
if [ -z "$BACKEND_URL" ]; then
    echo "⚠️  Warning: Could not get backend URL"
    BACKEND_URL="https://backend-production.up.railway.app"
fi
echo "Backend URL: $BACKEND_URL"
echo ""

# Set environment variables
echo "⚙️  Setting environment variables..."
railway variables --service frontend \
  --set "NODE_ENV=production" \
  --set "VITE_APP_NAME=Battery Management System" \
  --set "VITE_APP_VERSION=1.0.0" \
  --set "VITE_ENVIRONMENT=production" \
  --set "VITE_API_BASE_URL=${BACKEND_URL}/api/v1" \
  --set "VITE_ENABLE_ANALYTICS=false" \
  --set "VITE_ENABLE_DEBUG_MODE=false" \
  --set "VITE_DEFAULT_THEME=light" \
  --set "VITE_ENABLE_DARK_MODE=true" \
  --set "GENERATE_SOURCEMAP=false"

echo "✅ Environment variables set"
echo ""

# Deploy frontend
echo "🚀 Deploying frontend service..."
railway up --service frontend --detach

echo ""
echo "✅ Frontend deployment initiated"
echo ""
echo "📊 Checking deployment status..."
sleep 5
railway status --service frontend

echo ""
echo "🌐 Getting frontend URL..."
FRONTEND_URL=$(railway domain --service frontend 2>&1 | grep -o 'https://[^[:space:]]*' | head -1)
if [ -n "$FRONTEND_URL" ]; then
    echo "Frontend URL: $FRONTEND_URL"
else
    echo "⚠️  Frontend URL not yet available - check Railway dashboard"
fi

echo ""
echo "=============================================="
echo "Deployment Complete!"
echo "=============================================="
echo ""
echo "Next steps:"
echo "1. Check Railway dashboard for build progress"
echo "2. Wait for deployment to complete (3-5 minutes)"
echo "3. Test frontend: curl -I $FRONTEND_URL"
