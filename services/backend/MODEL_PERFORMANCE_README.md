# Model Performance Monitoring Dashboard

A comprehensive model performance monitoring system for tracking prediction accuracy, detecting data drift, monitoring data quality, and alerting on model degradation.

## Features

### ✅ Prediction Accuracy Metrics
- **MAE (Mean Absolute Error)**: Average absolute difference between predictions and actual values
- **RMSE (Root Mean Square Error)**: Square root of average squared errors
- **R² (Coefficient of Determination)**: Proportion of variance explained by the model (0-1 scale)

Metrics tracked for:
- State of Charge (SOC)
- State of Health (SOH)
- Temperature
- Power

### 📊 Drift Detection
Monitors feature distribution changes using **Kolmogorov-Smirnov (KS) test**:
- Voltage drift
- Current drift
- Temperature drift
- SOC drift
- Overall drift score

**Thresholds:**
- < 0.1: Stable
- 0.1-0.2: Minor drift
- 0.2-0.3: Moderate drift
- \> 0.3: Significant drift (alert triggered)

### 🔍 Data Quality Metrics
- **Missing Values**: Count of null/missing data points per feature
- **Outliers**: Values beyond 3 standard deviations
- **Range Violations**: Values outside valid domain ranges
- **Data Freshness**: Maximum time gap between readings

### 🏥 Model Health Score
Overall health score (0-100) calculated as weighted average:
- **Accuracy Score** (50% weight): Based on R² values
- **Drift Score** (30% weight): Inverse of drift statistics
- **Data Quality Score** (20% weight): Based on completeness and validity

**Health Status:**
- 90-100: Excellent
- 75-89: Good
- 60-74: Fair
- 40-59: Poor
- < 40: Critical

### 🚨 Alert System
Automated alerts for:
- **Accuracy Degradation**: R² < 0.7 or health score < 60
- **Drift Detected**: KS statistic > 0.2
- **Data Quality Issues**: Quality score < 70

**Alert Severity Levels:**
- Critical
- High
- Medium
- Low

### 📈 Historical Performance Charts
Track metrics over time:
- Accuracy trends
- Drift evolution
- Health score history
- Data quality trends

## Database Schema

### Tables Created

1. **model_predictions**: Store predictions with actual values
2. **model_performance_metrics**: Aggregated accuracy metrics
3. **model_drift_metrics**: Drift detection results
4. **data_quality_metrics**: Data quality measurements
5. **model_health_alerts**: Active and resolved alerts
6. **model_health_scores**: Overall health assessments

### Migration

Run the migration script:
```bash
psql -U postgres -d your_database -f migrations/001_create_model_performance_tables.sql
```

## Backend API Endpoints

### GET /api/v1/model-performance/metrics
Get aggregated performance metrics (MAE, RMSE, R²)

**Query Parameters:**
- `batterySystemId` (required): Battery system identifier
- `startTime` (required): Start of time range (ISO 8601)
- `endTime` (required): End of time range (ISO 8601)
- `modelVersion` (optional): Model version (default: "v1.0")
- `aggregationPeriod` (optional): "hourly", "daily", or "weekly" (default: "daily")

**Response:**
```json
{
  "data": [{
    "metric_time": "2024-01-15T12:00:00Z",
    "mae_soc": 1.5,
    "rmse_soc": 2.0,
    "r2_soc": 0.92,
    ...
  }],
  "source": "cached"
}
```

### GET /api/v1/model-performance/drift
Detect drift between baseline and comparison periods

**Query Parameters:**
- `batterySystemId` (required)
- `baselineStart` (required)
- `baselineEnd` (required)
- `comparisonStart` (required)
- `comparisonEnd` (required)
- `modelVersion` (optional)
- `threshold` (optional): Default 0.2

**Response:**
```json
{
  "data": {
    "driftScores": {
      "voltage": 0.15,
      "current": 0.12,
      "temperature": 0.08,
      "soc": 0.10
    },
    "overallDriftScore": 0.15,
    "driftDetected": false
  }
}
```

### GET /api/v1/model-performance/data-quality
Get data quality metrics

**Query Parameters:**
- `batterySystemId` (required)
- `startTime` (required)
- `endTime` (required)
- `aggregationPeriod` (optional)

**Response:**
```json
{
  "data": [{
    "metric_time": "2024-01-15T12:00:00Z",
    "total_records": 1000,
    "missing_voltage_count": 5,
    "voltage_outlier_count": 2,
    ...
  }],
  "source": "cached"
}
```

### GET /api/v1/model-performance/health-score
Get overall model health score

**Query Parameters:**
- `batterySystemId` (required)
- `startTime` (required)
- `endTime` (required)
- `modelVersion` (optional)

**Response:**
```json
{
  "data": {
    "score_time": "2024-01-15T12:00:00Z",
    "accuracy_score": 85.5,
    "drift_score": 92.0,
    "data_quality_score": 88.0,
    "overall_health_score": 87.2,
    "health_status": "good"
  },
  "source": "calculated"
}
```

### GET /api/v1/model-performance/alerts
Get model health alerts

**Query Parameters:**
- `batterySystemId` (required)
- `resolved` (optional): "true" or "false" (default: "false")
- `limit` (optional): Max results (default: 50)

**Response:**
```json
{
  "data": [{
    "id": 1,
    "alert_time": "2024-01-15T12:00:00Z",
    "alert_type": "accuracy_degradation",
    "severity": "high",
    "message": "Model accuracy has degraded to 55%",
    "metric_name": "accuracy_score",
    "metric_value": 55.0,
    "threshold_value": 60.0,
    "acknowledged": false,
    "resolved": false
  }],
  "total": 1
}
```

### PATCH /api/v1/model-performance/alerts/:id/acknowledge
Acknowledge an alert

### PATCH /api/v1/model-performance/alerts/:id/resolve
Resolve an alert

### GET /api/v1/model-performance/history
Get historical performance data

**Query Parameters:**
- `batterySystemId` (required)
- `metricType` (required): "accuracy", "drift", or "health"
- `startTime` (required)
- `endTime` (required)
- `modelVersion` (optional)

## Frontend Component

### ModelPerformanceDashboard

Located at: `/src/pages/ModelPerformance.tsx`

**Features:**
- Real-time health score display
- Active alerts with acknowledge/resolve actions
- Accuracy metrics cards for each prediction target
- Drift detection visualization
- Data quality metrics
- Time range selector (24h, 7d, 30d)
- Battery system selector
- Refresh button

**Route:** `/model-performance`

## Usage Example

### Recording Predictions
```typescript
// Store a prediction
await pool.query(`
  INSERT INTO model_predictions
    (battery_system_id, predicted_soc, predicted_soh,
     predicted_temperature, predicted_power, model_version,
     prediction_horizon_minutes)
  VALUES ($1, $2, $3, $4, $5, $6, $7)
`, [batterySystemId, soc, soh, temp, power, 'v1.0', 60]);

// Update with actual values when available
await pool.query(`
  UPDATE model_predictions
  SET actual_soc = $1, actual_soh = $2,
      actual_temperature = $3, actual_power = $4,
      actual_recorded_at = NOW()
  WHERE id = $5
`, [actualSoc, actualSoh, actualTemp, actualPower, predictionId]);
```

### Calculating Metrics
```typescript
import { ModelPerformanceService } from './services/modelPerformance';

// Calculate performance metrics
const metrics = await ModelPerformanceService.calculatePerformanceMetrics(
  'battery-001',
  startTime,
  endTime,
  'v1.0',
  'daily'
);

// Detect drift
const driftResult = await ModelPerformanceService.detectDrift(
  'battery-001',
  baselineStart,
  baselineEnd,
  comparisonStart,
  comparisonEnd,
  'v1.0'
);

// Calculate health score
const healthScore = ModelPerformanceService.calculateHealthScore(
  metrics,
  driftResult.overallDriftScore,
  dataQualityMetrics
);
```

## Testing

### Backend Tests
```bash
cd services/backend
npm test
```

**Test Coverage:**
- Statistical calculations (MAE, RMSE, R², KS test)
- Health score computation
- Edge cases (empty arrays, negative values, large numbers)
- API endpoints
- Alert management

### Test Files
- `src/services/__tests__/modelPerformance.test.ts`: Service layer tests
- `src/routes/__tests__/modelPerformance.test.ts`: API route tests

## Performance Considerations

### Caching Strategy
- Calculated metrics are cached in database tables
- API first checks for cached results before recalculating
- Reduces computational overhead for frequently accessed data

### Indexes
Database indexes on:
- `battery_system_id` + `time` columns
- `model_version`
- `resolved` + `severity` for alerts

### Aggregation Periods
- **Hourly**: High-resolution monitoring (short-term)
- **Daily**: Standard monitoring (medium-term)
- **Weekly**: Long-term trend analysis

## Monitoring Best Practices

1. **Set Baseline Period**: Use stable operation period (1-2 weeks)
2. **Regular Drift Checks**: Run drift detection daily or weekly
3. **Alert Response**: Investigate alerts within 24 hours
4. **Model Retraining**: Consider retraining when:
   - Health score < 70 for 3+ days
   - R² < 0.7 consistently
   - Drift score > 0.3
5. **Data Quality**: Address missing data and outliers promptly

## Configuration

### Environment Variables
```bash
# Database connection
DATABASE_URL=postgresql://user:pass@localhost:5432/dbname

# API settings
PORT=3000
NODE_ENV=production

# Model settings
MODEL_VERSION=v1.0
```

### Alert Thresholds (Configurable)
```typescript
const THRESHOLDS = {
  accuracy_degradation: 60,  // health score
  r2_threshold: 0.7,         // R² minimum
  drift_threshold: 0.2,      // KS statistic
  data_quality_threshold: 70 // quality score
};
```

## Future Enhancements

- [ ] Real-time streaming metrics with WebSocket
- [ ] Custom alert threshold configuration per battery system
- [ ] Export reports to PDF/CSV
- [ ] Automated model retraining triggers
- [ ] Multi-model comparison dashboard
- [ ] Advanced charting with zoom and pan
- [ ] Alert notification system (email, Slack, etc.)
- [ ] A/B testing framework for model versions
- [ ] Feature importance tracking over time
- [ ] Prediction confidence intervals

## Troubleshooting

### Common Issues

**Issue: No metrics calculated**
- Ensure predictions have corresponding actual values
- Check `model_predictions` table for data
- Verify time ranges include data

**Issue: Drift always showing as detected**
- Check baseline and comparison periods don't overlap
- Ensure sufficient data in both periods (>100 samples)
- Adjust drift threshold if needed

**Issue: Health score always low**
- Review individual component scores
- Check for data quality issues first
- Verify model predictions are being recorded

**Issue: Alerts not appearing**
- Check alert creation thresholds
- Verify health score calculation is running
- Review `model_health_alerts` table

## License

MIT License - See LICENSE file for details

## Support

For issues and questions:
- GitHub Issues: [repository]/issues
- Documentation: [repository]/docs
- Email: support@example.com
