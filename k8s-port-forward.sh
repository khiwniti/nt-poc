#!/bin/bash

# Port forward all services from Kubernetes to local machine
# This allows local testing while services run in K8s

echo "🔌 Setting up port forwards from Kubernetes..."
echo ""
echo "Services will be available at:"
echo "  Backend:   http://localhost:3000"
echo "  Frontend:  http://localhost:5173"
echo "  MLOps:     http://localhost:8000"
echo "  Simulator: http://localhost:8001"
echo ""
echo "Press Ctrl+C to stop all port forwards"
echo ""

# Kill any existing port-forwards
pkill -f "kubectl port-forward" 2>/dev/null || true

# Port forward backend (3001 -> 3000 locally)
kubectl port-forward -n facility-manager svc/backend 3000:3001 &
PID1=$!

# Port forward frontend (80 -> 5173 locally)
kubectl port-forward -n facility-manager svc/frontend 5173:80 &
PID2=$!

# Port forward mlops
kubectl port-forward -n facility-manager svc/mlops 8000:8000 &
PID3=$!

# Port forward simulator (8080 -> 8001 locally)
kubectl port-forward -n facility-manager svc/simulator 8001:8080 &
PID4=$!

# Wait a bit for port forwards to establish
sleep 3

echo "✅ Port forwards established!"
echo ""
echo "Testing endpoints..."
curl -s http://localhost:3000/api/health > /dev/null && echo "✅ Backend:   http://localhost:3000/api/health" || echo "❌ Backend not ready"
curl -s http://localhost:5173 > /dev/null && echo "✅ Frontend:  http://localhost:5173" || echo "❌ Frontend not ready"
curl -s http://localhost:8000/health > /dev/null && echo "✅ MLOps:     http://localhost:8000/health" || echo "❌ MLOps not ready"
curl -s http://localhost:8001/health > /dev/null && echo "✅ Simulator: http://localhost:8001/health" || echo "❌ Simulator not ready"

echo ""
echo "Port forwards running. Press Ctrl+C to stop..."

# Wait for Ctrl+C
trap "echo ''; echo '🛑 Stopping port forwards...'; kill $PID1 $PID2 $PID3 $PID4 2>/dev/null; exit 0" INT

wait
