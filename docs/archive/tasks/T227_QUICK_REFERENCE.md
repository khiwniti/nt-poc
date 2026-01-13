# T227: Dockerfiles Quick Reference

## Created Files

### Dockerfiles
1. **Frontend**: `services/frontend/Dockerfile` - Node 20 Alpine, multi-stage
2. **Backend**: `services/backend/Dockerfile` - Node 20 Alpine, multi-stage
3. **MLOps**: `services/mlops/Dockerfile` - Python 3.11 slim, optimized
4. **ML/Simulator**: `services/ml/Dockerfile` - Python 3.11 slim, training service

### .dockerignore Files
1. `services/frontend/.dockerignore`
2. `services/backend/.dockerignore`
3. `services/mlops/.dockerignore`
4. `services/ml/.dockerignore`

## Build Commands

```bash
# Frontend
docker build -t nt-poc-frontend:latest services/frontend

# Backend
docker build -t nt-poc-backend:latest services/backend

# MLOps
docker build -t nt-poc-mlops:latest services/mlops

# ML/Simulator
docker build -t nt-poc-ml:latest services/ml
```

## Run Commands

```bash
# Frontend (port 3000)
docker run -d -p 3000:3000 --name frontend nt-poc-frontend:latest

# Backend (port 3001)
docker run -d -p 3001:3001 \
  -e DATABASE_URL=postgresql://user:pass@db:5432/ntpoc \
  -e JWT_SECRET=your-secret \
  --name backend nt-poc-backend:latest

# MLOps (port 8001)
docker run -d -p 8001:8001 \
  -v $(pwd)/models:/app/models \
  --name mlops nt-poc-mlops:latest

# ML/Simulator (batch)
docker run --rm \
  -v $(pwd)/models:/app/models \
  -v $(pwd)/data:/app/data \
  --name ml nt-poc-ml:latest
```

## Health Check

```bash
# Frontend
curl http://localhost:3000/

# Backend
curl http://localhost:3001/api/health

# MLOps
curl http://localhost:8001/health
```

## Key Features

### Multi-stage Builds
- **Builder stage**: Build tools + dev dependencies
- **Production stage**: Runtime only
- **Result**: 50-70% smaller images

### Security
- Non-root users in all images
- Minimal base images (Alpine/Slim)
- No build tools in production

### Optimization
- Layer caching for faster builds
- .dockerignore excludes unnecessary files
- npm/pip caches cleaned

## Image Sizes (Approximate)

- Frontend: ~150-200MB (Alpine + static files)
- Backend: ~180-230MB (Alpine + Node runtime)
- MLOps: ~1.2-1.5GB (TensorFlow + scikit-learn)
- ML: ~1.2-1.5GB (TensorFlow + scikit-learn)

## Next Steps

See `infrastructure/docker-compose.yml` for orchestration (T228)
