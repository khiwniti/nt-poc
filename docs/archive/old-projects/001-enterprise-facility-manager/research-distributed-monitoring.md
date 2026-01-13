# Distributed Performance Monitoring Strategy

**Feature**: Enterprise-grade observability for microservices architecture
**Created**: 2026-01-08
**Status**: Research Complete
**Builds On**: R5 (Performance Monitoring Tools) from research.md

This document extends the existing Sentry monitoring foundation to cover distributed tracing, backend monitoring, and MLOps observability across 5 microservices.

---

## Architecture Overview

### Microservices Topology

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Frontend  │────▶│   Backend   │────▶│   MLOps     │
│   (React)   │◀────│  (FastAPI)  │◀────│  (Python)   │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                    │
       │                   │                    │
       ▼                   ▼                    ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Sentry    │     │  PostgreSQL │     │ LINE API    │
│  Frontend   │     │   Database  │     │  Gemini API │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                    │
       └───────────────────┴────────────────────┘
                           │
                    ┌──────▼──────┐
                    │   Sentry    │
                    │  Distributed│
                    │   Tracing   │
                    └─────────────┘
```

### Monitoring Requirements

| Service | Error Tracking | APM | Tracing | Custom Metrics |
|---------|---------------|-----|---------|----------------|
| Frontend (React) | ✅ Sentry | ✅ Web Vitals | ✅ Browser SDK | 3D FPS, SSE health |
| Backend (FastAPI) | ✅ Sentry | ✅ Transactions | ✅ Python SDK | API latency, DB queries |
| MLOps (Python) | ✅ Sentry | ✅ Transactions | ✅ Python SDK | Inference latency, accuracy |
| Database | ⚠️ Query logs | ✅ Slow queries | ✅ Connection pool | Query performance |
| External APIs | ⚠️ HTTP errors | ✅ API latency | ✅ External spans | Success rate |

---

## 1. Distributed Tracing Architecture

### What is Distributed Tracing?

Distributed tracing tracks a single user request as it flows through multiple services, creating a unified view of the entire transaction lifecycle.

**Example Flow**:
```
User clicks "Predict RUL" button
  │
  ├─ Frontend: Click handler (5ms)
  │   └─ Trace ID: abc123
  │
  ├─ Frontend: API call (10ms)
  │   └─ Propagate trace ID: abc123
  │
  ├─ Backend: /api/predict endpoint (50ms)
  │   ├─ Receive trace ID: abc123
  │   ├─ Database query (25ms)
  │   └─ Call MLOps service (20ms)
  │       └─ Propagate trace ID: abc123
  │
  └─ MLOps: /predict endpoint (300ms)
      ├─ Receive trace ID: abc123
      ├─ Load model (50ms)
      ├─ Run inference (200ms)
      └─ Return prediction (50ms)

Total: 385ms (visualized as single trace in Sentry)
```

### Sentry Distributed Tracing Implementation

Sentry provides native distributed tracing through its Performance Monitoring feature, which uses OpenTelemetry-compatible trace propagation under the hood.

#### Frontend: React + Sentry Browser SDK

**Installation**:
```bash
npm install @sentry/react @sentry/tracing
```

**Configuration** (`src/main.tsx`):
```typescript
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "https://your-dsn@sentry.io/project-id",
  environment: process.env.NODE_ENV,
  release: `facility-manager@${process.env.VITE_APP_VERSION}`,

  // Enable Performance Monitoring
  integrations: [
    new Sentry.BrowserTracing({
      // Trace all HTTP requests
      tracePropagationTargets: [
        "localhost",
        /^https:\/\/api\.yourapp\.com/,
      ],

      // Track React Router navigation
      routingInstrumentation: Sentry.reactRouterV6Instrumentation(
        React.useEffect,
        useLocation,
        useNavigationType,
        createRoutesFromChildren,
        matchRoutes
      ),
    }),

    // Replay errors (session recording)
    new Sentry.Replay({
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],

  // Sample 10% of transactions for performance
  tracesSampleRate: 0.1,

  // Sample 10% of sessions for replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0, // 100% of error sessions
});
```

**Automatic Trace Propagation**:
```typescript
// Sentry automatically adds `sentry-trace` and `baggage` headers
const response = await fetch('/api/facilities/123/predict', {
  method: 'POST',
  body: JSON.stringify({ sensorData })
});
// Headers added:
// sentry-trace: abc123-def456-1
// baggage: sentry-environment=production,sentry-release=1.0.0
```

**Custom Spans for 3D Rendering**:
```typescript
function Scene({ zones }) {
  useFrame(() => {
    const transaction = Sentry.getCurrentHub().getScope()?.getTransaction();
    if (!transaction) return;

    const span = transaction.startChild({
      op: '3d.render',
      description: 'Update InstancedMesh colors'
    });

    // Update zone colors
    updateInstancedMeshColors(zones);

    span.finish();
  });
}
```

#### Backend: FastAPI + Sentry Python SDK

**Installation**:
```bash
pip install sentry-sdk[fastapi]
```

**Configuration** (`main.py`):
```python
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.starlette import StarletteIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

sentry_sdk.init(
    dsn="https://your-dsn@sentry.io/project-id",
    environment=os.getenv("ENVIRONMENT", "production"),
    release=f"facility-backend@{__version__}",

    # Enable Performance Monitoring
    integrations=[
        FastApiIntegration(transaction_style="endpoint"),
        StarletteIntegration(),
        SqlalchemyIntegration(),  # Track database queries
    ],

    # Sample 10% of transactions
    traces_sample_rate=0.1,

    # Track performance for specific operations
    profiles_sample_rate=0.1,
)

app = FastAPI()

# Automatic tracing for all endpoints
@app.post("/api/facilities/{facility_id}/predict")
async def predict_rul(facility_id: str, sensor_data: SensorData):
    # Sentry automatically creates transaction and spans

    # Custom span for database query
    with sentry_sdk.start_span(op="db.query", description="Fetch facility"):
        facility = await db.query(Facility).filter_by(id=facility_id).first()

    # Custom span for MLOps service call
    with sentry_sdk.start_span(op="http.client", description="Call MLOps /predict"):
        prediction = await mlops_client.predict(sensor_data)

    return {"rul_days": prediction.rul_days}
```

**Trace Propagation to MLOps Service**:
```python
import httpx

async def call_mlops_service(sensor_data: dict):
    # Sentry automatically propagates trace headers
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://mlops-service.railway.app/predict",
            json=sensor_data,
            # Sentry SDK adds these automatically:
            # headers={
            #     "sentry-trace": "abc123-def456-1",
            #     "baggage": "sentry-environment=production"
            # }
        )
    return response.json()
```

#### MLOps Service: Python + Sentry

**Configuration** (`mlops/main.py`):
```python
import sentry_sdk

sentry_sdk.init(
    dsn="https://your-dsn@sentry.io/mlops-project-id",
    environment=os.getenv("ENVIRONMENT", "production"),
    release=f"facility-mlops@{__version__}",

    integrations=[
        FastApiIntegration(),
    ],

    traces_sample_rate=0.1,
)

@app.post("/predict")
async def predict_rul(sensor_data: SensorData):
    # Automatically continues trace from backend service

    # Custom span for model inference
    with sentry_sdk.start_span(op="ml.inference", description="RUL prediction"):
        with sentry_sdk.start_span(op="ml.load_model", description="Load model"):
            model = load_model("rul_predictor_v2")

        with sentry_sdk.start_span(op="ml.preprocess", description="Preprocess data"):
            features = preprocess_sensor_data(sensor_data)

        with sentry_sdk.start_span(op="ml.predict", description="Run inference"):
            prediction = model.predict(features)

        # Track custom metrics
        sentry_sdk.set_measurement("inference_latency_ms", inference_time_ms)
        sentry_sdk.set_measurement("confidence_score", confidence)

    return {"rul_days": prediction[0], "confidence": confidence}
```

### Trace Visualization in Sentry

When a user triggers a prediction, Sentry shows:

```
Trace ID: abc123 (Total: 385ms)
│
├─ Frontend: Button click (5ms)
├─ Frontend: API request (10ms)
├─ Backend: POST /api/facilities/123/predict (50ms)
│   ├─ DB Query: Fetch facility (25ms)
│   └─ HTTP Client: Call MLOps /predict (20ms)
│
└─ MLOps: POST /predict (300ms)
    ├─ Load model (50ms)
    ├─ Preprocess data (30ms)
    └─ Run inference (200ms)
```

**Key Insights**:
- Bottleneck: ML inference (200ms) - consider model optimization
- Database query: 25ms - acceptable
- Network latency: 20ms - good
- Total user-perceived latency: 385ms - excellent (target <500ms)

---

## 2. Application Performance Monitoring (APM)

### Backend API Endpoint Monitoring

**Automatic Metrics Tracked by Sentry**:
- Response time (p50, p75, p95, p99)
- Throughput (requests per second)
- Error rate (%)
- Apdex score (Application Performance Index)

**Custom Instrumentation**:
```python
from sentry_sdk import set_measurement

@app.get("/api/facilities/{facility_id}")
async def get_facility(facility_id: str):
    start_time = time.time()

    facility = await db.query(Facility).filter_by(id=facility_id).first()
    db_time = (time.time() - start_time) * 1000

    # Track database query time
    set_measurement("db_query_time_ms", db_time)

    # Track cache hit/miss
    cache_hit = cache.get(f"facility:{facility_id}") is not None
    set_measurement("cache_hit", 1 if cache_hit else 0)

    return facility
```

### Database Query Performance

**Slow Query Detection** (Sentry + SQLAlchemy):
```python
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

sentry_sdk.init(
    integrations=[
        SqlalchemyIntegration(),
    ],
)

# Sentry automatically tracks:
# - Query execution time
# - Query text (with parameter sanitization)
# - Connection pool stats
```

**Custom Query Monitoring**:
```python
@app.get("/api/alerts")
async def get_alerts(skip: int = 0, limit: int = 100):
    with sentry_sdk.start_span(op="db.query", description="Fetch alerts with pagination"):
        query_start = time.time()

        alerts = await db.query(Alert)\
            .offset(skip)\
            .limit(limit)\
            .all()

        query_time = (time.time() - query_start) * 1000

        # Alert if query is slow
        if query_time > 100:
            sentry_sdk.capture_message(
                f"Slow query: /api/alerts took {query_time}ms",
                level="warning"
            )

        set_measurement("alert_query_time_ms", query_time)

    return alerts
```

### SSE Connection Monitoring

**Track Active Connections**:
```python
active_sse_connections = 0

@app.get("/api/facilities/{facility_id}/stream")
async def stream_facility_metrics(facility_id: str):
    global active_sse_connections
    active_sse_connections += 1

    # Report to Sentry
    sentry_sdk.set_measurement("active_sse_connections", active_sse_connections)

    try:
        async def event_generator():
            while True:
                metrics = await get_facility_metrics(facility_id)
                yield f"data: {json.dumps(metrics)}\n\n"
                await asyncio.sleep(2)

        return StreamingResponse(event_generator(), media_type="text/event-stream")

    finally:
        active_sse_connections -= 1
```

**Track Disconnect Rate**:
```python
sse_connections_started = 0
sse_connections_closed = 0

@app.get("/api/facilities/{facility_id}/stream")
async def stream_facility_metrics(facility_id: str):
    global sse_connections_started, sse_connections_closed
    sse_connections_started += 1

    try:
        # ... streaming logic ...
    except asyncio.CancelledError:
        sse_connections_closed += 1
        disconnect_rate = (sse_connections_closed / sse_connections_started) * 100

        sentry_sdk.set_measurement("sse_disconnect_rate", disconnect_rate)

        if disconnect_rate > 10:  # Alert if >10% disconnect rate
            sentry_sdk.capture_message(
                f"High SSE disconnect rate: {disconnect_rate}%",
                level="warning"
            )
```

### External API Monitoring

**LINE API Health**:
```python
async def send_line_notification(message: str):
    with sentry_sdk.start_span(op="http.client", description="LINE Notify API"):
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://notify-api.line.me/api/notify",
                    headers={"Authorization": f"Bearer {LINE_TOKEN}"},
                    data={"message": message},
                    timeout=5.0
                )

            # Track success rate
            sentry_sdk.set_measurement("line_api_success", 1)

            return response.json()

        except httpx.TimeoutException:
            sentry_sdk.set_measurement("line_api_success", 0)
            sentry_sdk.capture_exception()
            raise
```

**Gemini API Latency**:
```python
async def generate_ai_response(prompt: str):
    with sentry_sdk.start_span(op="http.client", description="Gemini API"):
        start_time = time.time()

        response = await gemini_client.generate_content(prompt)

        latency_ms = (time.time() - start_time) * 1000
        sentry_sdk.set_measurement("gemini_api_latency_ms", latency_ms)

        # Alert if slow
        if latency_ms > 5000:
            sentry_sdk.capture_message(
                f"Slow Gemini API: {latency_ms}ms",
                level="warning"
            )

        return response
```

---

## 3. Frontend Monitoring (Enhanced)

### Web Vitals Tracking

**Real User Monitoring (RUM)**:
```typescript
import { onCLS, onFID, onLCP, onINP, onTTFB } from 'web-vitals';
import * as Sentry from '@sentry/react';

function reportWebVitals() {
  const sendToSentry = (metric) => {
    // Send to Sentry as measurement
    Sentry.getCurrentHub().getScope()?.setMeasurement(
      metric.name,
      metric.value,
      metric.unit
    );

    // Also send as event for alerting
    if (metric.rating === 'poor') {
      Sentry.captureMessage(
        `Poor ${metric.name}: ${metric.value}${metric.unit}`,
        {
          level: 'warning',
          tags: {
            metric_name: metric.name,
            metric_rating: metric.rating
          }
        }
      );
    }
  };

  onCLS(sendToSentry);  // Cumulative Layout Shift
  onFID(sendToSentry);  // First Input Delay (deprecated)
  onLCP(sendToSentry);  // Largest Contentful Paint
  onINP(sendToSentry);  // Interaction to Next Paint (replaces FID)
  onTTFB(sendToSentry); // Time to First Byte
}

// Call in main.tsx
reportWebVitals();
```

**Target Thresholds**:
| Metric | Good | Needs Improvement | Poor | Alert Threshold |
|--------|------|-------------------|------|-----------------|
| LCP | ≤2.5s | 2.5s-4s | >4s | >3s |
| INP | ≤200ms | 200ms-500ms | >500ms | >400ms |
| CLS | ≤0.1 | 0.1-0.25 | >0.25 | >0.2 |
| TTFB | ≤800ms | 800ms-1800ms | >1800ms | >1500ms |

### 3D Rendering Performance

**FPS Tracking**:
```typescript
import { useFrame } from '@react-three/fiber';
import * as Sentry from '@sentry/react';

function PerformanceMonitor() {
  const fpsHistory = useRef<number[]>([]);
  const lastTime = useRef(performance.now());

  useFrame(() => {
    const now = performance.now();
    const delta = now - lastTime.current;
    const fps = 1000 / delta;

    fpsHistory.current.push(fps);

    // Report every 5 seconds
    if (fpsHistory.current.length >= 300) { // 60 FPS × 5s
      const avgFps = fpsHistory.current.reduce((a, b) => a + b) / fpsHistory.current.length;

      Sentry.getCurrentHub().getScope()?.setMeasurement('avg_fps', avgFps);

      // Alert if below 30 FPS
      if (avgFps < 30) {
        Sentry.captureMessage(
          `Low 3D performance: ${avgFps.toFixed(1)} FPS`,
          { level: 'warning' }
        );
      }

      fpsHistory.current = [];
    }

    lastTime.current = now;
  });

  return null;
}

// Add to Scene
<Canvas>
  <PerformanceMonitor />
  <Scene />
</Canvas>
```

### IndexedDB Performance

**Operation Timing**:
```typescript
async function saveAlerts(alerts: Alert[]) {
  const transaction = Sentry.startTransaction({
    op: 'db.indexeddb',
    name: 'Save alerts to IndexedDB'
  });

  const span = transaction.startChild({
    op: 'db.put',
    description: `Save ${alerts.length} alerts`
  });

  try {
    await db.alerts.bulkPut(alerts);

    span.setData('alert_count', alerts.length);
    span.setStatus('ok');
  } catch (error) {
    span.setStatus('internal_error');
    Sentry.captureException(error);
  } finally {
    span.finish();
    transaction.finish();
  }
}
```

### SSE Connection Health

**Client-Side Monitoring**:
```typescript
function useEventSource(url: string) {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const reconnectCount = useRef(0);
  const connectionStartTime = useRef(Date.now());

  useEffect(() => {
    const eventSource = new EventSource(url);

    eventSource.onopen = () => {
      setStatus('connected');

      const connectionTime = Date.now() - connectionStartTime.current;
      Sentry.getCurrentHub().getScope()?.setMeasurement(
        'sse_connection_time_ms',
        connectionTime
      );

      // Reset reconnect count on successful connection
      if (reconnectCount.current > 0) {
        Sentry.captureMessage(
          `SSE reconnected after ${reconnectCount.current} attempts`,
          { level: 'info' }
        );
        reconnectCount.current = 0;
      }
    };

    eventSource.onerror = () => {
      setStatus('error');
      reconnectCount.current++;

      // Alert if multiple reconnect failures
      if (reconnectCount.current > 5) {
        Sentry.captureMessage(
          `SSE connection failed ${reconnectCount.current} times`,
          { level: 'error' }
        );
      }
    };

    return () => {
      eventSource.close();
    };
  }, [url]);

  return { status };
}
```

---

## 4. ML Model Monitoring

### Prediction Accuracy Tracking

**Store Predictions for Validation**:
```python
@app.post("/predict")
async def predict_rul(sensor_data: SensorData):
    prediction = model.predict(features)
    confidence = model.predict_proba(features).max()

    # Store prediction for future validation
    await db.execute(
        """
        INSERT INTO predictions (
            facility_id, predicted_rul, confidence,
            sensor_data, created_at
        ) VALUES ($1, $2, $3, $4, NOW())
        """,
        sensor_data.facility_id, prediction[0], confidence,
        json.dumps(sensor_data.dict())
    )

    # Track prediction metrics
    sentry_sdk.set_measurement("prediction_confidence", confidence)
    sentry_sdk.set_measurement("predicted_rul_days", prediction[0])

    # Alert if low confidence
    if confidence < 0.7:
        sentry_sdk.capture_message(
            f"Low confidence prediction: {confidence:.2%}",
            level="warning"
        )

    return {"rul_days": prediction[0], "confidence": confidence}
```

**Validation Against Actual Outcomes**:
```python
async def validate_predictions():
    """Run daily to check prediction accuracy"""

    # Get predictions from 30 days ago
    predictions = await db.fetch_all(
        """
        SELECT * FROM predictions
        WHERE created_at BETWEEN NOW() - INTERVAL '31 days'
                              AND NOW() - INTERVAL '30 days'
        """
    )

    errors = []
    for pred in predictions:
        actual_rul = await get_actual_rul(pred['facility_id'], pred['created_at'])
        if actual_rul is not None:
            error = abs(pred['predicted_rul'] - actual_rul)
            errors.append(error)

    if errors:
        mae = sum(errors) / len(errors)
        mape = sum(e / a for e, a in zip(errors, actuals)) / len(errors) * 100

        # Track accuracy metrics
        sentry_sdk.set_measurement("model_mae_days", mae)
        sentry_sdk.set_measurement("model_mape_percent", mape)

        # Alert if accuracy degrades
        if mae > 5.0:  # Threshold: 5 days error
            sentry_sdk.capture_message(
                f"Model accuracy degraded: MAE={mae:.1f} days",
                level="error"
            )
```

### Inference Latency Distribution

**Track Latency Percentiles**:
```python
from collections import deque
import statistics

latency_window = deque(maxlen=1000)  # Rolling window of last 1000 predictions

@app.post("/predict")
async def predict_rul(sensor_data: SensorData):
    start_time = time.time()

    prediction = model.predict(features)

    latency_ms = (time.time() - start_time) * 1000
    latency_window.append(latency_ms)

    # Calculate percentiles
    if len(latency_window) >= 100:
        sorted_latencies = sorted(latency_window)
        p50 = statistics.median(sorted_latencies)
        p95 = sorted_latencies[int(len(sorted_latencies) * 0.95)]
        p99 = sorted_latencies[int(len(sorted_latencies) * 0.99)]

        sentry_sdk.set_measurement("inference_latency_p50", p50)
        sentry_sdk.set_measurement("inference_latency_p95", p95)
        sentry_sdk.set_measurement("inference_latency_p99", p99)

        # Alert if p95 exceeds threshold
        if p95 > 500:  # Target: <500ms
            sentry_sdk.capture_message(
                f"Slow inference: p95={p95:.0f}ms",
                level="warning"
            )
```

### Model Drift Detection

**Feature Distribution Monitoring**:
```python
import numpy as np
from scipy.stats import ks_2samp

# Store baseline feature distribution during training
baseline_features = load_baseline_features()

@app.post("/predict")
async def predict_rul(sensor_data: SensorData):
    features = preprocess_sensor_data(sensor_data)

    # Check for feature drift
    drift_scores = []
    for i, (baseline_col, current_val) in enumerate(zip(baseline_features.T, features)):
        # Kolmogorov-Smirnov test
        statistic, p_value = ks_2samp(baseline_col, [current_val])
        drift_scores.append(statistic)

    max_drift = max(drift_scores)
    sentry_sdk.set_measurement("feature_drift_score", max_drift)

    # Alert if significant drift detected
    if max_drift > 0.3:  # Threshold for drift
        sentry_sdk.capture_message(
            f"Feature drift detected: {max_drift:.2f}",
            level="warning",
            extra={"drift_scores": drift_scores}
        )

    prediction = model.predict(features)
    return {"rul_days": prediction[0]}
```

**Concept Drift Detection**:
```python
async def detect_concept_drift():
    """Run weekly to detect concept drift"""

    # Get recent predictions vs actual outcomes
    recent_accuracy = await calculate_recent_accuracy(days=7)
    historical_accuracy = await calculate_historical_accuracy(days=30)

    accuracy_drop = historical_accuracy - recent_accuracy

    sentry_sdk.set_measurement("accuracy_drop_percent", accuracy_drop * 100)

    # Alert if accuracy drops significantly
    if accuracy_drop > 0.1:  # 10% drop
        sentry_sdk.capture_message(
            f"Concept drift detected: accuracy dropped by {accuracy_drop:.1%}",
            level="error"
        )
```

### Model Version Tracking

**Release Tracking**:
```python
MODEL_VERSION = "v2.1.0"

sentry_sdk.init(
    release=f"rul-predictor@{MODEL_VERSION}",
)

@app.post("/predict")
async def predict_rul(sensor_data: SensorData):
    # Tag predictions with model version
    sentry_sdk.set_tag("model_version", MODEL_VERSION)

    prediction = model.predict(features)
    return {"rul_days": prediction[0], "model_version": MODEL_VERSION}
```

---

## 5. Service Health Monitoring

### Health Check Endpoints

**Backend Health Check**:
```python
@app.get("/health")
async def health_check():
    health_status = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "checks": {}
    }

    # Database health
    try:
        await db.execute("SELECT 1")
        health_status["checks"]["database"] = "healthy"
    except Exception as e:
        health_status["status"] = "unhealthy"
        health_status["checks"]["database"] = f"unhealthy: {str(e)}"
        sentry_sdk.capture_exception(e)

    # MLOps service health
    try:
        response = await httpx.get(
            "https://mlops-service.railway.app/health",
            timeout=2.0
        )
        if response.status_code == 200:
            health_status["checks"]["mlops"] = "healthy"
        else:
            health_status["status"] = "degraded"
            health_status["checks"]["mlops"] = f"degraded: {response.status_code}"
    except Exception as e:
        health_status["status"] = "degraded"
        health_status["checks"]["mlops"] = f"unhealthy: {str(e)}"
        sentry_sdk.capture_exception(e)

    # External API health
    health_status["checks"]["line_api"] = await check_line_api_health()
    health_status["checks"]["gemini_api"] = await check_gemini_api_health()

    # Set HTTP status based on health
    status_code = 200 if health_status["status"] == "healthy" else 503

    return JSONResponse(content=health_status, status_code=status_code)

@app.get("/ready")
async def readiness_check():
    """Kubernetes readiness probe"""
    # Check if service is ready to accept traffic
    if not model_loaded:
        return JSONResponse(
            content={"ready": False, "reason": "Model not loaded"},
            status_code=503
        )

    return {"ready": True}
```

**MLOps Health Check**:
```python
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "model_loaded": model is not None,
        "model_version": MODEL_VERSION,
        "uptime_seconds": time.time() - start_time
    }
```

### Railway Service Monitoring

**Integration with Railway Events**:
```python
import httpx

async def send_deployment_event_to_sentry():
    """Called during Railway deployment"""
    sentry_sdk.api.create_deploy(
        organization="your-org",
        version=os.getenv("RAILWAY_GIT_COMMIT_SHA"),
        environment=os.getenv("RAILWAY_ENVIRONMENT"),
        projects=["facility-backend", "facility-mlops"]
    )
```

### Database Connection Pool Health

**Monitor Connection Pool**:
```python
from sqlalchemy import event
from sqlalchemy.pool import Pool

@event.listens_for(Pool, "connect")
def receive_connect(dbapi_conn, connection_record):
    sentry_sdk.set_measurement("db_connections_active", pool.size())

@event.listens_for(Pool, "checkout")
def receive_checkout(dbapi_conn, connection_record, connection_proxy):
    # Track connection checkout time
    connection_record.checkout_time = time.time()

@event.listens_for(Pool, "checkin")
def receive_checkin(dbapi_conn, connection_record):
    # Track connection hold time
    if hasattr(connection_record, 'checkout_time'):
        hold_time = (time.time() - connection_record.checkout_time) * 1000
        sentry_sdk.set_measurement("db_connection_hold_time_ms", hold_time)

        if hold_time > 5000:  # Alert if held >5s
            sentry_sdk.capture_message(
                f"Long DB connection hold: {hold_time:.0f}ms",
                level="warning"
            )
```

### Alert Rules and Thresholds

**Sentry Alert Configuration**:

| Alert Type | Condition | Threshold | Action |
|------------|-----------|-----------|--------|
| Service Down | Health check fails | 2 consecutive failures | PagerDuty page |
| High Error Rate | Error rate > 5% | 100 errors in 5 min | Slack alert |
| Slow Response | p95 latency > 500ms | Sustained 5 min | Slack warning |
| Database Slow | Query > 1s | 10 queries in 5 min | Slack warning |
| MLOps Latency | Inference > 500ms | p95 for 5 min | Slack warning |
| SSE Disconnect | Disconnect rate > 20% | Sustained 5 min | Investigate |
| Low Confidence | Prediction confidence < 70% | 50 predictions | Model review |
| Model Drift | Drift score > 0.3 | Single detection | Model retrain |

**Sentry Alert Rules** (YAML configuration):
```yaml
# .sentry/alerts.yml
alerts:
  - name: "High Error Rate"
    conditions:
      - filter: "event.type == 'error'"
        aggregation: "count()"
        time_window: "5m"
        threshold: 100
    actions:
      - type: "slack"
        channel: "#alerts"
      - type: "pagerduty"
        service: "facility-backend"

  - name: "Slow API Response"
    conditions:
      - filter: "transaction.op == 'http.server'"
        aggregation: "percentile(transaction.duration, 0.95)"
        time_window: "5m"
        threshold: 500  # ms
    actions:
      - type: "slack"
        channel: "#performance"

  - name: "Model Accuracy Degradation"
    conditions:
      - filter: "message.value contains 'accuracy degraded'"
        aggregation: "count()"
        time_window: "1d"
        threshold: 1
    actions:
      - type: "email"
        recipients: ["ml-team@company.com"]
      - type: "slack"
        channel: "#ml-ops"
```

### Uptime SLA Tracking

**Calculate Uptime**:
```python
import asyncio
from datetime import datetime, timedelta

async def calculate_uptime():
    """Run hourly to track uptime"""

    # Query health check logs from last hour
    health_checks = await db.fetch_all(
        """
        SELECT status, timestamp
        FROM health_checks
        WHERE timestamp > NOW() - INTERVAL '1 hour'
        """
    )

    total_checks = len(health_checks)
    successful_checks = sum(1 for check in health_checks if check['status'] == 'healthy')

    uptime_percent = (successful_checks / total_checks) * 100 if total_checks > 0 else 0

    sentry_sdk.set_measurement("uptime_percent_hourly", uptime_percent)

    # Alert if below SLA
    if uptime_percent < 99.9:
        sentry_sdk.capture_message(
            f"SLA breach: {uptime_percent:.2f}% uptime (target: 99.9%)",
            level="error"
        )

    # Store for monthly reporting
    await db.execute(
        """
        INSERT INTO uptime_metrics (timestamp, uptime_percent)
        VALUES (NOW(), $1)
        """,
        uptime_percent
    )
```

**Monthly SLA Report**:
```python
async def generate_monthly_sla_report():
    """Run monthly to generate SLA report"""

    # Get uptime data for last month
    uptime_data = await db.fetch_all(
        """
        SELECT AVG(uptime_percent) as avg_uptime
        FROM uptime_metrics
        WHERE timestamp > NOW() - INTERVAL '30 days'
        """
    )

    avg_uptime = uptime_data[0]['avg_uptime']

    # Calculate downtime
    downtime_minutes = (100 - avg_uptime) / 100 * 30 * 24 * 60

    report = f"""
    Monthly SLA Report
    ------------------
    Period: {datetime.now().strftime('%B %Y')}

    Uptime: {avg_uptime:.3f}%
    Downtime: {downtime_minutes:.1f} minutes
    SLA Target: 99.9% (43.2 minutes/month)
    Status: {'✅ Met' if avg_uptime >= 99.9 else '❌ Missed'}
    """

    sentry_sdk.capture_message(report, level="info")

    return report
```

---

## 6. Cost Analysis and Tool Selection

### Sentry Pricing Calculator

**Error Events**:
```
Expected monthly errors:
- Frontend errors: 50,000 (1 per 200 sessions)
- Backend errors: 20,000 (1 per 500 requests)
- MLOps errors: 10,000 (1 per 1000 inferences)
Total: 80,000 errors/month
```

**Performance Transactions**:
```
Expected monthly transactions:
- Frontend page loads: 200,000 sessions × 5 pages = 1,000,000
- Backend API calls: 10,000,000 requests
- MLOps predictions: 100,000 inferences

With 10% sampling:
- Frontend: 100,000 transactions
- Backend: 1,000,000 transactions
- MLOps: 10,000 transactions
Total: 1,110,000 transactions/month
```

**Sentry Pricing** (Business Plan):
```
Base Plan: $26/month per project
- 3 projects (Frontend, Backend, MLOps) = $78/month

Error Events:
- 80,000 errors × $0.0012/error = $96/month

Performance Transactions:
- 1,110,000 transactions × $0.0004/transaction = $444/month

Replays (10% of error sessions):
- 5,000 replays × $0.05/replay = $250/month

Total: $78 + $96 + $444 + $250 = $868/month
```

**Volume Discount** (Enterprise Plan):
```
For 1000 concurrent users:
- Negotiated rate: $1,500-2,500/month
- Includes all features + dedicated support
```

### Alternative APM Tools Comparison

| Tool | Monthly Cost | Features | Pros | Cons |
|------|-------------|----------|------|------|
| **Sentry** | $1,500-2,500 | Errors, APM, Tracing, Replays | Complete solution, excellent React support | Higher cost |
| **Datadog APM** | $2,000-5,000 | APM, Infrastructure, Logs | Best-in-class, powerful dashboards | Very expensive, overkill |
| **New Relic** | $1,500-3,500 | APM, Browser, Mobile | Mature product, good docs | Complex setup, older UI |
| **Grafana Cloud** | $500-1,500 | Metrics, Logs, Traces | Open-source roots, flexible | Requires more setup |
| **Bugsnag** | $500-1,000 | Errors only | Cheaper, simple | No APM, limited features |
| **Self-Hosted** | $300-500 (infra) | Full control | Cheapest, customizable | High maintenance, no support |

### Recommended Stack

**For $1,500-2,500/month budget**:
```
✅ Sentry (all services)
   - Error tracking
   - Performance monitoring
   - Distributed tracing
   - Session replays

✅ Grafana Cloud (free tier)
   - Custom dashboards
   - Long-term metrics storage
   - ML model metrics

✅ Lighthouse CI (free)
   - Performance budgets
   - CI/CD integration

Total: $1,500-2,500/month
```

### Cost Optimization Strategies

**1. Transaction Sampling**:
```python
def traces_sampler(sampling_context):
    """Dynamic sampling based on transaction type"""

    # Sample 100% of errors
    if sampling_context.get("parent_sampled") is True:
        return 1.0

    # Sample 100% of critical endpoints
    if sampling_context["transaction_context"]["name"] in ["/api/predict", "/api/alerts"]:
        return 1.0

    # Sample 10% of regular traffic
    return 0.1

sentry_sdk.init(
    traces_sampler=traces_sampler
)
```

**2. Error Filtering**:
```python
def before_send(event, hint):
    """Filter out non-actionable errors"""

    # Ignore known third-party errors
    if "chrome-extension://" in event.get("request", {}).get("url", ""):
        return None

    # Ignore network errors (user-side issues)
    if "NetworkError" in str(hint.get("exc_info")):
        return None

    return event

sentry_sdk.init(
    before_send=before_send
)
```

**3. Replay Sampling**:
```python
# Only record replays for error sessions (not all sessions)
replays_session_sample_rate=0.0,  # Don't record normal sessions
replays_on_error_sample_rate=1.0,  # Record 100% of error sessions
```

---

## 7. Implementation Checklist

### Phase 1: Foundation (Week 1)
- [ ] Install Sentry SDKs (Frontend, Backend, MLOps)
- [ ] Configure DSNs and environments
- [ ] Set up error boundaries in React
- [ ] Configure basic error tracking
- [ ] Test error capture end-to-end

### Phase 2: Performance Monitoring (Week 2)
- [ ] Enable Sentry Performance in all services
- [ ] Configure transaction sampling (10%)
- [ ] Add Web Vitals tracking in frontend
- [ ] Set up custom spans for critical operations
- [ ] Test distributed tracing across services

### Phase 3: Custom Metrics (Week 3)
- [ ] Implement 3D FPS tracking
- [ ] Add SSE connection monitoring
- [ ] Track database query performance
- [ ] Monitor external API health (LINE, Gemini)
- [ ] Set up IndexedDB performance tracking

### Phase 4: ML Monitoring (Week 4)
- [ ] Track prediction confidence scores
- [ ] Implement inference latency monitoring
- [ ] Set up model accuracy validation
- [ ] Add feature drift detection
- [ ] Configure model version tracking

### Phase 5: Alerting (Week 5)
- [ ] Configure Slack integration
- [ ] Set up PagerDuty for critical alerts
- [ ] Define alert thresholds
- [ ] Create runbooks for common alerts
- [ ] Test alert routing

### Phase 6: Health Checks (Week 6)
- [ ] Implement /health endpoints (all services)
- [ ] Add /ready endpoints for Kubernetes
- [ ] Configure Railway health checks
- [ ] Set up uptime tracking
- [ ] Create SLA dashboard

### Phase 7: Optimization (Week 7)
- [ ] Implement dynamic transaction sampling
- [ ] Add error filtering rules
- [ ] Optimize replay sampling
- [ ] Review and adjust alert thresholds
- [ ] Document monitoring architecture

---

## 8. Dashboard Examples

### Sentry Performance Dashboard

**Frontend Performance**:
```
+-------------------------------------------+
| Largest Contentful Paint (LCP)            |
| Current: 1.8s | Target: <2.5s | ✅ Good   |
+-------------------------------------------+
| Interaction to Next Paint (INP)           |
| Current: 180ms | Target: <200ms | ✅ Good  |
+-------------------------------------------+
| Cumulative Layout Shift (CLS)             |
| Current: 0.08 | Target: <0.1 | ✅ Good    |
+-------------------------------------------+
| Average FPS (3D Rendering)                |
| Current: 58 FPS | Target: >30 FPS | ✅    |
+-------------------------------------------+
```

**Backend API Performance**:
```
+-------------------------------------------+
| Endpoint: POST /api/facilities/{id}/predict |
| p50: 85ms | p95: 220ms | p99: 450ms       |
| Throughput: 50 req/s | Error rate: 0.2%  |
+-------------------------------------------+
| Endpoint: GET /api/alerts                 |
| p50: 30ms | p95: 75ms | p99: 150ms        |
| Throughput: 200 req/s | Error rate: 0.1%  |
+-------------------------------------------+
| Database Queries                          |
| Avg: 25ms | Slow queries (>100ms): 5/hour |
+-------------------------------------------+
```

**MLOps Service Performance**:
```
+-------------------------------------------+
| ML Inference Latency                      |
| p50: 180ms | p95: 380ms | p99: 520ms     |
| Throughput: 10 predictions/s              |
+-------------------------------------------+
| Model Accuracy (Last 30 Days)             |
| MAE: 2.3 days | MAPE: 4.5% | ✅ Good      |
+-------------------------------------------+
| Confidence Scores                         |
| Avg: 0.85 | Low confidence (<0.7): 12%    |
+-------------------------------------------+
```

### Grafana Dashboard (Custom Metrics)

**Service Health Overview**:
```
+-------------------------------------------+
| Service Uptime (Last 30 Days)             |
| Frontend: 99.97% | Backend: 99.95%        |
| MLOps: 99.93% | Database: 99.99%          |
| SLA Target: 99.9% | ✅ All services met   |
+-------------------------------------------+
| Active SSE Connections                    |
| Current: 487 | Peak (24h): 892            |
| Disconnect rate: 3.2% | ✅ Normal         |
+-------------------------------------------+
| External API Health                       |
| LINE API: ✅ Up (99.8%)                   |
| Gemini API: ✅ Up (99.5%)                 |
+-------------------------------------------+
```

---

## 9. Monitoring Best Practices

### 1. Start with the Basics
- Error tracking first (highest ROI)
- Performance monitoring second
- Custom metrics third
- Don't over-instrument initially

### 2. Focus on User Experience
- Track Web Vitals (user-perceived performance)
- Monitor SSE connection health (real-time updates)
- 3D rendering FPS (visual experience)
- Alert on user-facing issues first

### 3. Distributed Tracing is Key
- Always propagate trace IDs across services
- Use consistent transaction naming
- Add custom spans for business logic
- Visualize request flows for debugging

### 4. ML Monitoring is Critical
- Track prediction accuracy continuously
- Monitor inference latency distribution
- Detect model drift early
- Version all models in production

### 5. Cost Management
- Sample transactions (10% is usually sufficient)
- Filter non-actionable errors
- Use dynamic sampling for critical endpoints
- Review usage monthly

### 6. Alerting Hygiene
- Alert on symptoms, not causes
- Use percentiles (p95, p99) not averages
- Set alert thresholds based on SLA
- Create runbooks for all alerts
- Review and tune alerts regularly

### 7. Observability Culture
- Make dashboards visible to team
- Review metrics in daily standups
- Post-mortem every incident
- Share learnings across teams

---

## 10. Next Steps

### Immediate Actions
1. **Install Sentry SDKs** in all 3 services (2 hours)
2. **Configure distributed tracing** with trace propagation (3 hours)
3. **Set up Web Vitals tracking** in frontend (1 hour)
4. **Add health check endpoints** to all services (2 hours)

### Week 1 Goals
- ✅ All services sending errors to Sentry
- ✅ Distributed tracing working end-to-end
- ✅ Basic performance metrics captured
- ✅ Health checks responding

### Month 1 Goals
- ✅ Full distributed tracing coverage
- ✅ Custom metrics for all critical paths
- ✅ Alerting rules configured and tested
- ✅ ML model monitoring operational

### Success Metrics
- 📊 Error detection: <5 min from occurrence to alert
- 📊 Mean time to resolution (MTTR): <30 min
- 📊 Uptime SLA: >99.9%
- 📊 p95 API latency: <500ms
- 📊 p95 inference latency: <500ms

---

**Research Status**: ✅ Complete
**Integration with R5**: ✅ Extends existing Sentry foundation
**Estimated Setup Time**: 6-8 weeks (parallel with development)
**Estimated Monthly Cost**: $1,500-2,500 (Sentry Enterprise)
