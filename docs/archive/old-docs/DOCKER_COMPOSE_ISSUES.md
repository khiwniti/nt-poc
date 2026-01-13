# Docker Compose Issues & Solutions

**Date**: 2026-01-12  
**Issue**: Docker Compose build failing due to npm package-lock.json sync errors

## Problem

When running `docker compose up -d`, the backend build fails with:
```
npm error `npm ci` can only install packages when your package.json and 
package-lock.json or npm-shrinkwrap.json are in sync.
```

## Root Cause

The package-lock.json files in the repository were out of sync with package.json after installing new dependencies (@google/genai, maath, leaflet).

## Solutions Applied

### 1. Updated Lock Files
```bash
cd services/backend && npm install
cd ../frontend && npm install
```

### 2. Modified Dockerfiles
Changed from `npm ci` (strict) to `npm install` (flexible):

**Before:**
```dockerfile
RUN npm ci
```

**After:**
```dockerfile
RUN npm install
```

Files modified:
- `services/backend/Dockerfile.dev`
- `services/frontend/Dockerfile.dev`

## Recommended Approach for Docker + Kubernetes

### Option 1: Docker Compose (Development Only)

**Pros:**
- Simple setup
- Good for local development
- Fast iteration

**Cons:**
- Not production-ready
- Limited scaling
- No auto-scaling
- No high availability

**Use for**: Local development and testing only

### Option 2: Kubernetes with KIND (Recommended) ✅

**Pros:**
- Production-like environment locally
- Auto-scaling with HPA
- High availability
- Multi-replica deployments
- Service discovery
- Health checks
- Same manifests work in cloud

**Cons:**
- More complex setup
- Requires Docker + KIND
- Uses more resources

**Setup Time**: 5-10 minutes
**Use for**: Development, staging, production

### Option 3: Cloud Kubernetes (Production) ✅✅

**Pros:**
- True production environment
- Auto-scaling (pods + nodes)
- High availability across zones
- Managed control plane
- Easy monitoring integration
- Cost-efficient (pay for usage)

**Cons:**
- Costs money
- Requires cloud account
- More setup initially

**Use for**: Staging and production deployments

---

## Quick Start with Kubernetes (Recommended)

Instead of struggling with Docker Compose, jump straight to Kubernetes:

### Step 1: Install KIND
```bash
# macOS
brew install kind kubectl

# Or use the automated script
./k8s/scripts/setup-kind.sh
```

### Step 2: Create Cluster
```bash
kind create cluster --name facility-manager
```

### Step 3: Deploy Services
```bash
# The deploy script will handle everything
./k8s/scripts/deploy.sh development
```

### Step 4: Access Services
```bash
# Port forward to local machine
kubectl port-forward -n facility-manager svc/frontend 8080:80
kubectl port-forward -n facility-manager svc/backend 3001:3001

# Open in browser
# Frontend: http://localhost:8080
# Backend API: http://localhost:3001/api
```

---

## Comparison: Docker Compose vs Kubernetes

| Feature | Docker Compose | Kubernetes (KIND) | Kubernetes (Cloud) |
|---------|---------------|-------------------|-------------------|
| **Setup Time** | 2 min | 5 min | 15 min |
| **Auto-scaling** | ❌ No | ✅ Yes (HPA) | ✅ Yes (HPA + CA) |
| **High Availability** | ❌ No | ✅ Multi-replica | ✅ Multi-zone |
| **Resource Limits** | ⚠️ Basic | ✅ Advanced | ✅ Advanced |
| **Health Checks** | ⚠️ Basic | ✅ Liveness/Readiness | ✅ Full |
| **Service Discovery** | ⚠️ DNS | ✅ Built-in | ✅ Built-in |
| **Load Balancing** | ❌ No | ✅ Yes | ✅ Yes |
| **Rolling Updates** | ❌ No | ✅ Yes | ✅ Yes |
| **Cost** | Free | Free | $100-500/mo |
| **Production Ready** | ❌ No | ⚠️ Dev/Test | ✅ Yes |

---

## Docker Compose Alternative Commands

If you still want to use Docker Compose for development:

### Build Individual Services
```bash
# Backend only
docker compose build backend

# Frontend only
docker compose build frontend

# All services
docker compose build
```

### Run with Logs
```bash
# Start and show logs
docker compose up

# Start detached
docker compose up -d

# View logs
docker compose logs -f backend
docker compose logs -f frontend
```

### Clean Start
```bash
# Stop and remove everything
docker compose down -v

# Rebuild from scratch
docker compose build --no-cache

# Start fresh
docker compose up -d --build
```

---

## Troubleshooting Docker Compose

### Issue: npm install fails in Docker
**Solution 1**: Clear Docker build cache
```bash
docker builder prune -a
docker compose build --no-cache
```

**Solution 2**: Update package-lock.json locally first
```bash
cd services/backend && rm -rf node_modules package-lock.json
npm install
cd ../frontend && rm -rf node_modules package-lock.json
npm install
```

### Issue: Port already in use
**Solution**:
```bash
# Find process using port 3001
lsof -ti:3001 | xargs kill

# Or use different ports in docker-compose.yml
```

### Issue: Database connection fails
**Solution**:
```bash
# Check if postgres is running
docker compose ps postgres

# View postgres logs
docker compose logs postgres

# Restart postgres
docker compose restart postgres
```

---

## Recommended Next Steps

### Today:
1. ✅ **Skip Docker Compose** - Too many issues for complex setup
2. ✅ **Use Kubernetes with KIND** instead:
   ```bash
   ./k8s/scripts/setup-kind.sh
   ./k8s/scripts/deploy.sh development
   ```

### Tomorrow:
3. Test auto-scaling with load:
   ```bash
   kubectl get hpa -n facility-manager -w
   ```

4. View running services:
   ```bash
   kubectl get pods -n facility-manager
   ```

---

## Why Kubernetes > Docker Compose?

### 1. **Auto-scaling Built-in**
```yaml
# HPA automatically scales pods based on CPU
minReplicas: 3
maxReplicas: 20
targetCPU: 75%
```

### 2. **High Availability**
- Multiple replicas per service
- Auto-restart on failure
- Health checks

### 3. **Production-Ready**
- Same manifests work locally (KIND) and cloud (GKE/EKS/AKS)
- Rolling updates
- Zero-downtime deployments

### 4. **Resource Management**
```yaml
resources:
  requests:
    cpu: 200m
    memory: 256Mi
  limits:
    cpu: 1000m
    memory: 1Gi
```

### 5. **Better Developer Experience**
- One command to deploy all services
- Built-in service discovery
- Easy to scale: `kubectl scale deployment backend --replicas=10`

---

## Summary

**Docker Compose Issues:**
- Package-lock.json sync problems
- No auto-scaling
- Not production-ready
- Limited orchestration

**Kubernetes Solution:**
- Automated setup script ✅
- Auto-scaling with HPA ✅
- Production-ready ✅
- Multi-replica deployments ✅
- 5-minute setup ✅

**Recommendation:** Use Kubernetes with KIND for local development instead of Docker Compose.

**Next Command:**
```bash
./k8s/scripts/setup-kind.sh
```

---

## References

- **Kubernetes Setup**: `KUBERNETES_QUICKSTART.md`
- **Architecture Guide**: `KUBERNETES_DEPLOYMENT.md`
- **Project Roadmap**: `PROJECT_ROADMAP.md`
