# MLflow Migration Quick Start Guide

## Current Status

✅ **Comprehensive Migration Plan Created**: See `MLFLOW_MIGRATION_PLAN.md` for full details

## Immediate Action Items

### Step 1: Fix Current MLOps Deployment (PRIORITY)

The MLOps service is currently returning 502 errors. Let's fix this first before migrating to MLflow.

#### 1.1 Check Railway Project Connection
```bash
cd /Users/khiwn/nt-poc/nt-poc
railway status
```

If not linked:
```bash
railway link
```

#### 1.2 Check Current Deployment Logs
```bash
railway logs --service mlops --lines 100
```

#### 1.3 Verify Environment Variables
```bash
railway variables --service mlops
```

Expected variables:
- `PORT=8000`
- `ENVIRONMENT=production`
- `MODELS_DIR=/app/models`

#### 1.4 Check if Port Mismatch
The Dockerfile specifies port 8001, but Railway env shows PORT=8000. Fix:
```bash
railway variables --service mlops --set "PORT=8001"
```

Or update the Dockerfile to use PORT from env:
```dockerfile
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "$PORT"]
```

#### 1.5 Redeploy MLOps Service
```bash
railway up --service mlops
```

### Step 2: Phase 1 - Create MLflow Tracking Server

Once MLOps is stable, proceed with MLflow migration:

#### 2.1 Create Directory Structure
```bash
mkdir -p services/mlflow-tracking
cd services/mlflow-tracking
```

#### 2.2 Create requirements.txt
```bash
cat > requirements.txt << 'EOF'
mlflow==2.10.0
psycopg2-binary==2.9.9
boto3==1.34.0
gunicorn==21.2.0
python-multipart==0.0.6
EOF
```

#### 2.3 Create Dockerfile
```bash
cat > Dockerfile << 'EOF'
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies including curl for healthcheck
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Create directories
RUN mkdir -p /mlflow/artifacts

# Expose port
EXPOSE 5000

# Health check - MLflow doesn't have /health by default, check root
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:5000/ || exit 1

# Start MLflow tracking server
CMD mlflow server \
    --backend-store-uri postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB} \
    --default-artifact-root /mlflow/artifacts \
    --host 0.0.0.0 \
    --port 5000
EOF
```

#### 2.4 Create railway.toml
```bash
cat > railway.toml << 'EOF'
[build]
builder = "DOCKERFILE"
dockerfilePath = "services/mlflow-tracking/Dockerfile"

[deploy]
numReplicas = 1
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
EOF
```

#### 2.5 Create Service on Railway
```bash
cd /Users/khiwn/nt-poc/nt-poc

# Create the service
railway service create mlflow-tracking

# Link to the service
railway link --service mlflow-tracking
```

#### 2.6 Get PostgreSQL Connection Info
```bash
# List variables from existing service to get Postgres details
railway variables --service backend
```

Look for:
- `POSTGRES_HOST` or `DATABASE_URL`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_DB`
- `POSTGRES_PORT`

#### 2.7 Set MLflow Environment Variables
```bash
railway variables --service mlflow-tracking --set \
  "PORT=5000" \
  "POSTGRES_HOST=<from-step-2.6>" \
  "POSTGRES_PORT=5432" \
  "POSTGRES_USER=<from-step-2.6>" \
  "POSTGRES_PASSWORD=<from-step-2.6>" \
  "POSTGRES_DB=mlflow"
```

**Note**: You may want to create a separate database for MLflow:
```bash
# Connect to PostgreSQL and create mlflow database
railway run --service backend -- psql $DATABASE_URL -c "CREATE DATABASE mlflow;"
```

#### 2.8 Deploy MLflow Tracking Server
```bash
railway up --service mlflow-tracking
```

#### 2.9 Generate Domain for MLflow
```bash
railway domain --service mlflow-tracking
```

#### 2.10 Test MLflow Tracking Server
```bash
# Get the domain
railway variables --service mlflow-tracking | grep RAILWAY_PUBLIC_DOMAIN

# Test (replace with your domain)
curl https://mlflow-tracking-production-xxxx.up.railway.app/
```

### Step 3: Update MLOps Service for MLflow

#### 3.1 Update requirements.txt
```bash
cd /Users/khiwn/nt-poc/nt-poc/services/mlops
```

Add to `requirements.txt`:
```
mlflow==2.10.0
```

#### 3.2 Create MLflow Integration Module
```bash
mkdir -p src/mlflow_integration
```

Create the files as specified in `MLFLOW_MIGRATION_PLAN.md` Phase 2.

#### 3.3 Update MLOps Configuration

Add to `services/mlops/src/config.py`:
```python
# MLflow Configuration
MLFLOW_TRACKING_URI: str = Field(
    default="http://mlflow-tracking.railway.internal:5000",
    description="MLflow tracking server URI"
)
MLFLOW_MODEL_NAME: str = Field(
    default="rul_predictor",
    description="MLflow registered model name"
)
MLFLOW_MODEL_STAGE: str = Field(
    default="Production",
    description="MLflow model stage"
)
MLFLOW_EXPERIMENT_NAME: str = Field(
    default="rul_prediction",
    description="MLflow experiment name"
)
```

#### 3.4 Set MLOps Environment Variables
```bash
railway variables --service mlops --set \
  "MLFLOW_TRACKING_URI=http://mlflow-tracking.railway.internal:5000" \
  "MLFLOW_MODEL_NAME=rul_predictor" \
  "MLFLOW_MODEL_STAGE=Production" \
  "MLFLOW_EXPERIMENT_NAME=rul_prediction"
```

#### 3.5 Redeploy MLOps Service
```bash
cd /Users/khiwn/nt-poc/nt-poc
railway up --service mlops
```

## Railway Service URLs

After deployment, you should have:

1. **MLflow Tracking Server**: 
   - Internal: `http://mlflow-tracking.railway.internal:5000`
   - External: `https://mlflow-tracking-production-xxxx.up.railway.app`

2. **MLOps Service**:
   - Internal: `http://mlops.railway.internal:8000`
   - External: `https://mlops-production-3b39.up.railway.app`

3. **Backend**:
   - External: `https://backend-production-77f7.up.railway.app`

4. **Frontend**:
   - External: `https://frontend-production-ed3d.up.railway.app`

5. **Simulator**:
   - External: `https://simulator-production-a018.up.railway.app`

## Verification Commands

### Test MLflow Tracking Server
```bash
# Check health
curl https://mlflow-tracking-production-xxxx.up.railway.app/

# List experiments (should return empty initially)
curl https://mlflow-tracking-production-xxxx.up.railway.app/api/2.0/mlflow/experiments/list
```

### Test MLOps Service
```bash
# Check health
curl https://mlops-production-3b39.up.railway.app/health | jq .

# Check model info (will show MLflow integration)
curl https://mlops-production-3b39.up.railway.app/ml/model-info | jq .
```

## Troubleshooting

### Issue: MLflow Tracking Server Won't Start

**Symptoms**: Service crashes or returns 502
**Solutions**:
1. Check PostgreSQL connection:
   ```bash
   railway logs --service mlflow-tracking --lines 50
   ```
2. Verify database exists:
   ```bash
   railway run --service backend -- psql $DATABASE_URL -c "\l"
   ```
3. Check environment variables are set correctly

### Issue: MLOps Can't Connect to MLflow

**Symptoms**: "Connection refused" or "Could not connect to MLflow"
**Solutions**:
1. Verify internal networking:
   ```bash
   railway variables --service mlops | grep MLFLOW_TRACKING_URI
   ```
   Should be: `http://mlflow-tracking.railway.internal:5000`
2. Check both services are in same project and environment
3. Verify MLflow service is running:
   ```bash
   railway status --service mlflow-tracking
   ```

### Issue: Port Mismatch Errors

**Symptoms**: "Address already in use" or service won't start
**Solutions**:
1. Ensure Dockerfile uses `$PORT` environment variable
2. Verify Railway PORT variable matches Dockerfile EXPOSE
3. For MLflow: Use PORT=5000
4. For MLOps: Use PORT=8000 or 8001 (be consistent)

### Issue: Model Not Found in MLflow

**Symptoms**: "Model 'rul_predictor' not found"
**Solutions**:
1. Register model first (see Phase 3 in main plan)
2. Check model name matches configuration
3. Verify model stage (Production, Staging, etc.)

## Next Steps After Migration

1. **Register Existing Models**: Use the registration script in Phase 3
2. **Set Up CI/CD**: Automate model deployment
3. **Enable Monitoring**: Log predictions to MLflow
4. **Configure Alerts**: Set up model performance monitoring
5. **Document Workflows**: Update team documentation

## Reference Documents

- **Full Migration Plan**: `MLFLOW_MIGRATION_PLAN.md`
- **Railway CLI Reference**: `RAILWAY_CLI_QUICK_REFERENCE.md`
- **MLOps Architecture**: `ARCHITECTURE.md`

## Support

If you encounter issues:
1. Check Railway logs: `railway logs --service <service-name>`
2. Verify environment variables: `railway variables --service <service-name>`
3. Check service status: `railway status --service <service-name>`
4. Review deployment status in Railway dashboard

## Timeline Estimate

- **Step 1** (Fix MLOps): 1-2 hours
- **Step 2** (Deploy MLflow): 2-4 hours
- **Step 3** (Integrate): 4-6 hours
- **Testing**: 2-3 hours

**Total**: 1-2 days for initial setup and testing