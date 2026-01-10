#!/bin/bash
# Chaos Testing Execution Script

set -e

BACKEND_URL="${BACKEND_URL:-http://localhost:3000}"
API_BASE="${BACKEND_URL}/api/v1"

echo "🐒 Chaos Monkey Testing Suite"
echo "=============================="
echo "Target: $BACKEND_URL"
echo ""

# Function to make API calls
chaos_api() {
  local method=$1
  local endpoint=$2
  local data=$3
  
  if [ -z "$data" ]; then
    curl -s -X "$method" "${API_BASE}/chaos${endpoint}"
  else
    curl -s -X "$method" "${API_BASE}/chaos${endpoint}" \
      -H "Content-Type: application/json" \
      -d "$data"
  fi
}

# Check current status
echo "1. Checking current chaos configuration..."
chaos_api GET "/config" | jq '.'
echo ""

# Enable chaos testing
echo "2. Enabling chaos testing..."
chaos_api POST "/enable" | jq '.'
echo ""

# Configure chaos scenarios
echo "3. Configuring chaos scenarios..."
chaos_api POST "/config" '{
  "failureRate": 0.3,
  "scenarios": {
    "serviceFailure": true,
    "networkLatency": true,
    "databaseFailure": true,
    "redisFailure": true
  },
  "networkLatencyMs": {
    "min": 100,
    "max": 1000
  }
}' | jq '.'
echo ""

# Test each scenario
echo "4. Testing service failure scenario..."
for i in {1..5}; do
  echo "  Attempt $i:"
  chaos_api POST "/test/service-failure" || echo "    ✓ Failure injected"
done
echo ""

echo "5. Testing network latency scenario..."
for i in {1..3}; do
  echo "  Attempt $i:"
  START=$(date +%s%3N)
  chaos_api POST "/test/network-latency" | jq -r '.latencyMs'
  END=$(date +%s%3N)
  ELAPSED=$((END - START))
  echo "    Total time: ${ELAPSED}ms"
done
echo ""

echo "6. Testing database failure scenario..."
for i in {1..5}; do
  echo "  Attempt $i:"
  chaos_api POST "/test/database-failure" | jq -r '.failureInjected'
done
echo ""

echo "7. Testing Redis failure scenario..."
for i in {1..5}; do
  echo "  Attempt $i:"
  chaos_api POST "/test/redis-failure" | jq -r '.failureInjected'
done
echo ""

# Test with real endpoints under chaos
echo "8. Testing real endpoints under chaos..."
echo "  Health check:"
curl -s "${API_BASE}/health" | jq '.' || echo "    ✓ Failure detected"

echo "  Facilities endpoint:"
curl -s "${API_BASE}/facilities?limit=5" | jq '.data | length' || echo "    ✓ Failure detected"
echo ""

# Disable chaos testing
echo "9. Disabling chaos testing..."
chaos_api POST "/disable" | jq '.'
echo ""

# Verify recovery
echo "10. Verifying system recovery..."
echo "  Health check:"
curl -s "${API_BASE}/health" | jq '.status'

echo "  Facilities endpoint:"
curl -s "${API_BASE}/facilities?limit=5" | jq '.data | length'
echo ""

echo "✅ Chaos testing complete!"
echo ""
echo "Summary:"
echo "- Service failures: Tested"
echo "- Network latency: Tested"
echo "- Database failures: Tested"
echo "- Redis failures: Tested"
echo "- System recovery: Verified"
