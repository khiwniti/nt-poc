#!/bin/bash
# Deploy Frontend to Railway

set -e

echo "🚀 Deploying Frontend to Railway..."

# Change to frontend directory
cd services/frontend

# Deploy using Railway CLI
railway up

echo "✅ Frontend deployment initiated!"
echo "📊 Check status at: https://railway.app"
