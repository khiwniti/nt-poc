#!/usr/bin/env bash

# OWASP ZAP Docker Start Script
# Starts OWASP ZAP in daemon mode for security testing

set -e

ZAP_PORT="${ZAP_PORT:-8080}"
ZAP_API_KEY="${ZAP_API_KEY:-changeme}"
CONTAINER_NAME="owasp-zap-scanner"

echo "🔒 Starting OWASP ZAP Scanner..."

# Check if ZAP is already running
if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo "✓ ZAP is already running"
  exit 0
fi

# Remove old container if it exists
if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo "Removing old ZAP container..."
  docker rm -f "${CONTAINER_NAME}" || true
fi

# Start ZAP container
echo "Starting ZAP container on port ${ZAP_PORT}..."
docker run -d \
  --name "${CONTAINER_NAME}" \
  -p "${ZAP_PORT}:8080" \
  -e "ZAP_PORT=8080" \
  zaproxy/zap-stable zap.sh \
  -daemon \
  -host 0.0.0.0 \
  -port 8080 \
  -config api.key="${ZAP_API_KEY}" \
  -config api.addrs.addr.name=.* \
  -config api.addrs.addr.regex=true

echo "Waiting for ZAP to start..."
sleep 10

# Check if ZAP is responsive
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  if curl -s "http://localhost:${ZAP_PORT}/JSON/core/view/version/?apikey=${ZAP_API_KEY}" > /dev/null 2>&1; then
    echo "✓ ZAP is ready!"
    echo "  - API: http://localhost:${ZAP_PORT}"
    echo "  - API Key: ${ZAP_API_KEY}"
    echo ""
    echo "Run security tests with: npm run test:security:zap"
    exit 0
  fi
  
  RETRY_COUNT=$((RETRY_COUNT + 1))
  echo "  Waiting for ZAP to be ready... ($RETRY_COUNT/$MAX_RETRIES)"
  sleep 2
done

echo "❌ Failed to start ZAP"
docker logs "${CONTAINER_NAME}"
exit 1
