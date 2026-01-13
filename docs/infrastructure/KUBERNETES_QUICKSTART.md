# Kubernetes Quick Start Guide

## Prerequisites

- Docker Desktop installed and running
- macOS, Linux, or Windows with WSL2
- 8GB RAM minimum (16GB recommended)
- 20GB free disk space

## Option 1: Local Development with KIND (Recommended for Testing)

### Step 1: Set up KIND cluster

```bash
# Run the setup script
./k8s/scripts/setup-kind.sh
```

This script will:
- ✅ Install KIND and kubectl (if not present)
- ✅ Create a 4-node cluster (1 control-plane + 3 workers)
- ✅ Install NGINX Ingress Controller
- ✅ Install Metrics Server (for auto-scaling)
- ✅ Build and load Docker images

**Time**: ~5-10 minutes

### Step 2: Deploy services

```bash
# Deploy all services to KIND
./k8s/scripts/deploy.sh development
```

This will deploy:
- Frontend (2 pods)
- Backend (3 pods)
- MLOps (2 pods)
- Simulator (1 pod)
- PostgreSQL + TimescaleDB (StatefulSet)
- Redis (StatefulSet)

**Time**: ~3-5 minutes

### Step 3: Access the application

```bash
# Frontend available at:
http://localhost

# Or port-forward specific services:
kubectl port-forward -n facility-manager svc/frontend 8080:80
kubectl port-forward -n facility-manager svc/backend 3001:3001

# Then access:
# Frontend: http://localhost:8080
# Backend API: http://localhost:3001/api
```

### Step 4: Monitor and scale

```bash
# View all pods
kubectl get pods -n facility-manager

# View auto-scaling status
kubectl get hpa -n facility-manager

# View logs
kubectl logs -f deployment/backend -n facility-manager

# Scale manually
kubectl scale deployment backend --replicas=10 -n facility-manager

# Get real-time resource usage
kubectl top pods -n facility-manager
kubectl top nodes
```

---

## Option 2: Cloud Kubernetes (GKE/EKS/AKS)

### Google Kubernetes Engine (GKE)

```bash
# Install gcloud CLI
# https://cloud.google.com/sdk/docs/install

# Create cluster
gcloud container clusters create facility-manager \
  --num-nodes=3 \
  --machine-type=n1-standard-4 \
  --region=us-central1 \
  --enable-autoscaling \
  --min-nodes=3 \
  --max-nodes=20

# Get credentials
gcloud container clusters get-credentials facility-manager --region=us-central1

# Deploy
./k8s/scripts/deploy.sh production
```

### Amazon EKS

```bash
# Install eksctl
# https://eksctl.io/installation/

# Create cluster
eksctl create cluster \
  --name facility-manager \
  --region us-east-1 \
  --nodes 3 \
  --nodes-min 3 \
  --nodes-max 20 \
  --node-type t3.large \
  --managed

# Deploy
./k8s/scripts/deploy.sh production
```

### Azure AKS

```bash
# Install Azure CLI
# https://learn.microsoft.com/en-us/cli/azure/install-azure-cli

# Create resource group
az group create --name facility-manager-rg --location eastus

# Create cluster
az aks create \
  --resource-group facility-manager-rg \
  --name facility-manager \
  --node-count 3 \
  --node-vm-size Standard_D4s_v3 \
  --enable-cluster-autoscaler \
  --min-count 3 \
  --max-count 20 \
  --generate-ssh-keys

# Get credentials
az aks get-credentials --resource-group facility-manager-rg --name facility-manager

# Deploy
./k8s/scripts/deploy.sh production
```

---

## Common Commands

### Deployment

```bash
# Deploy to environment
./k8s/scripts/deploy.sh [development|staging|production]

# Update specific service
kubectl set image deployment/backend backend=facility-manager/backend:v2.0 -n facility-manager

# Rollback deployment
kubectl rollout undo deployment/backend -n facility-manager

# Check rollout status
kubectl rollout status deployment/backend -n facility-manager
```

### Monitoring

```bash
# Get all resources
kubectl get all -n facility-manager

# Describe pod (for troubleshooting)
kubectl describe pod <pod-name> -n facility-manager

# View logs
kubectl logs <pod-name> -n facility-manager
kubectl logs -f deployment/backend -n facility-manager --all-containers

# Execute into pod
kubectl exec -it <pod-name> -n facility-manager -- /bin/bash

# View events
kubectl get events -n facility-manager --sort-by='.lastTimestamp'
```

### Scaling

```bash
# Manual scaling
kubectl scale deployment backend --replicas=10 -n facility-manager

# View HPA status
kubectl get hpa -n facility-manager
kubectl describe hpa backend-hpa -n facility-manager

# Edit HPA
kubectl edit hpa backend-hpa -n facility-manager
```

### Resource Management

```bash
# View resource usage
kubectl top pods -n facility-manager
kubectl top nodes

# View resource quotas
kubectl describe resourcequota -n facility-manager

# View persistent volumes
kubectl get pv
kubectl get pvc -n facility-manager
```

### Debugging

```bash
# Port forward to local machine
kubectl port-forward svc/backend 3001:3001 -n facility-manager
kubectl port-forward svc/postgres 5432:5432 -n facility-manager

# Copy files from pod
kubectl cp <pod-name>:/path/to/file ./local-file -n facility-manager

# Run temporary pod for debugging
kubectl run debug --rm -it --image=busybox -n facility-manager -- /bin/sh
```

---

## Testing Auto-Scaling

### Load Test with Apache Bench

```bash
# Install Apache Bench
# macOS: brew install apache-bench
# Ubuntu: sudo apt-get install apache2-utils

# Generate load (1000 requests, 100 concurrent)
ab -n 1000 -c 100 http://localhost/

# Watch auto-scaling in action
watch kubectl get hpa -n facility-manager
watch kubectl get pods -n facility-manager
```

### Load Test with k6

```bash
# Install k6
# https://k6.io/docs/getting-started/installation/

# Create load test script (load-test.js):
cat <<EOF > load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 100 }, // ramp up
    { duration: '5m', target: 100 }, // stay at 100 users
    { duration: '2m', target: 200 }, // ramp up to 200
    { duration: '5m', target: 200 }, // stay at 200
    { duration: '2m', target: 0 },   // ramp down
  ],
};

export default function () {
  let res = http.get('http://localhost/api/facilities');
  check(res, { 'status is 200': (r) => r.status === 200 });
  sleep(1);
}
EOF

# Run load test
k6 run load-test.js

# Watch scaling
kubectl get hpa -n facility-manager -w
```

---

## Monitoring Dashboard

### Install Prometheus + Grafana

```bash
# Add Prometheus Helm repo
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# Install Prometheus
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace

# Port forward Grafana
kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80

# Access Grafana: http://localhost:3000
# Default credentials: admin/prom-operator
```

### View Metrics

1. **Pods Dashboard**: CPU, Memory, Network per pod
2. **Cluster Dashboard**: Overall cluster health
3. **HPA Dashboard**: Auto-scaling metrics and events
4. **Custom Dashboard**: Business metrics (facilities, alerts, predictions)

---

## Cleanup

### Delete KIND cluster

```bash
kind delete cluster --name facility-manager
```

### Delete cloud cluster

```bash
# GKE
gcloud container clusters delete facility-manager --region=us-central1

# EKS
eksctl delete cluster --name facility-manager --region=us-east-1

# AKS
az aks delete --resource-group facility-manager-rg --name facility-manager
az group delete --name facility-manager-rg
```

---

## Troubleshooting

### Pods not starting

```bash
# Check pod status
kubectl describe pod <pod-name> -n facility-manager

# Common issues:
# 1. Image pull errors: Check image name and registry access
# 2. Resource limits: Increase limits or free up resources
# 3. Config/Secret missing: Apply configmaps and secrets first
```

### Database connection issues

```bash
# Check if postgres pod is running
kubectl get pods -n facility-manager -l app=postgres

# Check logs
kubectl logs -f statefulset/postgres -n facility-manager

# Test connection from another pod
kubectl run -it --rm debug --image=postgres:15 --restart=Never -n facility-manager -- \
  psql -h postgres -U postgres -d battery_db
```

### HPA not scaling

```bash
# Check metrics server
kubectl get deployment metrics-server -n kube-system

# Check HPA events
kubectl describe hpa backend-hpa -n facility-manager

# Check pod metrics
kubectl top pods -n facility-manager

# If metrics-server not working, restart it:
kubectl rollout restart deployment metrics-server -n kube-system
```

### Ingress not working

```bash
# Check ingress controller
kubectl get pods -n ingress-nginx

# Check ingress resource
kubectl describe ingress -n facility-manager

# Check ingress logs
kubectl logs -n ingress-nginx deployment/ingress-nginx-controller
```

---

## Production Checklist

Before going to production:

- [ ] All secrets are encrypted (use sealed-secrets or external secrets operator)
- [ ] Resource requests/limits tuned based on load testing
- [ ] HPA configured and tested
- [ ] Database has persistent storage with backups
- [ ] Monitoring and alerting configured
- [ ] Logging centralized (ELK/Loki)
- [ ] SSL certificates configured on ingress
- [ ] Network policies applied
- [ ] Security scanning done (trivy/snyk)
- [ ] Disaster recovery plan tested
- [ ] Runbook created
- [ ] On-call rotation set up

---

## Next Steps

1. **Week 1**: Set up KIND and deploy locally
2. **Week 2**: Add remaining Kubernetes manifests (MLOps, Simulator StatefulSets)
3. **Week 3**: Deploy to staging cluster and run load tests
4. **Week 4**: Deploy to production with monitoring

## Resources

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [KIND Documentation](https://kind.sigs.k8s.io/)
- [kubectl Cheat Sheet](https://kubernetes.io/docs/reference/kubectl/cheatsheet/)
- [Horizontal Pod Autoscaler](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/)
- [NGINX Ingress Controller](https://kubernetes.github.io/ingress-nginx/)

---

**Questions?** Check `KUBERNETES_DEPLOYMENT.md` for detailed architecture and configuration.
