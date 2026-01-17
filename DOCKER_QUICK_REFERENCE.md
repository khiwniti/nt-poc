# Railway Docker Deployment - Quick Reference

## 🚀 Deploy to Railway (One Command)

```bash
./deploy-railway.sh
```

## 🐳 Test Locally with Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f backend

# Check status
docker-compose ps

# Stop all
docker-compose down
```

## 📦 Individual Service Commands

### Build Locally
```bash
# Backend
docker build -t nt-backend services/backend

# Simulator
docker build -t nt-simulator services/simulator

# MLOps
docker build -t nt-mlops services/mlops

# Frontend
docker build -t nt-frontend services/frontend
```

### Run Locally
```bash
# Backend (requires DATABASE_URL)
docker run -p 3000:3000 -e DATABASE_URL=postgresql://... nt-backend

# Simulator
docker run -p 8001:8001 nt-simulator

# MLOps (requires model file)
docker run -p 8002:8001 -v $(pwd)/services/mlops/models:/app/models nt-mlops

# Frontend
docker run -p 80:80 nt-frontend
```

## 🔧 Railway CLI Commands

### Deploy Services
```bash
cd services/backend
railway up --service backend

cd ../simulator
railway up --service simulator

cd ../mlops
railway up --service mlops

cd ../frontend
railway up --service frontend
```

### Check Status
```bash
railway status                    # All services
railway logs --service backend    # Service logs
railway domain                    # Get URL
railway variables                 # List env vars
```

### Set Environment Variables
```bash
railway variables set NODE_ENV=production
railway variables set PORT=3000
railway variables set DB_SSL=true
```

### Database Operations
```bash
# Run migrations
railway run npm run migrate

# Seed data
railway run npm run seed:production

# Access database
railway run psql $DATABASE_URL

# Verify data
railway run psql $DATABASE_URL -c "SELECT COUNT(*) FROM battery_systems;"
```

## 🔍 Health Checks

```bash
# Backend
curl http://localhost:3000/api/v1/health

# Simulator
curl http://localhost:8001/health

# MLOps
curl http://localhost:8002/health

# Frontend
curl http://localhost/health
```

## 📊 Service Ports

| Service | Local Port | Container Port | Railway Port |
|---------|------------|----------------|--------------|
| Backend | 3000 | 3000 | Auto |
| Simulator | 8001 | 8001 | Auto |
| MLOps | 8002 | 8001 | Auto |
| Frontend | 80 | 80 | Auto |
| PostgreSQL | 5432 | 5432 | Auto |

## 🎯 Production Checklist

- [ ] All Dockerfiles present and tested
- [ ] railway.toml configured for each service
- [ ] .dockerignore files prevent large uploads
- [ ] Environment variables documented
- [ ] Database migrations ready
- [ ] Model file ready for MLOps
- [ ] Health checks passing locally
- [ ] docker-compose.yml tested

## 🐛 Quick Troubleshooting

### Build Fails
```bash
# Check .dockerignore
cat services/backend/.dockerignore

# Test build locally
docker build -t test services/backend

# Clean build cache
docker builder prune
```

### Service Won't Start
```bash
# Check logs
railway logs --service backend --tail 100

# Check environment
railway variables

# Restart service
railway restart --service backend
```

### Database Issues
```bash
# Verify connection
railway run psql $DATABASE_URL -c "SELECT 1;"

# Check migrations
railway run npm run migrate:status

# Re-run migrations
railway run npm run migrate
```

## 📚 Key Files

```
nt-poc/
├── docker-compose.yml          # Local development
├── deploy-railway.sh           # Automated deployment
├── services/
│   ├── backend/
│   │   ├── Dockerfile         # Backend image
│   │   ├── railway.toml       # Railway config
│   │   └── .dockerignore      # Exclude files
│   ├── simulator/
│   │   ├── Dockerfile
│   │   ├── railway.toml
│   │   └── .dockerignore
│   ├── mlops/
│   │   ├── Dockerfile
│   │   ├── railway.toml
│   │   └── .dockerignore
│   └── frontend/
│       ├── Dockerfile
│       ├── railway.toml
│       ├── nginx.conf         # Nginx config
│       └── .dockerignore
```

## 🔗 Useful Links

- Railway Dashboard: https://railway.app/dashboard
- Railway Docs: https://docs.railway.app
- Full Guide: `RAILWAY_DOCKER_DEPLOYMENT.md`
- Docker Compose: `docker-compose.yml`

---

**Quick Deploy**: `./deploy-railway.sh`  
**Local Test**: `docker-compose up -d`  
**Status**: `railway status`
