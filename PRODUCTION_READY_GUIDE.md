# Production-Ready Deployment Guide

This guide covers all production-ready features implemented for the NT-POC Battery Management System.

## Table of Contents

1. [Overview](#overview)
2. [New Features](#new-features)
3. [Environment Configuration](#environment-configuration)
4. [Service Setup](#service-setup)
5. [RAG System Setup](#rag-system-setup)
6. [Integration Testing](#integration-testing)
7. [Monitoring & Observability](#monitoring--observability)
8. [Troubleshooting](#troubleshooting)

---

## Overview

The system now includes production-ready features across all services:

- **Backend**: Rate limiting, request validation, enhanced health checks, RAG-powered chatbot
- **Frontend**: Error handling with retry/circuit breaker, Sentry integration
- **MLOps**: Ready for SHAP explainability and model versioning
- **Chatbot**: True RAG with vector database, streaming responses, conversation persistence

---

## New Features

### Backend Enhancements

#### 1. Rate Limiting

All API endpoints now have rate limiting to prevent abuse:

- **Read endpoints** (sensor-readings, predictions): 60 requests/minute
- **Standard endpoints** (facilities, jobs): 100 requests/15 minutes
- **Sensitive endpoints** (alerts): 20 requests/15 minutes
- **ML endpoints** (training, predictions): 10 requests/hour

When rate limit is exceeded, API returns `429 Too Many Requests` with `Retry-After` header.

#### 2. Request Validation

All API endpoints validate requests using Zod schemas:

- UUID format validation for IDs
- Range validation for sensor values
- Required field validation
- Type safety for all inputs

Invalid requests return `400 Bad Request` with detailed error messages.

#### 3. Enhanced Health Checks

New health check endpoints:

- `/api/v1/health` - Comprehensive health check (all dependencies)
- `/api/v1/health/live` - Kubernetes liveness probe (process running)
- `/api/v1/health/ready` - Kubernetes readiness probe (ready to serve traffic)

Health checks monitor:
- PostgreSQL/TimescaleDB connection
- Redis connection (if configured)
- MLOps service availability
- Simulator service availability

#### 4. Security Headers

Helmet.js middleware adds security headers:
- Content Security Policy (CSP)
- HSTS (Strict-Transport-Security)
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Referrer-Policy

#### 5. RAG-Powered Chatbot

True Retrieval-Augmented Generation with:
- **Vector Database Support**: Pinecone, Redis, or in-memory
- **Embeddings**: OpenAI text-embedding-3-small
- **Semantic Search**: Find relevant alerts, reports, and documentation
- **Streaming Responses**: Server-Sent Events (SSE) for real-time streaming
- **Conversation Persistence**: Full conversation history tracking
- **Context-Aware**: Automatically includes system stats and RAG context

### Frontend Enhancements

#### 1. Production-Ready API Client

New API client with:
- **Automatic Retry**: Exponential backoff (3 retries)
- **Circuit Breaker**: Opens after 5 failures, resets after 60s
- **Request Deduplication**: Prevents duplicate concurrent requests
- **Token Refresh**: Automatic token refresh on 401
- **Error Tracking**: Sentry integration for all API errors

#### 2. Sentry Integration

Error tracking for:
- API errors (with retry context)
- React component errors
- Performance monitoring
- Session replay (production only, privacy-preserving)

---

## Environment Configuration

### Backend Environment Variables

```bash
# Database
DB_HOST=your-timescaledb-host
DB_PORT=5432
DB_NAME=battery_management
DB_USER=postgres
DB_PASSWORD=your-secure-password
DB_SSL=true  # Enable in production

# Server
PORT=3000
NODE_ENV=production

# OpenAI (for RAG system)
OPENAI_API_KEY=sk-...  # Required for RAG chatbot

# Pinecone (optional, for production RAG)
PINECONE_API_KEY=your-pinecone-key
PINECONE_INDEX_NAME=battery-management-rag

# MLOps Service
MLOPS_BASE_URL=https://your-mlops-service.com

# Simulator
SIMULATOR_URL=https://your-simulator-service.com
SENSOR_INGESTION_ENABLED=true
SENSOR_INGESTION_INTERVAL=10000  # 10 seconds

# Background Jobs
PREDICTION_JOB_INTERVAL_MINUTES=60
ESCALATION_JOB_INTERVAL_MINUTES=5

# Monitoring
METRICS_AUTH_TOKEN=your-secret-token
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
SENTRY_RELEASE=v1.0.0  # Git commit SHA recommended

# Redis (optional)
REDIS_URL=redis://your-redis-host:6379
REDIS_PASSWORD=your-redis-password
```

### Frontend Environment Variables

```bash
# API
VITE_API_URL=https://your-backend-api.com

# Maps
VITE_MAPBOX_TOKEN=your-mapbox-token

# AI Services
VITE_GEMINI_API_KEY=your-gemini-api-key

# Monitoring
VITE_SENTRY_DSN=https://your-sentry-dsn@sentry.io/frontend-project-id
VITE_SENTRY_RELEASE=v1.0.0
```

### MLOps Service Environment Variables

```bash
# Model Storage
MODEL_PATH=/app/models
MODEL_NAME=rul_model.h5

# Performance
MAX_BATCH_SIZE=500
PARALLEL_WORKERS=10
TF_BATCH_SIZE=50

# GPU (if available)
CUDA_VISIBLE_DEVICES=0
```

---

## Service Setup

### 1. Backend Setup

```bash
cd services/backend

# Install dependencies
npm install

# Run migrations
npm run migrate:manual

# Seed production data (optional)
npm run seed:production

# Build
npm run build

# Start production server
npm start
```

**Docker Setup:**

```bash
# Build image
docker build -t battery-backend:latest -f services/backend/Dockerfile .

# Run container
docker run -d \
  --name battery-backend \
  -p 3000:3000 \
  --env-file services/backend/.env.production \
  battery-backend:latest
```

### 2. Frontend Setup

```bash
cd services/frontend

# Install dependencies
npm install

# Build for production
npm run build

# Serve with static server
npm install -g serve
serve -s dist -l 5173
```

**Nginx Configuration:**

```nginx
server {
    listen 80;
    server_name your-domain.com;

    root /var/www/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://backend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 3. MLOps Service Setup

```bash
cd services/mlops

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run service
uvicorn src.main:app --host 0.0.0.0 --port 8000 --workers 4
```

### 4. Simulator Setup

```bash
cd services/simulator

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run service
uvicorn app.main:app --host 0.0.0.0 --port 8001
```

---

## RAG System Setup

The RAG system supports multiple backends: **Pinecone** (recommended for production), **Redis**, or **in-memory** (development only).

### Option 1: Pinecone Setup (Recommended)

1. **Create Pinecone Account**: https://www.pinecone.io/

2. **Create Index:**

```python
import pinecone

pinecone.init(api_key="your-api-key")

# Create index with OpenAI embedding dimensions
pinecone.create_index(
    name="battery-management-rag",
    dimension=1536,  # text-embedding-3-small
    metric="cosine"
)
```

3. **Set Environment Variables:**

```bash
OPENAI_API_KEY=sk-your-key
PINECONE_API_KEY=your-pinecone-key
PINECONE_INDEX_NAME=battery-management-rag
```

4. **Index Existing Data:**

The RAG service automatically indexes alerts on startup and when new alerts are created.

### Option 2: In-Memory (Development Only)

Simply set:

```bash
OPENAI_API_KEY=sk-your-key
# No Pinecone configuration needed
```

The system will use in-memory vector storage.

### Testing RAG System

Test the RAG endpoint:

```bash
curl -X POST https://your-backend/api/v1/chatbot/chat \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What critical alerts do we have?",
    "include_context": true
  }'
```

Test streaming:

```bash
curl -X POST https://your-backend/api/v1/chatbot/chat/stream \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Summarize battery health status",
    "include_context": true
  }'
```

---

## Integration Testing

### Full System Test

Test the complete data flow: **Simulator → Backend → MLOps → Frontend**

#### 1. Start All Services

```bash
# Terminal 1: Backend
cd services/backend && npm start

# Terminal 2: Frontend
cd services/frontend && npm run dev

# Terminal 3: MLOps
cd services/mlops && uvicorn src.main:app --reload --port 8000

# Terminal 4: Simulator
cd services/simulator && uvicorn app.main:app --reload --port 8001
```

#### 2. Verify Sensor Data Flow

```bash
# Check simulator is generating data
curl http://localhost:8001/api/sensors/reading/BAT001

# Check backend is ingesting
curl http://localhost:3000/api/v1/sensor-readings/latest?batterySystemId=BAT001 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 3. Trigger ML Prediction

```bash
# Trigger manual prediction job
curl -X POST http://localhost:3000/api/v1/jobs/trigger-prediction \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 4. Verify Frontend Display

1. Open browser: http://localhost:5173
2. Login
3. Check Dashboard shows real sensor data
4. Verify 3D battery view updates
5. Test chatbot with RAG: "What's the battery health?"

#### 5. Test RAG Chatbot

```bash
# Create a test alert
curl -X POST http://localhost:3000/api/v1/alerts \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "battery_id": "BAT001",
    "alert_type": "temperature",
    "severity": "critical",
    "message": "Temperature exceeded 85°C"
  }'

# Ask chatbot about it
curl -X POST http://localhost:3000/api/v1/chatbot/chat/stream \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What temperature alerts do we have?"
  }'
```

---

## Monitoring & Observability

### Prometheus Metrics

Access metrics at: `https://your-backend/metrics`

Key metrics:
- `http_request_duration_seconds` - Request latency (histograms with p50, p95, p99)
- `http_requests_total` - Total requests by endpoint
- `http_request_errors_total` - Error count by endpoint
- `active_connections` - Current active connections

### Grafana Dashboard

Import the provided dashboard JSON (`monitoring/grafana-dashboard.json`):

1. Open Grafana
2. Click "+" → "Import"
3. Upload dashboard JSON
4. Select Prometheus datasource

### Health Check Monitoring

Set up Kubernetes probes:

```yaml
livenessProbe:
  httpGet:
    path: /api/v1/health/live
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /api/v1/health/ready
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 5
```

### Sentry Alerts

Configure Sentry alerts:

1. **High Error Rate**: >10 errors/minute
2. **Circuit Breaker Open**: Custom alert when circuit breaker opens
3. **Rate Limit Exceeded**: Track rate limit hits
4. **Performance Degradation**: p95 latency >2s

---

## Troubleshooting

### Issue: Rate Limit Exceeded

**Symptoms**: `429 Too Many Requests` errors

**Solutions:**
1. Check if rate limits are too strict for your use case
2. Adjust rate limits in `src/middleware/rateLimiting.ts`
3. Implement request queuing on frontend
4. Use request deduplication (already implemented)

### Issue: Circuit Breaker Open

**Symptoms**: "Circuit breaker is OPEN" error messages

**Solutions:**
1. Check MLOps service health: `curl http://mlops:8000/health`
2. Check backend logs for repeated failures
3. Wait 60 seconds for circuit to reset
4. Manually reset: Restart backend service

### Issue: RAG Returns No Results

**Symptoms**: Chatbot says "No relevant information found"

**Solutions:**
1. Check OpenAI API key is valid
2. Verify documents are indexed: `GET /api/v1/chatbot/status`
3. Manually index alerts: `POST /api/v1/chatbot/index-alert`
4. Check Pinecone index exists (if using Pinecone)

### Issue: Frontend API Errors

**Symptoms**: Network errors, failed requests

**Solutions:**
1. Check API URL in frontend env: `VITE_API_URL`
2. Check CORS configuration in backend
3. Verify auth token is valid
4. Check browser console for retry attempts
5. Verify circuit breaker state (should see retry logs)

### Issue: Database Connection Failures

**Symptoms**: Health check returns `unhealthy`, `503` errors

**Solutions:**
1. Check database credentials
2. Verify database SSL settings match environment
3. Check connection pool settings
4. Verify TimescaleDB extension is installed: `\dx` in psql
5. Check migrations are up to date: `npm run migrate:status`

### Issue: Streaming Responses Not Working

**Symptoms**: Chatbot responses not streaming, timeout errors

**Solutions:**
1. Check OpenAI API key is valid
2. Verify SSE headers are not stripped by proxy/load balancer
3. Configure Nginx for SSE:
   ```nginx
   location /api/v1/chatbot/chat/stream {
       proxy_pass http://backend:3000;
       proxy_buffering off;
       proxy_cache off;
       proxy_set_header Connection '';
       chunked_transfer_encoding on;
   }
   ```

---

## Performance Tuning

### Backend

1. **Database Connection Pool:**
   ```typescript
   // knexfile.ts
   pool: {
     min: 2,
     max: 10  // Adjust based on load
   }
   ```

2. **Rate Limits:**
   Adjust based on your traffic patterns in `rateLimiting.ts`

3. **Redis Caching:**
   Enable Redis for session storage and caching

### Frontend

1. **Bundle Size:**
   ```bash
   npm run analyze
   ```
   Look for large dependencies to code-split

2. **API Request Batching:**
   Combine multiple sensor readings into batch requests

### MLOps

1. **Batch Size:**
   Increase `TF_BATCH_SIZE` if you have GPU

2. **Workers:**
   Increase `PARALLEL_WORKERS` based on CPU cores

---

## Security Checklist

- [ ] All secrets moved to secure storage (not .env files)
- [ ] Database SSL enabled in production
- [ ] Rate limiting configured appropriately
- [ ] Helmet security headers enabled
- [ ] CORS restricted to your domain
- [ ] Auth tokens have reasonable expiry
- [ ] Sentry PII scrubbing enabled
- [ ] API keys rotated regularly
- [ ] Database backups automated
- [ ] Monitoring alerts configured

---

## Next Steps

For ongoing development and maintenance:

1. **Monitor Sentry** for errors and performance issues
2. **Review Prometheus metrics** weekly
3. **Update dependencies** monthly
4. **Backup database** daily
5. **Test disaster recovery** quarterly
6. **Review and adjust rate limits** based on usage
7. **Fine-tune RAG** with domain-specific documents
8. **A/B test ML models** for prediction accuracy

For questions or issues, refer to the main [CLAUDE.md](./CLAUDE.md) documentation.
