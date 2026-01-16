#!/bin/bash
# Quick fix for Railway database connection failure
# Updates DB_HOST to point to existing Postgres service

set -e

echo "🔧 Railway Database Connection Fix"
echo "=================================="
echo ""
echo "Problem: DB_HOST points to 'timescaledb.railway.internal' but service doesn't exist"
echo "Solution: Point to existing 'postgres.railway.internal' service"
echo ""

# Check if railway CLI is available
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Please install it first:"
    echo "   npm install -g @railway/cli"
    exit 1
fi

echo "📋 Current backend environment variables:"
echo "---"
railway variables --service backend | grep -E "(DB_HOST|DB_SSL|DATABASE_URL)"
echo ""

echo "🤔 Choose a fix option:"
echo ""
echo "Option 1: Quick Fix - Use Existing PostgreSQL (⚠️ migrations may fail)"
echo "  - Updates DB_HOST to postgres.railway.internal"
echo "  - Backend will connect, but TimescaleDB migrations will fail"
echo "  - Good for testing basic connectivity"
echo ""
echo "Option 2: Proper Fix - Deploy TimescaleDB Service (recommended)"
echo "  - Requires manual Railway dashboard configuration"
echo "  - Follow RAILWAY_TIMESCALEDB_SETUP_GUIDE.md"
echo "  - Enables full hypertable functionality"
echo ""

read -p "Enter option (1 or 2): " OPTION

if [ "$OPTION" = "1" ]; then
    echo ""
    echo "🔄 Applying Quick Fix..."
    echo ""
    
    # Update DB_HOST
    echo "1️⃣ Setting DB_HOST=postgres.railway.internal..."
    railway variables --service backend --set DB_HOST=postgres.railway.internal
    
    echo ""
    echo "✅ Quick fix applied!"
    echo ""
    echo "📊 Updated environment variables:"
    railway variables --service backend | grep -E "(DB_HOST|DB_SSL|DATABASE_URL)"
    echo ""
    echo "📋 Next steps:"
    echo "  1. Wait 10-20 seconds for backend to redeploy"
    echo "  2. Check logs: railway logs --service backend --follow"
    echo "  3. Expected: Connection succeeds, migrations may fail (TimescaleDB missing)"
    echo ""
    echo "⚠️ Note: You'll need to deploy TimescaleDB service for full functionality"
    echo "   See: RAILWAY_TIMESCALEDB_SETUP_GUIDE.md"
    
elif [ "$OPTION" = "2" ]; then
    echo ""
    echo "📖 Opening proper fix guide..."
    echo ""
    echo "Follow these steps in Railway Dashboard:"
    echo ""
    echo "1. Create new Empty Service named 'timescaledb'"
    echo "2. Settings → Source → Docker Image"
    echo "3. Enter image: timescale/timescaledb:latest-pg16"
    echo "4. Add environment variables:"
    echo "   - POSTGRES_PASSWORD=cQGmOZHklTOlcLfSrhACSyaRECIjCOqb"
    echo "   - POSTGRES_DB=railway"
    echo "   - POSTGRES_USER=postgres"
    echo "5. Update backend service variables:"
    echo "   - DB_SSL=false (internal connections don't need SSL)"
    echo "   - DATABASE_URL=postgresql://postgres:cQGmOZHklTOlcLfSrhACSyaRECIjCOqb@timescaledb.railway.internal:5432/railway"
    echo ""
    echo "📄 Detailed guide: RAILWAY_TIMESCALEDB_SETUP_GUIDE.md"
    echo ""
    
    read -p "Would you like me to update DB_SSL to false now? (y/n): " UPDATE_SSL
    
    if [ "$UPDATE_SSL" = "y" ] || [ "$UPDATE_SSL" = "Y" ]; then
        echo ""
        echo "🔄 Setting DB_SSL=false..."
        railway variables --service backend --set DB_SSL=false
        echo "✅ DB_SSL updated to false"
        echo ""
        echo "⚠️ Remember to:"
        echo "  1. Create TimescaleDB service in Railway dashboard"
        echo "  2. Update DATABASE_URL to point to timescaledb.railway.internal"
    fi
    
else
    echo "❌ Invalid option. Please run again and choose 1 or 2."
    exit 1
fi

echo ""
echo "🎯 Monitor deployment:"
echo "   railway logs --service backend --follow"
echo ""
