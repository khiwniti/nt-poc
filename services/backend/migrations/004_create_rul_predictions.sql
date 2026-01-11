-- Migration 04: Create RUL Predictions table for MLOps integration
-- Dependencies: T010 (Sensor entity)

CREATE TABLE rul_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  battery_id UUID NOT NULL REFERENCES sensors(id),
  facility_id UUID NOT NULL REFERENCES facilities(id),
  predicted_rul_cycles INTEGER NOT NULL,
  confidence_interval JSONB NOT NULL,
  confidence_score NUMERIC(3,2) NOT NULL CHECK (confidence_score BETWEEN 0 AND 1),
  model_version VARCHAR(50) NOT NULL,
  features JSONB NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  alert_triggered BOOLEAN DEFAULT FALSE,
  metadata JSONB
);

CREATE INDEX idx_rul_battery ON rul_predictions(battery_id);
CREATE INDEX idx_rul_facility ON rul_predictions(facility_id);
CREATE INDEX idx_rul_timestamp ON rul_predictions(timestamp DESC);

COMMENT ON TABLE rul_predictions IS 'Stores RUL (Remaining Useful Life) predictions from MLOps models';
COMMENT ON COLUMN rul_predictions.battery_id IS 'Reference to the battery sensor';
COMMENT ON COLUMN rul_predictions.facility_id IS 'Reference to the facility containing the battery';
COMMENT ON COLUMN rul_predictions.predicted_rul_cycles IS 'Predicted remaining useful life in charge/discharge cycles';
COMMENT ON COLUMN rul_predictions.confidence_interval IS 'JSON object with lower and upper bounds of confidence interval';
COMMENT ON COLUMN rul_predictions.confidence_score IS 'Model confidence score (0-1 range)';
COMMENT ON COLUMN rul_predictions.model_version IS 'Version identifier of the ML model used for prediction';
COMMENT ON COLUMN rul_predictions.features IS 'JSON object containing model input features used for prediction';
COMMENT ON COLUMN rul_predictions.timestamp IS 'Timestamp when prediction was generated';
COMMENT ON COLUMN rul_predictions.alert_triggered IS 'Flag indicating if prediction triggered an alert';
COMMENT ON COLUMN rul_predictions.metadata IS 'Additional metadata for the prediction';
