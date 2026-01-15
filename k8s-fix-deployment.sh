#!/bin/bash

# Quick fix for K8s deployment issues
# This script will restart the services with updated images

set -e

NAMESPACE="facility-manager"

echo "🔧 Fixing Kubernetes deployment..."
echo ""

# Option 1: Rebuild and reload images into KIND
echo "1️⃣  Rebuilding Docker images..."

# Build backend
echo "  📦 Building backend..."
cd /Users/khiwn/nt-poc/nt-poc/services/backend
docker build -t facility-manager/backend:dev . 2>&1 | tail -3

# Build frontend  
echo "  📦 Building frontend..."
cd /Users/khiwn/nt-poc/nt-poc/services/frontend
docker build -t facility-manager/frontend:dev . 2>&1 | tail -3

# Build mlops
echo "  📦 Building mlops..."
cd /Users/khiwn/nt-poc/nt-poc/services/mlops
docker build -t facility-manager/mlops:dev . 2>&1 | tail -3

# Build simulator
echo "  📦 Building simulator..."
cd /Users/khiwn/nt-poc/nt-poc/services/simulator
docker build -t facility-manager/simulator:dev . 2>&1 | tail -3

echo ""
echo "2️⃣  Loading images into KIND cluster..."

# Load images into KIND
kind load docker-image facility-manager/backend:dev --name facility-manager
kind load docker-image facility-manager/frontend:dev --name facility-manager
kind load docker-image facility-manager/mlops:dev --name facility-manager
kind load docker-image facility-manager/simulator:dev --name facility-manager

echo ""
echo "3️⃣  Restarting deployments..."

# Restart deployments to use new images
kubectl rollout restart deployment/backend -n $NAMESPACE
kubectl rollout restart deployment/frontend -n $NAMESPACE
kubectl rollout restart deployment/mlops -n $NAMESPACE
kubectl rollout restart deployment/simulator -n $NAMESPACE

echo ""
echo "4️⃣  Waiting for rollout to complete..."

kubectl rollout status deployment/backend -n $NAMESPACE --timeout=120s
kubectl rollout status deployment/frontend -n $NAMESPACE --timeout=120s
kubectl rollout status deployment/mlops -n $NAMESPACE --timeout=120s
kubectl rollout status deployment/simulator -n $NAMESPACE --timeout=120s

echo ""
echo "✅ Deployment fixed!"
echo ""
echo "Check status with:"
echo "  kubectl get pods -n $NAMESPACE"
echo ""
echo "View logs with:"
echo "  kubectl logs -n $NAMESPACE -l app=backend --tail=50"
echo ""
echo "Port forward services with:"
echo "  ./k8s-port-forward.sh"
