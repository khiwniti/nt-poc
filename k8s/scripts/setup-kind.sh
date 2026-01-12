#!/bin/bash
set -e

# KIND Local Kubernetes Setup for Enterprise Facility Manager
# This script sets up a local Kubernetes cluster using KIND

echo "🎯 Setting up KIND local Kubernetes cluster..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if KIND is installed
if ! command -v kind &> /dev/null; then
    echo "📥 Installing KIND..."
    # Detect OS
    OS=$(uname -s | tr '[:upper:]' '[:lower:]')
    curl -Lo ./kind https://kind.sigs.k8s.io/dl/v0.22.0/kind-${OS}-amd64
    chmod +x ./kind
    sudo mv ./kind /usr/local/bin/
    echo "✅ KIND installed"
fi

# Check if kubectl is installed
if ! command -v kubectl &> /dev/null; then
    echo "📥 Installing kubectl..."
    OS=$(uname -s | tr '[:upper:]' '[:lower:]')
    curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/${OS}/amd64/kubectl"
    chmod +x kubectl
    sudo mv ./kubectl /usr/local/bin/
    echo "✅ kubectl installed"
fi

# Create KIND cluster configuration
cat <<EOF > /tmp/kind-config.yaml
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
name: facility-manager
nodes:
- role: control-plane
  kubeadmConfigPatches:
  - |
    kind: InitConfiguration
    nodeRegistration:
      kubeletExtraArgs:
        node-labels: "ingress-ready=true"
  extraPortMappings:
  - containerPort: 80
    hostPort: 80
    protocol: TCP
  - containerPort: 443
    hostPort: 443
    protocol: TCP
- role: worker
  extraMounts:
  - hostPath: /tmp/kind-data
    containerPath: /data
- role: worker
  extraMounts:
  - hostPath: /tmp/kind-data
    containerPath: /data
- role: worker
  extraMounts:
  - hostPath: /tmp/kind-data
    containerPath: /data
EOF

# Create data directory
mkdir -p /tmp/kind-data

# Delete existing cluster if it exists
if kind get clusters | grep -q "facility-manager"; then
    echo "🗑️  Deleting existing cluster..."
    kind delete cluster --name facility-manager
fi

# Create new cluster
echo "🏗️  Creating KIND cluster with 3 worker nodes..."
kind create cluster --config /tmp/kind-config.yaml

# Wait for cluster to be ready
echo "⏳ Waiting for cluster to be ready..."
kubectl wait --for=condition=Ready nodes --all --timeout=300s

# Install NGINX Ingress Controller
echo "🌐 Installing NGINX Ingress Controller..."
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml

# Wait for ingress controller to be ready
echo "⏳ Waiting for ingress controller..."
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=300s

# Install Metrics Server (for HPA)
echo "📊 Installing Metrics Server..."
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# Patch metrics server for local development
kubectl patch deployment metrics-server -n kube-system --type='json' \
  -p='[{"op": "add", "path": "/spec/template/spec/containers/0/args/-", "value": "--kubelet-insecure-tls"}]'

# Build Docker images
echo "🐳 Building Docker images..."
cd $(dirname $0)/../..

if [ -f "services/frontend/Dockerfile" ]; then
    echo "  Building frontend..."
    docker build -t facility-manager/frontend:dev services/frontend
    kind load docker-image facility-manager/frontend:dev --name facility-manager
fi

if [ -f "services/backend/Dockerfile" ]; then
    echo "  Building backend..."
    docker build -t facility-manager/backend:dev services/backend
    kind load docker-image facility-manager/backend:dev --name facility-manager
fi

if [ -f "services/mlops/Dockerfile" ]; then
    echo "  Building mlops..."
    docker build -t facility-manager/mlops:dev services/mlops
    kind load docker-image facility-manager/mlops:dev --name facility-manager
fi

if [ -f "services/simulator/Dockerfile" ]; then
    echo "  Building simulator..."
    docker build -t facility-manager/simulator:dev services/simulator
    kind load docker-image facility-manager/simulator:dev --name facility-manager
fi

echo ""
echo "✅ KIND cluster ready!"
echo ""
echo "📋 Cluster info:"
kubectl cluster-info
echo ""
echo "🔍 Nodes:"
kubectl get nodes
echo ""
echo "📦 Namespaces:"
kubectl get namespaces
echo ""
echo "📝 Next steps:"
echo "  1. Deploy services: ./k8s/scripts/deploy.sh development"
echo "  2. Access frontend: http://localhost"
echo "  3. Port forward backend: kubectl port-forward -n facility-manager svc/backend 3001:3001"
echo "  4. View logs: kubectl logs -f deployment/backend -n facility-manager"
echo "  5. Delete cluster: kind delete cluster --name facility-manager"
echo ""
echo "🎉 Happy coding!"
