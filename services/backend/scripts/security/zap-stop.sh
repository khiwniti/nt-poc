#!/usr/bin/env bash

# OWASP ZAP Docker Stop Script
# Stops and removes the OWASP ZAP container

set -e

CONTAINER_NAME="owasp-zap-scanner"

echo "🛑 Stopping OWASP ZAP Scanner..."

if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  docker stop "${CONTAINER_NAME}"
  docker rm "${CONTAINER_NAME}"
  echo "✓ ZAP stopped and removed"
else
  echo "⚠️  ZAP container not running"
fi
