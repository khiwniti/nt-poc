-- Model Performance Monitoring Schema

-- Table for storing model predictions and actual values
CREATE TABLE IF NOT EXISTS model_predictions (
  id SERIAL PRIMARY KEY,
  battery_system_id VARCHAR(255) NOT NULL,
  prediction_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Predicted values
  predicted_soc DECIMAL(5,2),
  predicted_soh DECIMAL(5,2),
  predicted_temperature DECIMAL(6,2),
  predicted_power DECIMAL(10,2),

  -- Actual values (populated later when real data arrives)
  actual_soc DECIMAL(5,2),
  actual_soh DECIMAL(5,2),
  actual_temperature DECIMAL(6,2),
  actual_power DECIMAL(10,2),

  -- Model metadata
  model_version VARCHAR(50) NOT NULL,

  -- Prediction metadata
  prediction_horizon_minutes INTEGER NOT NULL,
  actual_recorded_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table for storing aggregated model performance metrics
CREATE TABLE IF NOT EXISTS model_performance_metrics (
  id SERIAL PRIMARY KEY,
  battery_system_id VARCHAR(255),
  metric_time TIMESTAMPTZ NOT NULL,
  model_version VARCHAR(50) NOT NULL,

  -- Accuracy metrics
  mae_soc DECIMAL(10,4),
  mae_soh DECIMAL(10,4),
  mae_temperature DECIMAL(10,4),
  mae_power DECIMAL(10,4),

  rmse_soc DECIMAL(10,4),
  rmse_soh DECIMAL(10,4),
  rmse_temperature DECIMAL(10,4),
  rmse_power DECIMAL(10,4),

  r2_soc DECIMAL(10,6),
  r2_soh DECIMAL(10,6),
  r2_temperature DECIMAL(10,6),
  r2_power DECIMAL(10,6),

  -- Data quality metrics
  prediction_count INTEGER NOT NULL DEFAULT 0,
  missing_actual_count INTEGER NOT NULL DEFAULT 0,
  outlier_count INTEGER NOT NULL DEFAULT 0,

  -- Aggregation period
  aggregation_period VARCHAR(20) NOT NULL, -- 'hourly', 'daily', 'weekly'

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table for drift detection metrics
CREATE TABLE IF NOT EXISTS model_drift_metrics (
  id SERIAL PRIMARY KEY,
  battery_system_id VARCHAR(255),
  metric_time TIMESTAMPTZ NOT NULL,
  model_version VARCHAR(50) NOT NULL,

  -- Feature distribution metrics (KS test statistics)
  voltage_drift_score DECIMAL(10,6),
  current_drift_score DECIMAL(10,6),
  temperature_drift_score DECIMAL(10,6),
  soc_drift_score DECIMAL(10,6),

  -- Overall drift indicators
  overall_drift_score DECIMAL(10,6),
  drift_detected BOOLEAN NOT NULL DEFAULT FALSE,

  -- Baseline comparison window
  baseline_start TIMESTAMPTZ NOT NULL,
  baseline_end TIMESTAMPTZ NOT NULL,
  comparison_start TIMESTAMPTZ NOT NULL,
  comparison_end TIMESTAMPTZ NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table for data quality metrics
CREATE TABLE IF NOT EXISTS data_quality_metrics (
  id SERIAL PRIMARY KEY,
  battery_system_id VARCHAR(255),
  metric_time TIMESTAMPTZ NOT NULL,

  -- Missing value counts
  missing_voltage_count INTEGER NOT NULL DEFAULT 0,
  missing_current_count INTEGER NOT NULL DEFAULT 0,
  missing_temperature_count INTEGER NOT NULL DEFAULT 0,
  missing_soc_count INTEGER NOT NULL DEFAULT 0,
  missing_soh_count INTEGER NOT NULL DEFAULT 0,

  -- Total records in period
  total_records INTEGER NOT NULL,

  -- Outlier counts (values beyond 3 std dev)
  voltage_outlier_count INTEGER NOT NULL DEFAULT 0,
  current_outlier_count INTEGER NOT NULL DEFAULT 0,
  temperature_outlier_count INTEGER NOT NULL DEFAULT 0,
  soc_outlier_count INTEGER NOT NULL DEFAULT 0,

  -- Range violations
  voltage_range_violations INTEGER NOT NULL DEFAULT 0,
  current_range_violations INTEGER NOT NULL DEFAULT 0,
  temperature_range_violations INTEGER NOT NULL DEFAULT 0,
  soc_range_violations INTEGER NOT NULL DEFAULT 0,

  -- Data freshness
  max_time_gap_seconds INTEGER,

  aggregation_period VARCHAR(20) NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table for model health alerts
CREATE TABLE IF NOT EXISTS model_health_alerts (
  id SERIAL PRIMARY KEY,
  battery_system_id VARCHAR(255),
  alert_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  model_version VARCHAR(50) NOT NULL,

  -- Alert details
  alert_type VARCHAR(50) NOT NULL, -- 'accuracy_degradation', 'drift_detected', 'data_quality_issue'
  severity VARCHAR(20) NOT NULL, -- 'low', 'medium', 'high', 'critical'
  message TEXT NOT NULL,

  -- Metrics that triggered alert
  metric_name VARCHAR(100),
  metric_value DECIMAL(10,6),
  threshold_value DECIMAL(10,6),

  -- Alert lifecycle
  acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by VARCHAR(255),
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table for model health scores
CREATE TABLE IF NOT EXISTS model_health_scores (
  id SERIAL PRIMARY KEY,
  battery_system_id VARCHAR(255),
  score_time TIMESTAMPTZ NOT NULL,
  model_version VARCHAR(50) NOT NULL,

  -- Component scores (0-100)
  accuracy_score DECIMAL(5,2) NOT NULL,
  drift_score DECIMAL(5,2) NOT NULL,
  data_quality_score DECIMAL(5,2) NOT NULL,

  -- Overall health score (weighted average)
  overall_health_score DECIMAL(5,2) NOT NULL,
  health_status VARCHAR(20) NOT NULL, -- 'excellent', 'good', 'fair', 'poor', 'critical'

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_model_predictions_battery_time
  ON model_predictions(battery_system_id, prediction_time DESC);

CREATE INDEX IF NOT EXISTS idx_model_predictions_model_version
  ON model_predictions(model_version);

CREATE INDEX IF NOT EXISTS idx_model_performance_metrics_battery_time
  ON model_performance_metrics(battery_system_id, metric_time DESC);

CREATE INDEX IF NOT EXISTS idx_model_drift_metrics_battery_time
  ON model_drift_metrics(battery_system_id, metric_time DESC);

CREATE INDEX IF NOT EXISTS idx_data_quality_metrics_battery_time
  ON data_quality_metrics(battery_system_id, metric_time DESC);

CREATE INDEX IF NOT EXISTS idx_model_health_alerts_battery_time
  ON model_health_alerts(battery_system_id, alert_time DESC);

CREATE INDEX IF NOT EXISTS idx_model_health_alerts_unresolved
  ON model_health_alerts(resolved, severity) WHERE resolved = FALSE;

CREATE INDEX IF NOT EXISTS idx_model_health_scores_battery_time
  ON model_health_scores(battery_system_id, score_time DESC);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_model_predictions_updated_at BEFORE UPDATE
    ON model_predictions FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
