-- Migration: Create RUL Predictions table
-- US4: Add RULPrediction data model

-- Create rul_predictions table
CREATE TABLE IF NOT EXISTS rul_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    battery_system_id UUID NOT NULL,
    predicted_rul INTEGER NOT NULL CHECK (predicted_rul >= 0),
    confidence DECIMAL(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    prediction_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    model_version VARCHAR(50) NOT NULL,
    features JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Foreign key constraint (assuming battery_systems table exists)
    CONSTRAINT fk_battery_system
        FOREIGN KEY (battery_system_id)
        REFERENCES battery_systems(id)
        ON DELETE CASCADE
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_rul_predictions_battery_system_id
    ON rul_predictions(battery_system_id);

CREATE INDEX IF NOT EXISTS idx_rul_predictions_prediction_date
    ON rul_predictions(prediction_date DESC);

CREATE INDEX IF NOT EXISTS idx_rul_predictions_battery_date
    ON rul_predictions(battery_system_id, prediction_date DESC);

-- Create index for data retention cleanup (90 days policy)
CREATE INDEX IF NOT EXISTS idx_rul_predictions_created_at
    ON rul_predictions(created_at)
    WHERE created_at < NOW() - INTERVAL '90 days';

-- Add comment for documentation
COMMENT ON TABLE rul_predictions IS
    'Stores RUL (Remaining Useful Life) predictions for battery systems with 90-day retention';

COMMENT ON COLUMN rul_predictions.predicted_rul IS
    'Predicted remaining useful life in days';

COMMENT ON COLUMN rul_predictions.confidence IS
    'Prediction confidence score (0-1 range)';

COMMENT ON COLUMN rul_predictions.features IS
    'JSON object containing model features used for prediction';

-- Create function for automatic cleanup of old predictions (90-day retention)
CREATE OR REPLACE FUNCTION cleanup_old_rul_predictions()
RETURNS void AS $$
BEGIN
    DELETE FROM rul_predictions
    WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Optional: Create scheduled job for automatic cleanup
-- Note: Requires pg_cron extension
-- SELECT cron.schedule('cleanup-old-predictions', '0 2 * * *', 'SELECT cleanup_old_rul_predictions()');
