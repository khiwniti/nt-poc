#!/bin/bash
# Quick Deploy Frontend to Railway

echo "🚀 Deploying Frontend to Railway (nt-poc-battery-management)"
echo "=================================================="
echo ""

# Create frontend service if it doesn't exist
echo "1️⃣ Creating/linking frontend service..."
cd /Users/khiwn/nt-poc/nt-poc

# Try to link to frontend service, if it doesn't exist, instructions below
railway service frontend 2>/dev/null

if [ $? -ne 0 ]; then
    echo "❌ Frontend service doesn't exist in Railway yet."
    echo ""
    echo "📋 To create it:"
    echo "   1. Go to: https://railway.app/project/6eef59c3-ae94-47e1-8151-692b91e1f7f4"
    echo "   2. Click '+ New' → 'Empty Service'"
    echo "   3. Name it: frontend"
    echo "   4. Set Root Directory: services/frontend"
    echo "   5. Add environment variables:"
    echo "      VITE_API_BASE_URL=https://your-backend.railway.app/api"
    echo "      NODE_ENV=production"
    echo ""
    echo "Then run this script again."
    exit 1
fi

# Deploy from frontend directory
echo "2️⃣ Deploying frontend..."
cd services/frontend
railway up

echo ""
echo "✅ Frontend deployment initiated!"
echo "📊 Check: https://railway.app/project/6eef59c3-ae94-47e1-8151-692b91e1f7f4"
