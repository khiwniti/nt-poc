# MLOps Service - Quick Start Guide

**Production Scale**: 1,944 batteries | **Service**: RUL Prediction MLOps

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd services/mlops
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure Environment
```bash
cp .env.example .env

# Edit .env with your settings:
# - BATCH_MAX_SIZE=500          # For production fleet
# - MODEL_CACHE_SIZE=4          # Production cache
# - PREDICTION_BATCH_SIZE=50    # TensorFlow batch size
```

### 3. Place Trained Model
```bash
# Ensure model file exists
ls -lh models/rul_lstm_model.h5

# Or set custom path in .env
RUL_MODEL_PATH=/path/to/your/rul_lstm_model.h5
```

### 4. Start Service
```bash
# Development
uvicorn src.main:app --reload --port 8001

# Production
uvicorn src.main:app --host 0.0.0.0 --port 8001 --workers 2
```

### 5. Verify Health
```bash
curl http://localhost:8001/health

# Should return:
# {
#   "status": "healthy",
#   "model_status": {"loaded": true},
#   "batch_config": {"max_batch_size": 500}
# }
```

---

## 📡 API Endpoints

### Single Prediction
```bash
curl -X POST http://localhost:8001/ml/predict-rul \
  -H "Content-Type: application/json" \
  -d '{
    "battery_system_id": "BAT-CM-R1-001",
    "sequence": [
      [95.0, 98.0, 25.0, 13.2, 150],
      [94.5, 97.8, 25.5, 13.1, 151],
      [94.0, 97.5, 26.0, 13.0, 152]
    ]
  }'

# Response:
# {
#   "predicted_rul": 285.3,
#   "confidence": 0.90,
#   "model_version": "v1.0.0"
# }
```

### Batch Prediction (500 batteries)
```bash
curl -X POST http://localhost:8001/ml/predict-rul/batch \
  -H "Content-Type: application/json" \
  -d '{
    "sequences": [...500 sequences...],
    "battery_system_ids": ["BAT-001", "BAT-002", ...]
  }'

# Response:
# {
#   "predicted_rul": [285.3, 320.1, ...],
#   "confidence": [0.90, 0.90, ...],
#   "battery_system_ids": ["BAT-001", "BAT-002", ...]
# }
```

### Model Info
```bash
curl http://localhost:8001/ml/model-info

# Response:
# {
#   "model_version": "v1.0.0",
#   "model_type": "LSTM",
#   "sequence_length": 10,
#   "n_features": 5,
#   "feature_names": ["soc", "soh", "temperature", "voltage", "cycles"]
# }
```

---

## ⚙️ Configuration Quick Reference

| Variable | Default | Range | Purpose |
|----------|---------|-------|---------|
| `BATCH_MAX_SIZE` | 500 | 10-2000 | Max batteries per batch request |
| `BATCH_PARALLEL_WORKERS` | 10 | 1-50 | Concurrent workers (future) |
| `MODEL_CACHE_SIZE` | 4 | 1-10 | Models cached in memory |
| `PREDICTION_BATCH_SIZE` | 50 | 10-200 | TensorFlow internal batch |
| `FEATURE_WINDOW_SIZE` | 10 | 5-50 | Sequence length (time steps) |

---

## 🧪 Testing

### Unit Tests
```bash
pytest src/ -v --cov=src
```

### Integration Test
```bash
# Test with real model
python -c "
from src.api.rul_service import get_prediction_service
import numpy as np

service = get_prediction_service()
sequences = np.random.rand(100, 10, 5)
predictions = service.predict_batch(sequences)
print(f'Predicted {len(predictions)} batteries successfully')
"
```

### Load Test
```bash
# Install hey
go install github.com/rakyll/hey@latest

# Test batch endpoint
hey -n 100 -c 10 -m POST \
  -H "Content-Type: application/json" \
  -D batch_payload.json \
  http://localhost:8001/ml/predict-rul/batch
```

---

## 🐛 Common Issues

### Model Not Loading
```bash
# Check model file
ls -lh models/rul_lstm_model.h5

# Check permissions
chmod 644 models/rul_lstm_model.h5

# Check logs
uvicorn src.main:app --log-level debug
```

### Slow Predictions
```bash
# Increase TensorFlow batch size
PREDICTION_BATCH_SIZE=100

# Check system resources
htop  # Monitor CPU
nvidia-smi  # Monitor GPU (if available)
```

### Out of Memory
```bash
# Reduce cache size
MODEL_CACHE_SIZE=1

# Reduce batch sizes
BATCH_MAX_SIZE=200
PREDICTION_BATCH_SIZE=20
```

---

## 📊 Performance Expectations

| Operation | Expected Latency | Throughput |
|-----------|-----------------|------------|
| Single prediction | <100ms p95 | >10/sec |
| Batch 500 batteries | <5s p95 | >100/sec |
| Full fleet 1,944 | ~20 seconds | ~100/sec |

---

## 🔗 Related Docs

- **Full Optimization Guide**: `MLOPS_PRODUCTION_OPTIMIZATION_SUMMARY.md`
- **Backend Integration**: `BACKEND_API_REQUIREMENTS_FOR_FRONTEND.md`
- **Production Deployment**: `PRODUCTION_FLEET_COMPLETE_SUMMARY.md`

---

**Last Updated**: 2026-01-17  
**Service Version**: 1.0.0  
**Status**: ✅ Production Ready
