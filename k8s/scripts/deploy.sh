#!/bin/bash
set -e

# Kubernetes Deployment Script for Enterprise Facility Manager
# Usage: ./deploy.sh [development|staging|production]

ENVIRONMENT=${1:-development}
NAMESPACE="facility-manager"

echo "🚀 Deploying to $ENVIRONMENT environment..."

# Check if kubectl is installed
if ! command -v kubectl &> /dev/null; then
    echo "❌ kubectl not found. Please install kubectl first."
    exit 1
fi

# Check if cluster is accessible
if ! kubectl cluster-info &> /dev/null; then
    echo "❌ Cannot connect to Kubernetes cluster. Please check your kubeconfig."
    exit 1
fi

# Create namespace if it doesn't exist
echo "📦 Creating namespace..."
kubectl apply -f k8s/base/namespace.yaml

# Apply ConfigMaps
echo "⚙️  Applying ConfigMaps..."
kubectl apply -f k8s/base/configmaps/

# Apply Secrets (ensure these are encrypted in production!)
echo "🔐 Applying Secrets..."
kubectl apply -f k8s/base/secrets/

# Apply PersistentVolumes
echo "💾 Applying PersistentVolumes..."
kubectl apply -f k8s/base/persistentvolumes/

# Apply StatefulSets (Database, Redis)
echo "🗄️  Deploying StatefulSets..."
kubectl apply -f k8s/base/statefulsets/

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
kubectl wait --for=condition=ready pod -l app=postgres -n $NAMESPACE --timeout=300s

# Apply Deployments
echo "🚢 Deploying services..."
kubectl apply -f k8s/base/deployments/

# Apply Services
echo "🌐 Creating services..."
kubectl apply -f k8s/base/services/

# Apply HPA (Horizontal Pod Autoscaler)
echo "📊 Configuring auto-scaling..."
kubectl apply -f k8s/base/hpa/

# Apply Ingress
echo "🌍 Configuring ingress..."
kubectl apply -f k8s/base/ingress/

# Wait for deployments to be ready
echo "⏳ Waiting for deployments to be ready..."
kubectl wait --for=condition=available deployment --all -n $NAMESPACE --timeout=600s

# Show deployment status
echo ""
echo "✅ Deployment complete!"
echo ""
echo "📊 Current status:"
kubectl get pods -n $NAMESPACE
echo ""
kubectl get svc -n $NAMESPACE
echo ""
kubectl get hpa -n $NAMESPACE
echo ""

# Get ingress URL
INGRESS_IP=$(kubectl get ingress -n $NAMESPACE -o jsonpath='{.items[0].status.loadBalancer.ingress[0].ip}')
if [ -n "$INGRESS_IP" ]; then
    echo "🌐 Application URL: http://$INGRESS_IP"
else
    echo "⚠️  Ingress IP not yet assigned. Check with: kubectl get ingress -n $NAMESPACE"
fi

echo ""
echo "📝 Useful commands:"
echo "  View logs: kubectl logs -f deployment/backend -n $NAMESPACE"
echo "  Scale: kubectl scale deployment backend --replicas=10 -n $NAMESPACE"
echo "  Rollback: kubectl rollout undo deployment/backend -n $NAMESPACE"
echo "  Port forward: kubectl port-forward svc/frontend 8080:80 -n $NAMESPACE"
