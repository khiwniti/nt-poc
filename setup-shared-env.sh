#!/bin/bash

# ============================================================================
# Railway Shared Environment Variables Setup Script
# ============================================================================
# This script helps configure environment variables that are shared across
# multiple services in your Railway project.
#
# Usage:
#   1. Make sure you're logged in: railway login
#   2. Link to project: railway link --project battery-rul-monitoring
#   3. Run this script: ./setup-shared-env.sh
# ============================================================================

set -e

echo "=========================================="
echo "🔧 Railway Shared Environment Setup"
echo "=========================================="
echo ""

# Check if logged in
if ! railway whoami &>/dev/null; then
    echo "❌ Not logged in to Railway. Please run: railway login"
    exit 1
fi

echo "✅ Authenticated to Railway"
echo ""

# Function to set environment variable for a service
set_service_var() {
    local service=$1
    local key=$2
    local value=$3
    
    echo "  Setting $key for $service..."
    railway variables --service "$service" set "$key=$value" 2>/dev/null || echo "    ⚠️  Failed (service might not exist yet)"
}

# ============================================================================
# SHARED VARIABLES (Applied to multiple services)
# ============================================================================

echo "📦 Setting up SHARED environment variables..."
echo "-------------------------------------------"

# Generate JWT Secret (if not already set)
JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || echo "PLEASE_CHANGE_THIS_SECRET")
echo "Generated JWT_SECRET: ${JWT_SECRET:0:10}..."

# Database connection (shared from PostgreSQL plugin)
echo ""
echo "💾 Database Variables (from PostgreSQL plugin):"
echo "   These should be automatically set by Railway's PostgreSQL plugin"
echo "   Make sure PostgreSQL is added to your project first!"
echo ""

# Redis connection (shared from Redis plugin)
echo "🔴 Redis Variables (from Redis plugin):"
echo "   These should be automatically set by Railway's Redis plugin"
echo "   Make sure Redis is added to your project first!"
echo ""

# ============================================================================
# BACKEND SERVICE VARIABLES
# ============================================================================

echo "🔧 Setting BACKEND service variables..."
echo "-------------------------------------------"

set_service_var "backend" "NODE_ENV" "production"
set_service_var "backend" "PORT" "3000"
set_service_var "backend" "JWT_SECRET" "$JWT_SECRET"
set_service_var "backend" "JWT_EXPIRY" "24h"
set_service_var "backend" "LOG_LEVEL" "info"
set_service_var "backend" "DB_SSL" "true"

# Job configurations
set_service_var "backend" "PREDICTION_JOB_INTERVAL_MINUTES" "60"
set_service_var "backend" "ESCALATION_JOB_INTERVAL_MINUTES" "5"

# Email configuration (optional - update with your values)
echo ""
echo "⚠️  Email configuration needs manual setup:"
echo "   SENDGRID_API_KEY"
echo "   EMAIL_FROM"
echo "   EMAIL_FROM_NAME"

# Internal service URLs
set_service_var "backend" "MLOPS_SERVICE_URL" "http://mlops.railway.internal:8001"

echo ""

# ============================================================================
# FRONTEND SERVICE VARIABLES
# ============================================================================

echo "🎨 Setting FRONTEND service variables..."
echo "-------------------------------------------"

set_service_var "frontend" "NODE_ENV" "production"
set_service_var "frontend" "VITE_APP_NAME" "Battery Management System"
set_service_var "frontend" "VITE_APP_VERSION" "1.0.0"
set_service_var "frontend" "VITE_ENVIRONMENT" "production"
set_service_var "frontend" "VITE_ENABLE_ANALYTICS" "true"
set_service_var "frontend" "VITE_ENABLE_OFFLINE_MODE" "false"
set_service_var "frontend" "VITE_ENABLE_DEBUG_MODE" "false"
set_service_var "frontend" "VITE_DEFAULT_THEME" "light"
set_service_var "frontend" "VITE_ENABLE_DARK_MODE" "true"
set_service_var "frontend" "GENERATE_SOURCEMAP" "false"

echo ""
echo "⚠️  Frontend API URLs need Railway public domains:"
echo "   VITE_API_BASE_URL (e.g., https://backend-production.up.railway.app/api/v1)"
echo "   VITE_MLOPS_SERVICE_URL (e.g., https://mlops-production.up.railway.app)"

echo ""

# ============================================================================
# MLOPS SERVICE VARIABLES
# ============================================================================

echo "🤖 Setting MLOPS service variables..."
echo "-------------------------------------------"

set_service_var "mlops" "APP_NAME" "MLOps Service"
set_service_var "mlops" "ENVIRONMENT" "production"
set_service_var "mlops" "PORT" "8001"
set_service_var "mlops" "LOG_LEVEL" "INFO"
set_service_var "mlops" "MODELS_DIR" "/app/models"
set_service_var "mlops" "MODEL_VERSION" "v1.0.0"
set_service_var "mlops" "WORKER_PROCESSES" "2"
set_service_var "mlops" "MAX_BATCH_SIZE" "100"

echo ""

# ============================================================================
# SIMULATOR SERVICE VARIABLES
# ============================================================================

echo "🔬 Setting SIMULATOR service variables..."
echo "-------------------------------------------"

set_service_var "simulator" "APP_NAME" "Sensor Simulator"
set_service_var "simulator" "PORT" "8002"
set_service_var "simulator" "SIMULATION_INTERVAL" "5"
set_service_var "simulator" "BACKEND_API_URL" "http://backend.railway.internal:3000"

echo ""

# ============================================================================
# LINE BOT SERVICE VARIABLES
# ============================================================================

echo "💬 Setting LINE BOT service variables..."
echo "-------------------------------------------"

set_service_var "line-bot" "NODE_ENV" "production"
set_service_var "line-bot" "PORT" "3001"
set_service_var "line-bot" "BACKEND_API_URL" "http://backend.railway.internal:3000"

echo ""
echo "⚠️  LINE Bot API credentials need manual setup:"
echo "   LINE_CHANNEL_ACCESS_TOKEN"
echo "   LINE_CHANNEL_SECRET"

echo ""
echo "=========================================="
echo "✅ Shared environment setup completed!"
echo "=========================================="
echo ""
echo "📋 NEXT STEPS:"
echo "-------------------------------------------"
echo "1. Add PostgreSQL database to your Railway project"
echo "2. Add Redis to your Railway project"
echo "3. Set the following manually via Railway Dashboard:"
echo "   - SENDGRID_API_KEY (for backend)"
echo "   - EMAIL_FROM (for backend)"
echo "   - EMAIL_FROM_NAME (for backend)"
echo "   - LINE_CHANNEL_ACCESS_TOKEN (for line-bot)"
echo "   - LINE_CHANNEL_SECRET (for line-bot)"
echo "   - VITE_API_BASE_URL (for frontend)"
echo "   - VITE_MLOPS_SERVICE_URL (for frontend)"
echo ""
echo "4. Link PostgreSQL to: backend, mlops"
echo "5. Link Redis to: backend, mlops"
echo ""
echo "6. Deploy all services:"
echo "   ./deploy-all-services.sh"
echo ""
echo "=========================================="
