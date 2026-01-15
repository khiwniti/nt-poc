-- Quick database setup for testing purposes
-- This creates the minimum schema needed to run tests

-- Core tables
CREATE TABLE IF NOT EXISTS facilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255),
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),
  timezone VARCHAR(100) DEFAULT 'UTC',
  total_zones INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255),
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS battery_systems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  serial_number VARCHAR(255) UNIQUE NOT NULL,
  model VARCHAR(255),
  manufacturer VARCHAR(255),
  installation_date DATE,
  capacity_kwh DECIMAL(10, 2),
  voltage_v DECIMAL(10, 2),
  status VARCHAR(50) DEFAULT 'active',
  health_score INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  battery_id UUID REFERENCES battery_systems(id) ON DELETE CASCADE,
  facility_id UUID REFERENCES facilities(id) ON DELETE CASCADE,
  zone_id UUID REFERENCES zones(id) ON DELETE CASCADE,
  severity VARCHAR(50) DEFAULT 'info',
  status VARCHAR(50) DEFAULT 'active',
  message TEXT NOT NULL,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS alert_escalation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  from_severity VARCHAR(50) NOT NULL,
  to_severity VARCHAR(50) NOT NULL,
  threshold_minutes INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(facility_id, from_severity)
);

CREATE TABLE IF NOT EXISTS alert_escalation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
  from_severity VARCHAR(50) NOT NULL,
  to_severity VARCHAR(50) NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sensor_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  battery_id UUID NOT NULL REFERENCES battery_systems(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  voltage DECIMAL(10, 4),
  current DECIMAL(10, 4),
  temperature DECIMAL(10, 4),
  soc DECIMAL(5, 2),
  soh DECIMAL(5, 2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rul_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  battery_id UUID NOT NULL REFERENCES battery_systems(id) ON DELETE CASCADE,
  predicted_rul_days INTEGER,
  confidence_score DECIMAL(5, 4),
  prediction_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_facilities_status ON facilities(status);
CREATE INDEX IF NOT EXISTS idx_zones_facility ON zones(facility_id);
CREATE INDEX IF NOT EXISTS idx_batteries_zone ON battery_systems(zone_id);
CREATE INDEX IF NOT EXISTS idx_alerts_battery ON alerts(battery_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_battery ON sensor_readings(battery_id);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_timestamp ON sensor_readings(timestamp);
