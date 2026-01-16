#!/bin/bash
# Railway PostgreSQL Setup and Backend Configuration
# This script guides you through adding PostgreSQL to Railway and configuring the backend

set -e

echo "🚀 Railway PostgreSQL Setup Guide"
echo "=================================="
echo ""

echo "📋 Step 1: Add PostgreSQL Database to Railway"
echo "-----------------------------------------------"
echo "Since Railway CLI interactive commands don't work in scripts, please:"
echo ""
echo "Option A - Via Railway Dashboard (Recommended):"
echo "  1. Go to https://railway.app/dashboard"
echo "  2. Select your 'nt-poc' project"
echo "  3. Click '+ New' button"
echo "  4. Select 'Database' → 'Add PostgreSQL'"
echo "  5. Wait for the database to provision (takes ~1 minute)"
echo "  6. Railway will automatically set DATABASE_URL"
echo ""
echo "Option B - Via CLI (requires manual interaction):"
echo "  Run: railway add"
echo "  Select: PostgreSQL"
echo ""
echo "Press Enter when you've added the PostgreSQL database..."
read -r

echo ""
echo "📋 Step 2: Get Database Connection Details"
echo "-------------------------------------------"
echo "Getting database variables..."
echo ""

# Try to get DATABASE_URL
if railway variables --service postgresql 2>/dev/null | grep -q DATABASE_URL; then
    echo "✅ PostgreSQL database found!"
    DATABASE_URL=$(railway variables --service postgresql 2>/dev/null | grep DATABASE_URL | cut -d'=' -f2-)
    echo "Database URL: $DATABASE_URL"
else
    echo "⚠️  Could not auto-detect database URL"
    echo "Please manually get it from Railway dashboard:"
    echo "  1. Go to your project"
    echo "  2. Click on the PostgreSQL service"
    echo "  3. Go to 'Variables' tab"
    echo "  4. Copy the DATABASE_URL value"
    echo ""
    echo "Enter DATABASE_URL:"
    read -r DATABASE_URL
fi

echo ""
echo "📋 Step 3: Parse Database Connection String"
echo "--------------------------------------------"

# Parse DATABASE_URL to individual components
# Format: postgresql://user:password@host:port/database
if [[ $DATABASE_URL =~ postgresql://([^:]+):([^@]+)@([^:]+):([^/]+)/(.+) ]]; then
    DB_USER="${BASH_REMATCH[1]}"
    DB_PASSWORD="${BASH_REMATCH[2]}"
    DB_HOST="${BASH_REMATCH[3]}"
    DB_PORT="${BASH_REMATCH[4]}"
    DB_NAME="${BASH_REMATCH[5]}"
    
    echo "✅ Parsed connection details:"
    echo "  DB_HOST: $DB_HOST"
    echo "  DB_PORT: $DB_PORT"
    echo "  DB_NAME: $DB_NAME"
    echo "  DB_USER: $DB_USER"
    echo "  DB_PASSWORD: ********"
else
    echo "❌ Could not parse DATABASE_URL"
    exit 1
fi

echo ""
echo "📋 Step 4: Configure Backend Service"
echo "-------------------------------------"
echo "Setting environment variables for backend service..."

# Set individual database variables for backend
railway variables --service backend set DB_HOST="$DB_HOST" || echo "⚠️  Failed to set DB_HOST"
railway variables --service backend set DB_PORT="$DB_PORT" || echo "⚠️  Failed to set DB_PORT"
railway variables --service backend set DB_NAME="$DB_NAME" || echo "⚠️  Failed to set DB_NAME"
railway variables --service backend set DB_USER="$DB_USER" || echo "⚠️  Failed to set DB_USER"
railway variables --service backend set DB_PASSWORD="$DB_PASSWORD" || echo "⚠️  Failed to set DB_PASSWORD"
railway variables --service backend set DB_SSL="true" || echo "⚠️  Failed to set DB_SSL"

echo ""
echo "✅ Database variables configured for backend"

echo ""
echo "📋 Step 5: Verify JWT_SECRET"
echo "-----------------------------"

if railway variables --service backend 2>/dev/null | grep -q JWT_SECRET; then
    echo "✅ JWT_SECRET already set"
else
    echo "⚠️  JWT_SECRET not found, generating one..."
    JWT_SECRET=$(openssl rand -base64 32)
    railway variables --service backend set JWT_SECRET="$JWT_SECRET"
    echo "✅ JWT_SECRET generated and set"
fi

echo ""
echo "📋 Step 6: Deploy Backend with Migration Fixes"
echo "-----------------------------------------------"
echo "The backend has been updated with fixes for:"
echo "  - Knex migration path resolution (production vs development)"
echo "  - Proper TypeScript compilation of migration scripts"
echo "  - knexfile.js compatibility"
echo ""
echo "Deploying backend..."

cd services/backend
railway up --service backend

echo ""
echo "✅ Backend deployed! Waiting for deployment to complete..."
echo ""
echo "📋 Step 7: Monitor Deployment"
echo "-----------------------------"
echo "Watch the logs to ensure migrations run successfully:"
echo ""
echo "  railway logs --service backend"
echo ""
echo "Expected log sequence:"
echo "  1. '🚀 Starting NT-POC Backend Service...'"
echo "  2. '⏳ Waiting for database connection...'"
echo "  3. '✅ Database connection established'"
echo "  4. '🔄 Running database migrations...'"
echo "  5. '✅ Database migrations completed successfully'"
echo "  6. '🚀 Starting application server...'"
echo ""
echo "📋 Step 8: Test Backend Health"
echo "------------------------------"
echo "Once deployment completes, test the health endpoint:"
echo ""
echo "  curl https://backend-production-77f7.up.railway.app/api/v1/health"
echo ""
echo "Expected response:"
echo "  {\"status\":\"healthy\",\"timestamp\":\"...\",\"uptime\":...}"
echo ""

echo "🎉 Setup Complete!"
echo "=================="
echo ""
echo "Next Steps:"
echo "1. Monitor backend logs: railway logs --service backend"
echo "2. Verify health endpoint works"
echo "3. Run comprehensive service tests"
echo "4. Update frontend VITE_API_URL if needed"
echo ""
echo "Troubleshooting:"
echo "- If migrations fail, check DATABASE_URL connectivity"
echo "- If 'Cannot find module' error, check Dockerfile compilation"
echo "- If connection timeout, verify DB_SSL and network settings"
echo ""
echo "For more details, see:"
echo "  - KUBERNETES_DATABASE_SETUP.md (for local k8s database)"
echo "  - RAILWAY_ALL_SERVICES_DEPLOYED.md (for deployment status)"
echo "  - services/backend/MIGRATIONS.md (for database migrations)"
