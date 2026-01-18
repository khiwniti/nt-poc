# MLflow Migration Plan for MLOps Service

## Executive Summary

This document outlines the comprehensive migration plan to integrate MLflow into the current MLOps service, including:
- MLflow tracking server setup
- Model registry configuration
- Railway deployment configuration
- Environment variables and secrets management

## Current State Analysis

### Current MLOps Service
- **Framework**: FastAPI with custom model serving
- **Model Loading**: Direct file-based loading (.h5, .pkl, .joblib)
- **Model Cache**: Custom LRU cache implementation
- **Deployment**: Railway with Dockerfile
- **Current Issues**: 502 errors (needs investigation)

### Current Environment Variables (Railway)
```
ENVIRONMENT=production
LOG_LEVEL=INFO
MODELS_DIR=/app/models
MODEL_VERSION=v1.0.0
PORT=8000
```

## MLflow Integration Architecture

### 1. MLflow Components

#### A. MLflow Tracking Server
- **Purpose**: Log experiments, parameters, metrics, and artifacts
- **Deployment Options**:
  1. **Option A (Recommended)**: Railway service for MLflow tracking server
  2. **Option B**: External managed service (Databricks, AWS, Azure)
  3. **Option C**: Shared PostgreSQL database on Railway

#### B. MLflow Model Registry
- **Purpose**: Centralized model versioning and lifecycle management
- **Features**:
  - Model versioning (v1, v2, etc.)
  - Stage transitions (None → Staging → Production)
  - Model lineage and metadata
  - Automated model serving

#### C. MLflow Models
- **Format**: Standardized model packaging
- **Benefits**:
  - Framework-agnostic serving
  - Built-in preprocessing/postprocessing
  - Environment reproducibility
  - Model signatures for validation

### 2. Proposed Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Railway Platform                          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐      ┌──────────────┐      ┌───────────┐ │
│  │   MLflow     │      │    MLOps     │      │ PostgreSQL│ │
│  │   Tracking   │◄────►│   Service    │◄────►│  Database │ │
│  │   Server     │      │  (FastAPI)   │      │           │ │
│  └──────────────┘      └──────────────┘      └───────────┘ │
│         │                      │                             │
│         │                      │                             │
│         ▼                      ▼                             │
│  ┌──────────────┐      ┌──────────────┐                    │
│  │  Artifact    │      │    Model     │                    │
│  │   Store      │      │   Registry   │                    │
│  │  (S3/Volume) │      │  (Database)  │                    │
│  └──────────────┘      └──────────────┘                    │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Implementation Plan

### Phase 1: Setup MLflow Tracking Server (Week 1)

#### Step 1.1: Create MLflow Service Directory
```bash
mkdir -p services/mlflow-tracking
cd services/mlflow-tracking
```

#### Step 1.2: Create MLflow Tracking Server Files

**requirements.txt**:
```
mlflow==2.10.0
psycopg2-binary==2.9.9
boto3==1.34.0
gunicorn==21.2.0
```

**Dockerfile**:
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Create directories
RUN mkdir -p /mlflow/artifacts

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1

# Start MLflow tracking server
CMD mlflow server \
    --backend-store-uri postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}/${POSTGRES_DB} \
    --default-artifact-root /mlflow/artifacts \
    --host 0.0.0.0 \
    --port 5000
```

**railway.toml**:
```toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "services/mlflow-tracking/Dockerfile"

[deploy]
numReplicas = 1
healthcheckPath = "/health"
healthcheckTimeout = 300
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
```

#### Step 1.3: Deploy MLflow Tracking Server to Railway
```bash
# From repo root
railway up --service mlflow-tracking
```

#### Step 1.4: Configure Environment Variables
```bash
railway variables --service mlflow-tracking --set \
  "POSTGRES_HOST=<postgres-host>" \
  "POSTGRES_USER=<postgres-user>" \
  "POSTGRES_PASSWORD=<postgres-password>" \
  "POSTGRES_DB=mlflow_db" \
  "PORT=5000"
```

### Phase 2: Update MLOps Service for MLflow (Week 1-2)

#### Step 2.1: Update requirements.txt
Add MLflow client:
```
mlflow==2.10.0
```

#### Step 2.2: Create MLflow Integration Module

**src/mlflow_integration/__init__.py**:
```python
"""MLflow integration for model serving"""
from .client import MLflowClient
from .model_loader import MLflowModelLoader

__all__ = ["MLflowClient", "MLflowModelLoader"]
```

**src/mlflow_integration/client.py**:
```python
"""MLflow client wrapper"""
import os
import logging
from typing import Optional, Dict, Any

import mlflow
from mlflow.tracking import MlflowClient as _MlflowClient

logger = logging.getLogger(__name__)


class MLflowClient:
    """Wrapper for MLflow client with Railway configuration"""
    
    def __init__(
        self,
        tracking_uri: Optional[str] = None,
        registry_uri: Optional[str] = None
    ):
        self.tracking_uri = tracking_uri or os.getenv(
            "MLFLOW_TRACKING_URI",
            "http://mlflow-tracking.railway.internal:5000"
        )
        self.registry_uri = registry_uri or self.tracking_uri
        
        mlflow.set_tracking_uri(self.tracking_uri)
        mlflow.set_registry_uri(self.registry_uri)
        
        self._client = _MlflowClient(
            tracking_uri=self.tracking_uri,
            registry_uri=self.registry_uri
        )
        
        logger.info(f"MLflow client initialized: {self.tracking_uri}")
    
    def get_latest_model_version(
        self,
        model_name: str,
        stage: str = "Production"
    ) -> Optional[str]:
        """Get latest model version for a given stage"""
        try:
            versions = self._client.get_latest_versions(
                model_name,
                stages=[stage]
            )
            if versions:
                return versions[0].version
            return None
        except Exception as e:
            logger.error(f"Error getting model version: {e}")
            return None
    
    def load_model(
        self,
        model_name: str,
        version: Optional[str] = None,
        stage: str = "Production"
    ):
        """Load model from registry"""
        try:
            if version:
                model_uri = f"models:/{model_name}/{version}"
            else:
                model_uri = f"models:/{model_name}/{stage}"
            
            logger.info(f"Loading model: {model_uri}")
            model = mlflow.pyfunc.load_model(model_uri)
            
            return model
        except Exception as e:
            logger.error(f"Error loading model: {e}")
            raise
    
    def log_prediction_metrics(
        self,
        run_id: str,
        metrics: Dict[str, float]
    ):
        """Log prediction metrics to MLflow"""
        try:
            with mlflow.start_run(run_id=run_id):
                mlflow.log_metrics(metrics)
        except Exception as e:
            logger.error(f"Error logging metrics: {e}")
```

**src/mlflow_integration/model_loader.py**:
```python
"""MLflow-based model loader with caching"""
import logging
from typing import Optional, Any
from functools import lru_cache

from .client import MLflowClient

logger = logging.getLogger(__name__)


class MLflowModelLoader:
    """Model loader with MLflow integration and caching"""
    
    def __init__(
        self,
        model_name: str = "rul_predictor",
        stage: str = "Production"
    ):
        self.model_name = model_name
        self.stage = stage
        self.client = MLflowClient()
        self._model = None
        self._version = None
    
    @property
    def model(self) -> Any:
        """Get cached model, load if necessary"""
        if self._model is None:
            self._model = self._load_model()
        return self._model
    
    @property
    def version(self) -> Optional[str]:
        """Get current model version"""
        return self._version
    
    def _load_model(self) -> Any:
        """Load model from MLflow"""
        logger.info(
            f"Loading model '{self.model_name}' "
            f"from stage '{self.stage}'"
        )
        
        model = self.client.load_model(
            self.model_name,
            stage=self.stage
        )
        
        self._version = self.client.get_latest_model_version(
            self.model_name,
            self.stage
        )
        
        logger.info(f"Model loaded: version {self._version}")
        return model
    
    def reload_if_updated(self) -> bool:
        """Check for model updates and reload if necessary"""
        current_version = self.client.get_latest_model_version(
            self.model_name,
            self.stage
        )
        
        if current_version and current_version != self._version:
            logger.info(
                f"New model version detected: "
                f"{self._version} -> {current_version}"
            )
            self._model = None
            self._version = None
            return True
        
        return False
```

#### Step 2.3: Update config.py

Add MLflow configuration:
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
    description="MLflow model stage (None, Staging, Production, Archived)"
)
MLFLOW_EXPERIMENT_NAME: str = Field(
    default="rul_prediction",
    description="MLflow experiment name for logging"
)
```

#### Step 2.4: Update RUL Service

Modify `src/api/rul_service.py` to use MLflow:
```python
from ..mlflow_integration import MLflowModelLoader

class RULPredictionService:
    def __init__(self):
        self.model_loader = MLflowModelLoader(
            model_name=settings.MLFLOW_MODEL_NAME,
            stage=settings.MLFLOW_MODEL_STAGE
        )
        # ... rest of initialization
    
    @property
    def model(self):
        """Get model with automatic reload check"""
        self.model_loader.reload_if_updated()
        return self.model_loader.model
```

### Phase 3: Model Registration and Deployment (Week 2)

#### Step 3.1: Create Model Training/Registration Script

**scripts/register_model_to_mlflow.py**:
```python
"""Register existing trained model to MLflow"""
import mlflow
import mlflow.keras
import mlflow.sklearn
from pathlib import Path
import sys

def register_keras_model(
    model_path: str,
    model_name: str = "rul_predictor",
    description: str = "RUL prediction LSTM model"
):
    """Register Keras model to MLflow"""
    
    # Set MLflow tracking URI
    mlflow.set_tracking_uri(
        os.getenv(
            "MLFLOW_TRACKING_URI",
            "http://localhost:5000"
        )
    )
    
    # Load model
    from tensorflow import keras
    model = keras.models.load_model(model_path)
    
    # Start MLflow run
    with mlflow.start_run(run_name="initial_registration"):
        # Log model parameters
        mlflow.log_param("model_type", "LSTM")
        mlflow.log_param("framework", "Keras/TensorFlow")
        
        # Log model
        mlflow.keras.log_model(
            model,
            artifact_path="model",
            registered_model_name=model_name
        )
        
        # Add model description
        client = mlflow.tracking.MlflowClient()
        client.update_registered_model(
            name=model_name,
            description=description
        )
        
        print(f"Model registered: {model_name}")
        print(f"Run ID: {mlflow.active_run().info.run_id}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python register_model_to_mlflow.py <model_path>")
        sys.exit(1)
    
    register_keras_model(sys.argv[1])
```

#### Step 3.2: Transition Model to Production
```bash
# After registration
mlflow models transition \
  --model-name rul_predictor \
  --version 1 \
  --stage Production
```

### Phase 4: Railway Deployment Configuration (Week 2)

#### Step 4.1: Update MLOps Environment Variables

Required variables for Railway:
```bash
railway variables --service mlops --set \
  "MLFLOW_TRACKING_URI=http://mlflow-tracking.railway.internal:5000" \
  "MLFLOW_MODEL_NAME=rul_predictor" \
  "MLFLOW_MODEL_STAGE=Production" \
  "MLFLOW_EXPERIMENT_NAME=rul_prediction"
```

#### Step 4.2: Update Dockerfile

Add MLflow dependencies and configuration:
```dockerfile
# Install Python dependencies (including mlflow)
RUN pip install --no-cache-dir -r requirements.txt

# Note: No need to copy models directory when using MLflow
# Models are loaded from MLflow tracking server
```

#### Step 4.3: Railway Service Dependencies

Update `railway.toml` to ensure MLflow tracking server starts first:
```toml
[deploy]
startCommand = "uvicorn src.main:app --host 0.0.0.0 --port $PORT"

# Note: Railway will automatically handle service discovery
# via .railway.internal domains
```

### Phase 5: Testing and Validation (Week 3)

#### Step 5.1: Local Testing
```bash
# Start MLflow locally
mlflow server \
  --backend-store-uri postgresql://localhost/mlflow \
  --default-artifact-root ./mlflow-artifacts \
  --host 0.0.0.0 \
  --port 5000

# Start MLOps service
cd services/mlops
MLFLOW_TRACKING_URI=http://localhost:5000 \
  uvicorn src.main:app --reload
```

#### Step 5.2: Railway Testing
```bash
# Check MLflow tracking server
curl https://mlflow-tracking-production.up.railway.app/health

# Check MLOps service
curl https://mlops-production-3b39.up.railway.app/health

# Test prediction
curl -X POST https://mlops-production-3b39.up.railway.app/ml/predict-rul \
  -H "Content-Type: application/json" \
  -d @test_data.json
```

### Phase 6: Monitoring and Optimization (Week 3-4)

#### Step 6.1: Add MLflow Metrics Logging

Update prediction endpoints to log to MLflow:
```python
with mlflow.start_run():
    mlflow.log_param("battery_system_id", battery_id)
    mlflow.log_metric("predicted_rul", rul_value)
    mlflow.log_metric("confidence", confidence)
    mlflow.log_metric("inference_latency_ms", latency)
```

#### Step 6.2: Model Performance Monitoring

Track model drift and performance:
- Prediction distribution
- Inference latency
- Error rates
- Model version usage

## Railway Environment Variables Summary

### MLflow Tracking Server Service
```
PORT=5000
POSTGRES_HOST=<from-railway-postgres>
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<from-railway-postgres>
POSTGRES_DB=mlflow_db
```

### MLOps Service
```
# Existing
ENVIRONMENT=production
LOG_LEVEL=INFO
PORT=8000

# New for MLflow
MLFLOW_TRACKING_URI=http://mlflow-tracking.railway.internal:5000
MLFLOW_MODEL_NAME=rul_predictor
MLFLOW_MODEL_STAGE=Production
MLFLOW_EXPERIMENT_NAME=rul_prediction

# Optional
MLFLOW_S3_ENDPOINT_URL=<if-using-s3>
AWS_ACCESS_KEY_ID=<if-using-s3>
AWS_SECRET_ACCESS_KEY=<if-using-s3>
```

## Migration Checklist

### Pre-Migration
- [ ] Backup current MLOps service configuration
- [ ] Document current model artifacts location
- [ ] Test current MLOps service locally
- [ ] Verify Railway PostgreSQL database availability

### Phase 1: MLflow Setup
- [ ] Create MLflow tracking server directory structure
- [ ] Create Dockerfile for MLflow tracking
- [ ] Deploy MLflow tracking server to Railway
- [ ] Configure PostgreSQL backend
- [ ] Test MLflow UI accessibility
- [ ] Configure artifact store (volume or S3)

### Phase 2: Code Integration
- [ ] Update requirements.txt with mlflow
- [ ] Create mlflow_integration module
- [ ] Implement MLflowClient wrapper
- [ ] Implement MLflowModelLoader
- [ ] Update config.py with MLflow settings
- [ ] Update RUL service to use MLflow
- [ ] Test locally with MLflow tracking

### Phase 3: Model Migration
- [ ] Export current model artifacts
- [ ] Create model registration script
- [ ] Register model to MLflow registry
- [ ] Transition model to Production stage
- [ ] Verify model loading from MLflow
- [ ] Test predictions with MLflow model

### Phase 4: Deployment
- [ ] Update MLOps Dockerfile
- [ ] Configure Railway environment variables
- [ ] Deploy updated MLOps service
- [ ] Verify service connectivity to MLflow
- [ ] Test health endpoints
- [ ] Test prediction endpoints

### Phase 5: Validation
- [ ] Load testing with MLflow integration
- [ ] Compare prediction results (old vs new)
- [ ] Verify latency metrics
- [ ] Check MLflow UI for logged runs
- [ ] Test model versioning workflow
- [ ] Test model stage transitions

### Phase 6: Documentation
- [ ] Update API documentation
- [ ] Create model deployment guide
- [ ] Document MLflow workflows
- [ ] Create troubleshooting guide
- [ ] Update Railway deployment docs

## Benefits of MLflow Integration

### 1. Model Management
- Centralized model registry
- Version control for models
- Stage-based deployment (Staging → Production)
- Model lineage tracking

### 2. Experiment Tracking
- Parameter logging
- Metrics logging
- Artifact storage
- Run comparison

### 3. Model Serving
- Standardized model format
- Built-in REST API
- Model signatures
- Input validation

### 4. Collaboration
- Team-wide model visibility
- Experiment sharing
- Model approval workflows
- Audit trail

### 5. Production Operations
- A/B testing support
- Canary deployments
- Model rollback capability
- Performance monitoring

## Potential Challenges and Solutions

### Challenge 1: Model Loading Latency
**Issue**: First request after deployment loads model
**Solution**: Implement model warming during startup

### Challenge 2: MLflow Tracking Server Downtime
**Issue**: Service unavailable if tracking server is down
**Solution**: Implement fallback to cached model, retry logic

### Challenge 3: Network Latency
**Issue**: Cross-service calls add latency
**Solution**: Use Railway internal networking, implement model caching

### Challenge 4: Storage Costs
**Issue**: Artifact storage can grow large
**Solution**: Implement artifact cleanup policies, use compression

### Challenge 5: Database Load
**Issue**: Many runs can strain PostgreSQL
**Solution**: Use dedicated database, implement connection pooling

## Cost Considerations

### Railway Resources
- MLflow Tracking Server: ~$5-10/month (single instance)
- PostgreSQL Database: Included in existing service
- MLOps Service: No additional cost
- Artifact Storage: Depends on volume size or S3 usage

### Optimization Recommendations
1. Use Railway volumes for artifact storage (cheaper than S3 for small scale)
2. Implement artifact retention policies
3. Share PostgreSQL database with proper schema isolation
4. Use Railway's internal networking (no egress costs)

## Timeline

- **Week 1**: MLflow tracking server setup and deployment
- **Week 2**: Code integration and model migration
- **Week 3**: Testing and validation
- **Week 4**: Production deployment and monitoring

**Total Estimated Time**: 3-4 weeks

## Next Steps

1. Review and approve this migration plan
2. Schedule Phase 1 implementation
3. Set up development/staging environment for testing
4. Begin MLflow tracking server deployment

## References

- [MLflow Documentation](https://mlflow.org/docs/latest/index.html)
- [MLflow Model Registry](https://mlflow.org/docs/latest/model-registry.html)
- [Railway Documentation](https://docs.railway.app)
- [MLflow on Railway Guide](https://blog.railway.app/p/mlflow-deployment)