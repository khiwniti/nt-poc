# Docker Compose Development Guide

## Quick Start

```bash
# Start core services (frontend, backend, mlops, database)
docker-compose up

# Start with Redis (optional caching)
docker-compose --profile with-redis up

# Start with ML training service
docker-compose --profile ml-training up

# Rebuild after dependency changes
docker-compose up --build

# View logs
docker-compose logs -f backend

# Stop all services
docker-compose down

# Stop and remove volumes (fresh start)
docker-compose down -v
```

## Service Access

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000/api/v1
- **Backend Health**: http://localhost:3000/api/health
- **MLOps Service**: http://localhost:8001
- **MLOps Health**: http://localhost:8001/health
- **Database**: localhost:5432 (user: postgres, db: battery_management)
- **Redis** (if started): localhost:6379

## Development Workflow

### Initial Setup

1. Clone repository
2. Run `docker-compose up`
3. Wait for health checks to pass (~40 seconds)
4. Access frontend at http://localhost:5173

### Code Changes

- **Frontend**: Changes in `services/frontend/src/` trigger hot-reload (HMR)
- **Backend**: Changes in `services/backend/src/` trigger auto-restart (nodemon)
- **MLOps**: Changes in `services/mlops/src/` require container restart

### Database Operations

```bash
# Run migrations (automatic on backend startup)
docker-compose exec backend npm run migrate

# Check migration status
docker-compose exec backend npm run migrate:status

# Seed database with sample data
docker-compose exec backend npm run seed:run

# Connect to database
docker-compose exec database psql -U postgres -d battery_management

# View tables
docker-compose exec database psql -U postgres -d battery_management -c "\dt"
```

### Logs and Debugging

```bash
# View logs for all services
docker-compose logs

# Follow logs for specific service
docker-compose logs -f backend

# View last 100 lines
docker-compose logs --tail=100 backend
```

## Profiles

### with-redis
Starts Redis for report caching (optional):
```bash
docker-compose --profile with-redis up
```

### ml-training
Starts ML training service:
```bash
docker-compose --profile ml-training up
```

### Combined profiles
```bash
docker-compose --profile with-redis --profile ml-training up
```

## Troubleshooting

### Port Conflicts

If ports are already in use, stop conflicting services:
```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>
```

### Database Connection Issues

```bash
# Check database health
docker-compose ps database

# View database logs
docker-compose logs database

# Restart database
docker-compose restart database
```

### Frontend Not Loading

```bash
# Check frontend logs
docker-compose logs frontend

# Ensure Vite dev server started
# Look for "Local: http://localhost:5173" in logs
```

### Clean Restart

Remove all containers and volumes:
```bash
docker-compose down -v
docker-compose up --build
```

## Production Deployment

For production, use `/infrastructure/docker-compose.yml` which includes:
- Nginx reverse proxy with SSL/TLS
- Production-optimized builds
- Let's Encrypt certificates
- Security hardening
