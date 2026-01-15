#!/bin/bash
set -e

export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"

echo "🔌 Connecting to Railway PostgreSQL..."
echo "📝 Running: CREATE EXTENSION IF NOT EXISTS timescaledb;"

# Get database URL from Railway
DB_URL=$(railway variables --service backend | grep DATABASE_URL | cut -d'=' -f2-)

if [ -z "$DB_URL" ]; then
    echo "❌ DATABASE_URL not found. Backend may not be deployed yet."
    echo "ℹ️  Trying to connect via Railway connect command..."
    railway connect Postgres << 'EOF'
CREATE EXTENSION IF NOT EXISTS timescaledb;
\dx
\q
EOF
else
    echo "✅ Found DATABASE_URL, connecting directly..."
    psql "$DB_URL" << 'EOF'
CREATE EXTENSION IF NOT EXISTS timescaledb;
\dx
\q
EOF
fi

echo "✅ TimescaleDB extension enabled!"
