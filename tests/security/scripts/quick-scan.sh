#!/bin/bash
# Quick security scan for CI/CD pipeline

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Run lightweight security checks only
export ZAP_QUICK_SCAN=true

# Start services
cd "$(dirname "$SCRIPT_DIR")"
docker-compose -f docker-compose.zap.yml up -d backend db

# Wait for backend
echo "Waiting for backend..."
for i in {1..30}; do
    if curl -s http://localhost:3000/api/v1/health > /dev/null 2>&1; then
        echo "Backend ready"
        break
    fi
    sleep 2
done

# Run quick ZAP scan
docker run --rm --network=host \
    -v "$(pwd)/reports:/zap/wrk:rw" \
    zaproxy/zap-stable:2.14.0 \
    zap-baseline.py \
    -t http://localhost:3000/api/v1 \
    -r quick-scan-report.html \
    -J quick-scan-report.json \
    -I \
    -m 3 \
    || true

# Cleanup
docker-compose -f docker-compose.zap.yml down -v

echo "Quick security scan completed"
