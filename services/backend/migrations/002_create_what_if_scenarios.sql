-- Create what_if_scenarios table
CREATE TABLE IF NOT EXISTS what_if_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  battery_system_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  parameters JSONB NOT NULL,
  prediction JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_battery_system
    FOREIGN KEY (battery_system_id)
    REFERENCES battery_systems(id)
    ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_what_if_scenarios_battery_system_id
  ON what_if_scenarios(battery_system_id);

CREATE INDEX IF NOT EXISTS idx_what_if_scenarios_created_at
  ON what_if_scenarios(created_at DESC);

-- Add comment for documentation
COMMENT ON TABLE what_if_scenarios IS 'Stores saved what-if scenario analyses for battery systems';
COMMENT ON COLUMN what_if_scenarios.parameters IS 'JSON object containing temperature, loadPercentage, and cycleFrequency';
COMMENT ON COLUMN what_if_scenarios.prediction IS 'JSON object containing predicted RUL, health score, and confidence';
