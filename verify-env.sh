#!/bin/bash

# ============================================================================
# Railway Environment Variables Verification Script
# ============================================================================
# This script checks if all required environment variables are set
# for each service in your Railway project.
# ============================================================================

set -e

echo "=========================================="
echo "🔍 Railway Environment Verification"
echo "=========================================="
echo ""

# Check if logged in
if ! railway whoami &>/dev/null; then
    echo "❌ Not logged in to Railway. Please run: railway login"
    exit 1
fi

echo "✅ Authenticated to Railway"
echo ""

# Define services
services=("backend" "frontend" "mlops" "simulator" "line-bot")

# Function to check if a variable exists for a service
check_var() {
    local service=$1
    local var_name=$2
    
    # Get variables for the service and check if var exists
    if railway variables --service "$service" 2>/dev/null | grep -q "^$var_name"; then
        echo "  ✅ $var_name"
        return 0
    else
        echo "  ❌ $var_name (MISSING)"
        return 1
    fi
}

# Track overall status
all_good=true

# ============================================================================
# BACKEND SERVICE
# ============================================================================
echo "🔧 Checking BACKEND service..."
echo "-------------------------------------------"

required_backend=(
    "NODE_ENV"
    "PORT"
    "JWT_SECRET"
    "JWT_EXPIRY"
    "LOG_LEVEL"
    "MLOPS_SERVICE_URL"
)

for var in "${required_backend[@]}"; do
    check_var "backend" "$var" || all_good=false
done

echo ""
echo "  Database variables (should be auto-provided by PostgreSQL plugin):"
database_vars=("DATABASE_URL" "DB_HOST" "DB_PORT" "DB_NAME" "DB_USER" "DB_PASSWORD")
for var in "${database_vars[@]}"; do
    check_var "backend" "$var" || echo "    ⚠️  $var not found (add PostgreSQL plugin)"
done

echo ""
echo "  Redis variables (should be auto-provided by Redis plugin):"
check_var "backend" "REDIS_URL" || echo "    ⚠️  REDIS_URL not found (add Redis plugin)"

echo ""

# ============================================================================
# FRONTEND SERVICE
# ============================================================================
echo "🎨 Checking FRONTEND service..."
echo "-------------------------------------------"

required_frontend=(
    "NODE_ENV"
    "VITE_APP_NAME"
    "VITE_APP_VERSION"
    "VITE_ENVIRONMENT"
    "VITE_API_BASE_URL"
)

for var in "${required_frontend[@]}"; do
    check_var "frontend" "$var" || all_good=false
done

echo ""

# ============================================================================
# MLOPS SERVICE
# ============================================================================
echo "🤖 Checking MLOPS service..."
echo "-------------------------------------------"

required_mlops=(
    "APP_NAME"
    "ENVIRONMENT"
    "PORT"
    "LOG_LEVEL"
)

for var in "${required_mlops[@]}"; do
    check_var "mlops" "$var" || all_good=false
done

echo ""

# ============================================================================
# SIMULATOR SERVICE
# ============================================================================
echo "🔬 Checking SIMULATOR service..."
echo "-------------------------------------------"

required_simulator=(
    "APP_NAME"
    "PORT"
    "BACKEND_API_URL"
)

for var in "${required_simulator[@]}"; do
    check_var "simulator" "$var" || all_good=false
done

echo ""

# ============================================================================
# LINE BOT SERVICE
# ============================================================================
echo "💬 Checking LINE BOT service..."
echo "-------------------------------------------"

required_linebot=(
    "NODE_ENV"
    "PORT"
    "BACKEND_API_URL"
    "LINE_CHANNEL_ACCESS_TOKEN"
    "LINE_CHANNEL_SECRET"
)

for var in "${required_linebot[@]}"; do
    check_var "line-bot" "$var" || all_good=false
done

echo ""
echo "=========================================="

if [ "$all_good" = true ]; then
    echo "✅ All required environment variables are set!"
    echo ""
    echo "📋 NEXT STEPS:"
    echo "   1. Verify database plugins are added (PostgreSQL + Redis)"
    echo "   2. Deploy all services: ./deploy-all-services.sh"
else
    echo "❌ Some environment variables are missing!"
    echo ""
    echo "📋 NEXT STEPS:"
    echo "   1. Run: ./setup-shared-env.sh"
    echo "   2. Set missing variables manually via Railway Dashboard"
    echo "   3. Run this verification script again"
fi

echo "=========================================="
