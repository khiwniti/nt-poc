#!/bin/bash
# Production startup script for Railway deployment
# Runs database migrations before starting the server

set -e  # Exit on any error

echo "🚀 Starting NT-POC Backend Service..."
echo "📦 Environment: ${NODE_ENV:-production}"

# Wait for database to be ready
echo "⏳ Waiting for database connection..."
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  if node -e "
    const { Pool } = require('pg');
    const pool = new Pool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
    });
    pool.query('SELECT 1')
      .then(() => { pool.end(); process.exit(0); })
      .catch(() => { pool.end(); process.exit(1); });
  " 2>/dev/null; then
    echo "✅ Database connection established"
    break
  fi

  RETRY_COUNT=$((RETRY_COUNT + 1))
  echo "⏳ Database not ready yet (attempt $RETRY_COUNT/$MAX_RETRIES)..."
  sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
  echo "❌ Failed to connect to database after $MAX_RETRIES attempts"
  exit 1
fi

# Run database migrations
echo "🔄 Running database migrations..."
if npm run migrate; then
  echo "✅ Database migrations completed successfully"
else
  echo "❌ Database migrations failed"
  exit 1
fi

# Check migration status
echo "📊 Checking migration status..."
npm run migrate:status || true

# Start the application
echo "🚀 Starting application server..."
exec node dist/index.js
