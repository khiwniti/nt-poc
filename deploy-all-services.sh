#!/bin/bash

# Deploy all services to Railway
# This script deploys: backend, frontend, mlops, simulator, and line-bot

set -e  # Exit on error

echo "=========================================="
echo "🚀 Railway Deployment Script"
echo "=========================================="
echo ""

# Check if logged in
if ! railway whoami &>/dev/null; then
    echo "❌ Not logged in to Railway. Please run: railway login"
    exit 1
fi

# Check if project is linked
if ! railway status &>/dev/null; then
    echo "❌ No Railway project linked. Please run: railway link"
    exit 1
fi

echo "✅ Authenticated and linked to Railway project"
echo ""

# Array of services to deploy
services=("backend" "frontend" "mlops" "simulator" "line-bot")

echo "🚀 Starting deployment of all services..."
echo "=========================================="
echo ""

# Deploy each service one by one
for service in "${services[@]}"; do
    echo "📦 Deploying service: $service"
    echo "-----------------------------------"
    
    # Deploy the service
    cd "services/$service" 2>/dev/null || cd .
    
    railway up --service "$service" --detach
    
    if [ $? -eq 0 ]; then
        echo "✅ $service deployed successfully"
    else
        echo "❌ Failed to deploy $service"
    fi
    
    cd - > /dev/null 2>&1
done
