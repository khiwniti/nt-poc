#!/bin/bash
# Production startup script for Railway deployment
# Runs database migrations before starting the server

set -e  # Exit on any error

echo "🚀 Starting NT-POC Backend Service..."
echo "📦 Environment: ${NODE_ENV:-production}"

# Wait for database to be ready
echo "⏳ Waiting for database connection..."
echo "🔍 DB_HOST: ${DB_HOST}"
echo "🔍 DB_PORT: ${DB_PORT}"
echo "🔍 DB_NAME: ${DB_NAME}"
echo "🔍 DB_SSL: ${DB_SSL}"

MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  if node -e "
    const { Pool } = require('pg');
    const pool = new Pool({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 5000
    });
    pool.query('SELECT 1')
      .then(() => {
        console.log('✅ Connection test successful');
        pool.end();
        process.exit(0);
      })
      .catch((err) => {
        console.error('❌ Connection error:', err.code, err.message);
        pool.end();
        process.exit(1);
      });
  " 2>&1; then
    echo "✅ Database connection established"
    break
  fi

  RETRY_COUNT=$((RETRY_COUNT + 1))
  echo "⏳ Database not ready yet (attempt $RETRY_COUNT/$MAX_RETRIES)..."
  sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
  echo "❌ Failed to connect to database after $MAX_RETRIES attempts"
  echo "📋 Final connection details:"
  echo "   Host: ${DB_HOST}"
  echo "   Port: ${DB_PORT}"
  echo "   Database: ${DB_NAME}"
  echo "   SSL: ${DB_SSL}"
  exit 1
fi

# Run database migrations using knex directly (no need for compiled scripts)
echo "🔄 Running database migrations..."
if npx knex migrate:latest --knexfile ./knexfile.js; then
  echo "✅ Database migrations completed successfully"
else
  echo "❌ Database migrations failed"
  echo "⚠️  Attempting to continue without migrations..."
  # Don't exit - allow app to start even if migrations fail
fi

# Check migration status
echo "📊 Checking migration status..."
npx knex migrate:status --knexfile ./knexfile.js || true

# Start the application
echo "🚀 Starting application server..."
exec node dist/src/index.js