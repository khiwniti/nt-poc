# Kubernetes Deployment Guide - Enterprise Facility Manager

**Date**: 2026-01-12  
**Status**: Planning  
**Target**: Production-ready K8s deployment with auto-scaling

## Overview

Deploy the 5-microservice architecture to Kubernetes for:
- **Auto-scaling**: Handle 100-1000 concurrent users
- **High Availability**: 99.9% uptime with replicas
- **Resource Efficiency**: Dynamic resource allocation
- **Zero-downtime Deployments**: Rolling updates
- **Service Mesh**: Traffic management and observability

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Ingress Controller                       │
│          (NGINX/Traefik - SSL Termination)                  │
└────────────────┬────────────────────────────────────────────┘
                 │
    ┌────────────┴─────────────┬──────────────────┐
    │                          │                  │
    ▼                          ▼                  ▼
┌─────────────┐        ┌──────────────┐    ┌──────────────┐
│  Frontend   │        │   Backend    │    │   MLOps      │
│  Service    │        │   Service    │    │   Service    │
│  (3 pods)   │◄──────►│   (5 pods)   │◄──►│   (3 pods)   │
└─────────────┘        └──────┬───────┘    └──────────────┘
                              │                    │
                ┌─────────────┴────────┬───────────┘
                │                      │
                ▼                      ▼
         ┌─────────────┐      ┌──────────────┐
         │  Simulator  │      │   Redis      │
         │  Service    │      │   (Cache)    │
         │  (2 pods)   │      │   (3 pods)   │
         └─────────────┘      └──────────────┘
                │
                ▼
         ┌────────────────────────┐
         │  PostgreSQL + TimescaleDB │
         │  StatefulSet (3 replicas) │
         │  with Persistent Volumes  │
         └────────────────────────┘
```

## Deployment Strategy

### Phase 1: Local Development (KIND)
- Single-node cluster for testing
- All services running locally
- Development workflow validation

### Phase 2: Staging (Managed K8s)
- Multi-node cluster (3+ nodes)
- Production-like configuration
- Integration testing

### Phase 3: Production (GKE/EKS/AKS)
- Multi-zone deployment
- Auto-scaling enabled
- Full observability stack

---

## Kubernetes Resources Structure

```
k8s/
├── base/                          # Base configurations (Kustomize)
│   ├── namespace.yaml             # Namespace definition
│   ├── configmaps/
│   │   ├── frontend-config.yaml
│   │   ├── backend-config.yaml
│   │   └── mlops-config.yaml
│   ├── secrets/
│   │   ├── database-secrets.yaml
│   │   ├── api-keys.yaml
│   │   └── gemini-key.yaml
│   ├── deployments/
│   │   ├── frontend-deployment.yaml
│   │   ├── backend-deployment.yaml
│   │   ├── mlops-deployment.yaml
│   │   └── simulator-deployment.yaml
│   ├── services/
│   │   ├── frontend-service.yaml
│   │   ├── backend-service.yaml
│   │   ├── mlops-service.yaml
│   │   └── simulator-service.yaml
│   ├── statefulsets/
│   │   ├── postgres-statefulset.yaml
│   │   └── redis-statefulset.yaml
│   ├── persistentvolumes/
│   │   ├── postgres-pv.yaml
│   │   └── postgres-pvc.yaml
│   ├── hpa/                       # Horizontal Pod Autoscalers
│   │   ├── frontend-hpa.yaml
│   │   ├── backend-hpa.yaml
│   │   └── mlops-hpa.yaml
│   └── ingress/
│       └── ingress.yaml
├── overlays/
│   ├── development/               # KIND local setup
│   │   └── kustomization.yaml
│   ├── staging/                   # Staging environment
│   │   └── kustomization.yaml
│   └── production/                # Production environment
│       └── kustomization.yaml
├── monitoring/                    # Observability stack
│   ├── prometheus/
│   ├── grafana/
│   └── jaeger/
└── scripts/
    ├── deploy.sh                  # Deployment script
    ├── rollback.sh                # Rollback script
    └── scale.sh                   # Manual scaling script
```

---

## Service Specifications

### 1. Frontend Service

**Replicas**: 3 (auto-scale 2-10)  
**Resources**:
- Requests: 100m CPU, 128Mi memory
- Limits: 500m CPU, 512Mi memory

**Scaling Triggers**:
- CPU > 70%
- Memory > 80%
- Custom: Request rate > 1000 req/min per pod

**Health Checks**:
- Liveness: `GET /` (200 OK)
- Readiness: `GET /health` (200 OK)

---

### 2. Backend Service

**Replicas**: 5 (auto-scale 3-20)  
**Resources**:
- Requests: 200m CPU, 256Mi memory
- Limits: 1000m CPU, 1Gi memory

**Scaling Triggers**:
- CPU > 75%
- Memory > 85%
- Custom: Active connections > 100 per pod
- Custom: SSE connections > 500 per pod

**Health Checks**:
- Liveness: `GET /api/health` (200 OK)
- Readiness: `GET /api/ready` (checks DB connection)
- Startup: `GET /api/health` (30s timeout)

---

### 3. MLOps Service

**Replicas**: 3 (auto-scale 2-15)  
**Resources**:
- Requests: 500m CPU, 1Gi memory
- Limits: 2000m CPU, 4Gi memory (ML inference needs more)

**Scaling Triggers**:
- CPU > 70%
- Memory > 75%
- Custom: Prediction queue depth > 50

**Health Checks**:
- Liveness: `GET /health` (200 OK)
- Readiness: `GET /health` (model loaded check)

**GPU Support** (optional for production):
```yaml
resources:
  limits:
    nvidia.com/gpu: 1
```

---

### 4. Simulator Service

**Replicas**: 2 (auto-scale 1-5)  
**Resources**:
- Requests: 100m CPU, 128Mi memory
- Limits: 500m CPU, 512Mi memory

**Scaling Triggers**:
- CPU > 60%
- Custom: Simulated facilities > 50 per pod

---

### 5. PostgreSQL + TimescaleDB (StatefulSet)

**Replicas**: 3 (Primary + 2 Read Replicas)  
**Resources**:
- Requests: 1000m CPU, 2Gi memory
- Limits: 2000m CPU, 8Gi memory

**Storage**:
- Type: SSD persistent volumes
- Size: 100Gi per pod (production: 500Gi)
- Backup: Daily to object storage

**High Availability**:
- Replication: Streaming replication
- Failover: Automatic with Patroni/Stolon
- Backup: Point-in-time recovery (PITR)

---

### 6. Redis (StatefulSet)

**Replicas**: 3 (Sentinel mode)  
**Resources**:
- Requests: 100m CPU, 256Mi memory
- Limits: 500m CPU, 1Gi memory

**Usage**:
- SSE pub/sub
- Session storage
- Cache layer

---

## Auto-Scaling Configuration

### Horizontal Pod Autoscaler (HPA)

#### Frontend HPA
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: frontend-hpa
  namespace: facility-manager
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: frontend
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 25
        periodSeconds: 60
```

#### Backend HPA (with custom metrics)
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: backend-hpa
  namespace: facility-manager
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: backend
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 75
  - type: Pods
    pods:
      metric:
        name: http_requests_per_second
      target:
        type: AverageValue
        averageValue: "1000"
  - type: Pods
    pods:
      metric:
        name: sse_connections_count
      target:
        type: AverageValue
        averageValue: "500"
```

### Vertical Pod Autoscaler (VPA)

For MLOps service (adjust resources based on workload):
```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: mlops-vpa
  namespace: facility-manager
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: mlops
  updatePolicy:
    updateMode: "Auto"
  resourcePolicy:
    containerPolicies:
    - containerName: mlops
      minAllowed:
        cpu: 500m
        memory: 1Gi
      maxAllowed:
        cpu: 4000m
        memory: 8Gi
```

### Cluster Autoscaler

Scale K8s nodes based on pending pods:
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cluster-autoscaler-config
  namespace: kube-system
data:
  min-nodes: "3"
  max-nodes: "20"
  scale-down-delay: "10m"
  scale-down-unneeded-time: "10m"
```

---

## Resource Quotas & Limits

### Namespace Resource Quota
```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: facility-manager-quota
  namespace: facility-manager
spec:
  hard:
    requests.cpu: "20"
    requests.memory: 40Gi
    limits.cpu: "50"
    limits.memory: 100Gi
    persistentvolumeclaims: "10"
    services.loadbalancers: "2"
```

### Limit Ranges
```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: facility-manager-limits
  namespace: facility-manager
spec:
  limits:
  - max:
      cpu: "4"
      memory: 8Gi
    min:
      cpu: 50m
      memory: 64Mi
    type: Container
```

---

## Network Policies

### Backend Network Policy (restrict access)
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: backend-netpol
  namespace: facility-manager
spec:
  podSelector:
    matchLabels:
      app: backend
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: frontend
    - podSelector:
        matchLabels:
          app: mlops
    ports:
    - protocol: TCP
      port: 3001
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: postgres
    ports:
    - protocol: TCP
      port: 5432
  - to:
    - podSelector:
        matchLabels:
          app: redis
    ports:
    - protocol: TCP
      port: 6379
```

---

## Monitoring & Observability

### Prometheus ServiceMonitor
```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: backend-metrics
  namespace: facility-manager
spec:
  selector:
    matchLabels:
      app: backend
  endpoints:
  - port: metrics
    interval: 30s
    path: /metrics
```

### Grafana Dashboards

Pre-configured dashboards for:
1. **Service Overview**: Request rate, latency, error rate
2. **Resource Usage**: CPU, memory, disk per service
3. **Database Performance**: Query time, connections, replication lag
4. **Auto-scaling**: HPA metrics, scale events
5. **Business Metrics**: Facilities monitored, alerts triggered, RUL predictions

---

## Deployment Strategies

### 1. Rolling Update (Default)
```yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxSurge: 1
    maxUnavailable: 0
```

### 2. Blue-Green Deployment
```yaml
# Use service selector switching
# Deploy green: backend-v2
# Test green environment
# Switch service selector from v1 to v2
# Keep v1 for rollback
```

### 3. Canary Deployment (with Istio/Linkerd)
```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: backend-canary
spec:
  hosts:
  - backend
  http:
  - match:
    - headers:
        x-canary:
          exact: "true"
    route:
    - destination:
        host: backend
        subset: v2
  - route:
    - destination:
        host: backend
        subset: v1
      weight: 90
    - destination:
        host: backend
        subset: v2
      weight: 10
```

---

## Security

### 1. Pod Security Standards
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: facility-manager
  labels:
    pod-security.kubernetes.io/enforce: baseline
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

### 2. Service Account
```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: backend-sa
  namespace: facility-manager
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: backend-role
  namespace: facility-manager
rules:
- apiGroups: [""]
  resources: ["configmaps", "secrets"]
  verbs: ["get", "list"]
```

### 3. Secrets Management (with Sealed Secrets)
```yaml
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  name: database-credentials
  namespace: facility-manager
spec:
  encryptedData:
    username: AgBh8...
    password: AgC2k...
```

---

## CI/CD Pipeline

### GitHub Actions Workflow
```yaml
name: Deploy to Kubernetes

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build Docker images
        run: |
          docker build -t facility-manager/frontend:${{ github.sha }} services/frontend
          docker build -t facility-manager/backend:${{ github.sha }} services/backend
          docker build -t facility-manager/mlops:${{ github.sha }} services/mlops
      
      - name: Push to registry
        run: |
          echo ${{ secrets.DOCKER_PASSWORD }} | docker login -u ${{ secrets.DOCKER_USERNAME }} --password-stdin
          docker push facility-manager/frontend:${{ github.sha }}
          docker push facility-manager/backend:${{ github.sha }}
          docker push facility-manager/mlops:${{ github.sha }}
      
      - name: Deploy to K8s
        run: |
          kubectl set image deployment/frontend frontend=facility-manager/frontend:${{ github.sha }} -n facility-manager
          kubectl set image deployment/backend backend=facility-manager/backend:${{ github.sha }} -n facility-manager
          kubectl set image deployment/mlops mlops=facility-manager/mlops:${{ github.sha }} -n facility-manager
          kubectl rollout status deployment/frontend -n facility-manager
```

---

## Local Development with KIND

### 1. Install KIND
```bash
# Download KIND
curl -Lo ./kind https://kind.sigs.k8s.io/dl/v0.22.0/kind-$(uname)-amd64
chmod +x ./kind
sudo mv ./kind /usr/local/bin/

# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/$(uname | tr '[:upper:]' '[:lower:]')/amd64/kubectl"
chmod +x kubectl
sudo mv ./kubectl /usr/local/bin/
```

### 2. Create KIND Cluster
```bash
# Create cluster with config
cat <<EOF | kind create cluster --config=-
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
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
- role: worker
- role: worker
EOF
```

### 3. Load Docker Images to KIND
```bash
# Build images
docker build -t facility-manager/frontend:dev services/frontend
docker build -t facility-manager/backend:dev services/backend

# Load into KIND
kind load docker-image facility-manager/frontend:dev
kind load docker-image facility-manager/backend:dev
```

### 4. Deploy to KIND
```bash
# Apply configurations
kubectl apply -f k8s/base/namespace.yaml
kubectl apply -f k8s/base/configmaps/
kubectl apply -f k8s/base/secrets/
kubectl apply -f k8s/base/deployments/
kubectl apply -f k8s/base/services/

# Install NGINX Ingress
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml

# Wait for ingress
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=90s
```

### 5. Access Services
```bash
# Port forward for local access
kubectl port-forward -n facility-manager svc/frontend 8080:80
kubectl port-forward -n facility-manager svc/backend 3001:3001

# Or use ingress
echo "127.0.0.1 facility-manager.local" | sudo tee -a /etc/hosts
curl http://facility-manager.local
```

---

## Production Checklist

### Pre-deployment
- [ ] All services have health checks
- [ ] Resource requests/limits defined
- [ ] Auto-scaling configured (HPA)
- [ ] Network policies applied
- [ ] Secrets encrypted
- [ ] Persistent volumes provisioned
- [ ] Monitoring stack deployed (Prometheus + Grafana)
- [ ] Logging configured (ELK/Loki)
- [ ] Ingress SSL certificates configured
- [ ] Database backups automated

### Post-deployment
- [ ] Smoke tests pass
- [ ] Metrics flowing to Prometheus
- [ ] Logs visible in logging system
- [ ] Alerts configured
- [ ] Load testing completed
- [ ] Disaster recovery tested
- [ ] Documentation updated
- [ ] Runbook created

---

## Cost Optimization

### 1. Resource Right-sizing
- Monitor actual usage vs requested resources
- Adjust requests/limits based on data
- Use VPA recommendations

### 2. Spot/Preemptible Instances
- Use for non-critical workloads (simulator, dev)
- 60-80% cost savings

### 3. Cluster Autoscaler
- Scale down during low traffic
- Use PodDisruptionBudgets to ensure availability

### 4. Storage Classes
- Use appropriate storage tiers
- Archive old data to cheaper storage

---

## Next Steps

### Week 1: Local Setup
1. Install KIND and kubectl
2. Create local cluster
3. Deploy all services to KIND
4. Test locally

### Week 2: Staging Deployment
1. Provision managed K8s cluster (GKE/EKS/AKS)
2. Set up CI/CD pipeline
3. Deploy to staging
4. Run integration tests

### Week 3: Production Deployment
1. Configure production cluster
2. Set up monitoring and alerting
3. Deploy with rolling update
4. Run load tests
5. Go live!

---

## Commands Cheatsheet

```bash
# Deploy
kubectl apply -k k8s/overlays/production

# Check status
kubectl get pods -n facility-manager
kubectl get hpa -n facility-manager

# Scale manually
kubectl scale deployment backend --replicas=10 -n facility-manager

# View logs
kubectl logs -f deployment/backend -n facility-manager

# Execute into pod
kubectl exec -it deployment/backend -n facility-manager -- /bin/bash

# Rollback
kubectl rollout undo deployment/backend -n facility-manager

# Delete
kubectl delete -k k8s/overlays/production
```

---

**Status**: Ready to implement  
**Priority**: High for production scalability  
**Effort**: 2-3 weeks for full setup
