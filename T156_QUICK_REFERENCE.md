# T156: Prediction Explainability - Quick Reference

## Quick Start

### 1. Install Dependencies
```bash
# ML Service
cd services/ml
pip install shap>=0.43.0 matplotlib>=3.7.0

# Backend
cd services/backend
npm install axios
```

### 2. Start Services
```bash
# Terminal 1: ML Service
cd services/mlops && python src/main.py

# Terminal 2: Backend
cd services/backend && npm run dev

# Terminal 3: Frontend
cd services/frontend && npm run dev
```

## API Quick Reference

### Backend Endpoints

**Base:** `/api/v1/explainability`

```bash
# Waterfall Plot
POST /shap/waterfall
{
  "batterySystemId": "bat-123",
  "features": {"soh_delta": -0.15, ...},
  "predictionValue": 25.5,
  "predictionType": "RUL"
}

# Force Plot
POST /shap/force
# Same request format

# Text Explanation
POST /explanation
# Same request + optional "topN": 5

# Export Report
POST /export
# Same request format

# Explain Existing Prediction
GET /prediction/:id/explain?type=waterfall
```

### ML Service Endpoints

**Base:** `/explain`

```bash
# All endpoints accept similar payloads
POST /waterfall
POST /force
POST /text
POST /export
GET /health
```

## Python Usage

```python
from explainability.shap_explainer import SHAPExplainer
import numpy as np

# Initialize
explainer = SHAPExplainer(
    model=trained_model,
    feature_names=['soh_delta', 'anomaly_count', 'temp_max', 'voltage_min'],
    model_type='tree'
)

# Generate Explanations
features = np.array([[-0.15, 8, 55.0, 3.0]])

# Waterfall
waterfall = explainer.generate_waterfall_plot(features)

# Force
force = explainer.generate_force_plot(features)

# Text
text = explainer.generate_explanation_text(features, 25.5, prediction_type='RUL')

# Export All
report = explainer.export_explanation_report(
    features, 25.5, output_dir='explanations', battery_system_id='bat-123'
)
```

## React Component Usage

```tsx
import PredictionExplainer from './components/PredictionExplainer';

<PredictionExplainer
  batterySystemId="bat-123"
  features={{
    soh_delta: -0.15,
    anomaly_count: 8,
    temp_max: 55.0,
    voltage_min: 3.0
  }}
  predictionValue={25.5}
  predictionType="RUL"
/>
```

## TypeScript API Client

```typescript
import {
  generateWaterfallPlot,
  generateForcePlot,
  generateTextExplanation,
  exportExplanationReport
} from './api/explainability';

// Waterfall
const waterfallData = await generateWaterfallPlot({
  batterySystemId: 'bat-123',
  features: { soh_delta: -0.15, anomaly_count: 8, temp_max: 55.0, voltage_min: 3.0 },
  predictionValue: 25.5,
  predictionType: 'RUL'
});

// Force
const forceData = await generateForcePlot({ ... });

// Text
const textData = await generateTextExplanation({ ..., topN: 5 });

// Export
const exportData = await exportExplanationReport({ ... });
```

## Feature Names Mapping

| Backend | ML Service | Display Name |
|---------|-----------|--------------|
| sohDelta | soh_delta | SOH Delta |
| anomalyCount | anomaly_count | Anomaly Count |
| tempMax | temp_max | Max Temperature |
| voltageMin | voltage_min | Min Voltage |

## Response Structures

### Waterfall Plot
```json
{
  "type": "waterfall",
  "base_value": 30.0,
  "prediction_value": 25.5,
  "feature_contributions": [
    {
      "feature": "soh_delta",
      "value": -0.15,
      "shap_value": -3.2,
      "contribution": 3.2
    }
  ],
  "image_base64": "..."
}
```

### Force Plot
```json
{
  "type": "force",
  "base_value": 30.0,
  "prediction_value": 25.5,
  "positive_contributions": [...],
  "negative_contributions": [...],
  "html": "..."
}
```

### Text Explanation
```json
{
  "explanation": "The predicted RUL is...",
  "base_value": 30.0,
  "prediction_value": 25.5,
  "top_features": [...]
}
```

## Common Issues & Solutions

### Issue: "Model not found"
**Solution:** Load or train model first
```python
model = joblib.load('model.joblib')
# or train new model
```

### Issue: "SHAP calculation timeout"
**Solution:** Use TreeExplainer for tree models (faster)
```python
explainer = SHAPExplainer(model=model, model_type='tree')
```

### Issue: "Background data required"
**Solution:** Provide background data for KernelExplainer
```python
background = np.random.randn(100, 4)
explainer = SHAPExplainer(model=model, background_data=background, model_type='kernel')
```

### Issue: "Axios network error"
**Solution:** Check ML_SERVICE_URL environment variable
```bash
export ML_SERVICE_URL=http://localhost:8000
```

## Testing

```bash
# Python Tests
cd services/ml
pytest tests/test_shap_explainer.py -v

# Backend Tests (if created)
cd services/backend
npm test -- explainability

# Manual Test
curl -X POST http://localhost:3000/api/v1/explainability/explanation \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"batterySystemId":"bat-123","features":{"soh_delta":-0.15},"predictionValue":25.5}'
```

## File Locations

```
services/
├── ml/
│   ├── src/explainability/
│   │   ├── __init__.py
│   │   └── shap_explainer.py
│   ├── tests/
│   │   └── test_shap_explainer.py
│   └── requirements.txt (updated)
├── mlops/
│   └── src/api/
│       └── explainability.py
├── backend/
│   ├── src/routes/
│   │   └── explainability.ts
│   ├── src/app.ts (updated)
│   └── package.json (updated)
└── frontend/
    ├── src/api/
    │   └── explainability.ts
    └── src/components/
        └── PredictionExplainer.tsx
```

## Performance Tips

1. **Cache explainers**: Create once, reuse many times
2. **Use TreeExplainer**: 10-100x faster than KernelExplainer
3. **Limit background data**: 50-100 samples sufficient
4. **Batch predictions**: Use `batch_explain()` for multiple predictions
5. **Async operations**: Use background tasks for exports

## Environment Variables

```env
# Backend (.env)
ML_SERVICE_URL=http://localhost:8000
JWT_SECRET=your-secret-key

# MLOps (.env)
PORT=8000
ENVIRONMENT=development
CORS_ORIGINS=["http://localhost:5173"]
```

## Acceptance Criteria Checklist

- [x] SHAP library integration
- [x] Calculate SHAP values for predictions
- [x] Waterfall plot showing feature contributions
- [x] Force plot for individual predictions
- [x] Natural language explanation generation
- [x] Export explanation report

---

**Status:** ✅ COMPLETE
**Reference:** T156_IMPLEMENTATION_COMPLETE.md
