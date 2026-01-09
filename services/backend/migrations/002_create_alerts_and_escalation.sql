-- Alert Management and Escalation System
-- T131: Add alert escalation system

-- Table for battery system alerts
CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  battery_system_id VARCHAR(255) NOT NULL,
  zone_id VARCHAR(255),
  facility_id VARCHAR(255),
  
  -- Alert details
  type VARCHAR(100) NOT NULL,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('info', 'medium', 'high', 'critical')),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved')),
  message TEXT NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  
  -- Metadata
  metadata JSONB,
  
  -- Acknowledgement details
  acknowledged_by VARCHAR(255),
  resolution_notes TEXT
);

-- Table for alert escalation events
CREATE TABLE IF NOT EXISTS alert_escalation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
  
  -- Escalation details
  from_severity VARCHAR(20) NOT NULL,
  to_severity VARCHAR(20) NOT NULL,
  escalated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Escalation reason
  reason TEXT NOT NULL,
  auto_escalated BOOLEAN NOT NULL DEFAULT true,
  
  -- Notification tracking
  notification_sent BOOLEAN NOT NULL DEFAULT false,
  notification_sent_at TIMESTAMPTZ
);

-- Table for facility-specific escalation rules
CREATE TABLE IF NOT EXISTS escalation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id VARCHAR(255) NOT NULL UNIQUE,
  
  -- Escalation timeframes (in minutes)
  info_to_medium_minutes INTEGER DEFAULT 120,
  medium_to_high_minutes INTEGER DEFAULT 60,
  high_to_critical_minutes INTEGER DEFAULT 30,
  
  -- Rule settings
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Additional configuration
  config JSONB
);

-- Indexes for alerts table
CREATE INDEX IF NOT EXISTS idx_alerts_battery_system 
  ON alerts(battery_system_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_alerts_facility 
  ON alerts(facility_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_alerts_status 
  ON alerts(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_alerts_severity 
  ON alerts(severity, created_at DESC);

-- Index for finding unacknowledged alerts eligible for escalation
CREATE INDEX IF NOT EXISTS idx_alerts_unacknowledged 
  ON alerts(severity, created_at, status) 
  WHERE status = 'active' AND acknowledged_at IS NULL;

-- Indexes for escalation events
CREATE INDEX IF NOT EXISTS idx_escalation_events_alert 
  ON alert_escalation_events(alert_id, escalated_at DESC);

CREATE INDEX IF NOT EXISTS idx_escalation_events_time 
  ON alert_escalation_events(escalated_at DESC);

-- Insert default escalation rules for testing
INSERT INTO escalation_rules (facility_id, info_to_medium_minutes, medium_to_high_minutes, high_to_critical_minutes, enabled)
VALUES ('default', 120, 60, 30, true)
ON CONFLICT (facility_id) DO NOTHING;

-- Comments
COMMENT ON TABLE alerts IS 'Battery system alerts with escalation support';
COMMENT ON TABLE alert_escalation_events IS 'History of alert severity escalations';
COMMENT ON TABLE escalation_rules IS 'Facility-specific escalation configuration';
COMMENT ON COLUMN alerts.severity IS 'Alert severity: info < medium < high < critical';
COMMENT ON COLUMN alerts.status IS 'Alert lifecycle status: active, acknowledged, resolved';
