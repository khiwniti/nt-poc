#!/bin/bash
# complete-health-check.sh

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║        NT-POC Battery Management System Health Check          ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

echo "1. Service Health Checks"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Backend
http_code=$(curl -s -o /dev/null -w "%{http_code}" "https://backend-production-77f7.up.railway.app/health")
if [ "$http_code" -eq 200 ]; then
  echo "✅ backend: Healthy (HTTP $http_code)"
else
  echo "❌ backend: Unhealthy (HTTP $http_code)"
fi

# Frontend
http_code=$(curl -s -o /dev/null -w "%{http_code}" "https://frontend-production-ed3d.up.railway.app/")
if [ "$http_code" -eq 200 ]; then
  echo "✅ frontend: Healthy (HTTP $http_code)"
else
  echo "❌ frontend: Unhealthy (HTTP $http_code)"
fi

# Simulator
http_code=$(curl -s -o /dev/null -w "%{http_code}" "https://simulator-production-a018.up.railway.app/api/health")
if [ "$http_code" -eq 200 ]; then
  echo "✅ simulator: Healthy (HTTP $http_code)"
else
  echo "❌ simulator: Unhealthy (HTTP $http_code)"
fi

# MLOps
http_code=$(curl -s -o /dev/null -w "%{http_code}" "https://mlops-production-3b39.up.railway.app/health")
if [ "$http_code" -eq 200 ]; then
  echo "✅ mlops: Healthy (HTTP $http_code)"
else
  echo "❌ mlops: Unhealthy (HTTP $http_code)"
fi

# LINE Bot
http_code=$(curl -s -o /dev/null -w "%{http_code}" "https://line-bot-production-8114.up.railway.app/health")
if [ "$http_code" -eq 200 ]; then
  echo "✅ line-bot: Healthy (HTTP $http_code)"
else
  echo "❌ line-bot: Unhealthy (HTTP $http_code)"
fi

echo ""
echo "2. Database Connectivity"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check database via backend
DB_CHECK=$(curl -s https://backend-production-77f7.up.railway.app/health | jq -r '.services.database.status' 2>/dev/null || echo "unknown")
if [ "$DB_CHECK" = "connected" ] || [ "$DB_CHECK" = "healthy" ]; then
  echo "✅ TimescaleDB: Connected"
else
  echo "❌ TimescaleDB: $DB_CHECK"
fi

# Check Redis via backend
REDIS_CHECK=$(curl -s https://backend-production-77f7.up.railway.app/health | jq -r '.services.redis.status' 2>/dev/null || echo "unknown")
if [ "$REDIS_CHECK" = "connected" ] || [ "$REDIS_CHECK" = "healthy" ]; then
  echo "✅ Redis: Connected"
else
  echo "❌ Redis: $REDIS_CHECK"
fi

echo ""
echo "3. API Endpoint Tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Test simulator reading
SIM_READING=$(curl -s https://simulator-production-a018.up.railway.app/api/sensors/reading/BAT-001 | jq -r '.success' 2>/dev/null)
if [ "$SIM_READING" = "true" ]; then
  echo "✅ Simulator: Data generation working"
else
  echo "❌ Simulator: Data generation failed"
fi

# Test backend API
BACKEND_API=$(curl -s -o /dev/null -w "%{http_code}" https://backend-production-77f7.up.railway.app/api/facilities)
if [ "$BACKEND_API" -eq 401 ]; then
  echo "✅ Backend API: Protected endpoints working (401 expected)"
else
  echo "⚠️  Backend API: Unexpected response ($BACKEND_API)"
fi

echo ""
echo "4. Inter-Service Communication"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if backend can reach simulator
BACKEND_VARS=$(railway variables --service backend 2>/dev/null | grep SIMULATOR_URL || echo "not set")
if [ "$BACKEND_VARS" != "not set" ]; then
  echo "✅ Backend->Simulator: URL configured"
else
  echo "❌ Backend->Simulator: URL not configured"
fi

# Check if backend can reach MLOps
MLOPS_VARS=$(railway variables --service backend 2>/dev/null | grep MLOPS_SERVICE_URL || echo "not set")
if [ "$MLOPS_VARS" != "not set" ]; then
  echo "✅ Backend->MLOps: URL configured"
else
  echo "❌ Backend->MLOps: URL not configured"
fi

echo ""
echo "5. Security Checks"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check HTTPS
if curl -s -I https://backend-production-77f7.up.railway.app | grep -q "HTTP/2 200"; then
  echo "✅ HTTPS: Enabled (HTTP/2)"
else
  echo "⚠️  HTTPS: Check required"
fi

# Check for security headers
SECURITY_HEADERS=$(curl -s -I https://backend-production-77f7.up.railway.app | grep -c -E "(X-Frame-Options|X-Content-Type-Options)" || echo "0")
if [ "$SECURITY_HEADERS" -gt 0 ]; then
  echo "✅ Security Headers: Present"
else
  echo "⚠️  Security Headers: Missing"
fi

echo ""
echo "6. Performance Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Measure response times
BACKEND_TIME=$(curl -o /dev/null -s -w '%{time_total}\n' https://backend-production-77f7.up.railway.app/health)
echo "Backend response time: ${BACKEND_TIME}s"

SIM_TIME=$(curl -o /dev/null -s -w '%{time_total}\n' https://simulator-production-a018.up.railway.app/api/health)
echo "Simulator response time: ${SIM_TIME}s"

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "                    Health Check Complete                          "
echo "═══════════════════════════════════════════════════════════════════"