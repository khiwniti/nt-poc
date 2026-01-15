#!/bin/bash

# Test Kubernetes services health
# This tests services running in the K8s cluster

NAMESPACE="facility-manager"

echo "🧪 NT-POC Kubernetes Service Health Check"
echo "=========================================="
echo ""

# Check if cluster is accessible
if ! kubectl cluster-info &> /dev/null; then
    echo "❌ Cannot connect to Kubernetes cluster"
    exit 1
fi

echo "✅ Kubernetes cluster is accessible"
echo ""

# Check namespace
echo "📦 Checking namespace..."
if kubectl get namespace $NAMESPACE &> /dev/null; then
    echo "  ✅ Namespace: $NAMESPACE"
else
    echo "  ❌ Namespace $NAMESPACE not found"
    exit 1
fi

echo ""
echo "🔍 Pod Status:"
echo "─────────────"
kubectl get pods -n $NAMESPACE -o custom-columns=NAME:.metadata.name,STATUS:.status.phase,READY:.status.containerStatuses[0].ready,RESTARTS:.status.containerStatuses[0].restartCount

echo ""
echo "🌐 Service Status:"
echo "─────────────────"
kubectl get svc -n $NAMESPACE

echo ""
echo "📊 Deployment Status:"
echo "────────────────────"
kubectl get deployments -n $NAMESPACE

echo ""
echo "🏥 Health Check (requires port-forward):"
echo "────────────────────────────────────────"

# Try to check health via port-forward (quick test)
timeout 2 kubectl port-forward -n $NAMESPACE svc/backend 13000:3001 > /dev/null 2>&1 &
PF_PID=$!
sleep 1

if curl -s -f http://localhost:13000/api/health > /dev/null 2>&1; then
    echo "  ✅ Backend health check passed"
else
    echo "  ⚠️  Backend health check failed (pod may not be ready)"
fi

kill $PF_PID 2>/dev/null || true

echo ""
echo "💡 Next Steps:"
echo ""
if kubectl get pods -n $NAMESPACE | grep -q "CrashLoopBackOff\|Error\|0/1.*Running"; then
    echo "  ⚠️  Some pods are not healthy. To fix:"
    echo "     ./k8s-fix-deployment.sh"
    echo ""
fi

echo "  To access services locally:"
echo "     ./k8s-port-forward.sh"
echo ""
echo "  To view logs:"
echo "     kubectl logs -n $NAMESPACE -l app=backend --tail=50"
echo "     kubectl logs -n $NAMESPACE -l app=frontend --tail=50"
echo ""
echo "  To run integration tests (after port-forward):"
echo "     ./test-services.sh"
