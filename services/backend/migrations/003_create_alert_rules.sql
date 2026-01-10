-- Alert Rule Engine
-- T118: US3 - Implement alert rule engine for automatic alert generation

-- Table for alert rule definitions
CREATE TABLE IF NOT EXISTS alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id VARCHAR(255) NOT NULL,
  
  -- Rule identification
  name VARCHAR(255) NOT NULL,
  description TEXT,
  rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN ('temperature', 'voltage', 'soc', 'soh', 'rul')),
  
  -- Rule conditions
  operator VARCHAR(20) NOT NULL CHECK (operator IN ('>', '>=', '<', '<=', '==', '!=')),
  threshold_value DECIMAL(10, 4) NOT NULL,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('info', 'medium', 'high', 'critical')),
  
  -- Rule settings
  enabled BOOLEAN NOT NULL DEFAULT true,
  debounce_minutes INTEGER DEFAULT 5, -- Debouncing window to prevent spam
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Additional configuration
  metadata JSONB
);

-- Table for tracking rule violations (for debouncing)
CREATE TABLE IF NOT EXISTS alert_rule_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES alert_rules(id) ON DELETE CASCADE,
  battery_system_id VARCHAR(255) NOT NULL,
  
  -- Violation details
  violation_value DECIMAL(10, 4) NOT NULL,
  first_violation_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_violation_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  violation_count INTEGER NOT NULL DEFAULT 1,
  
  -- Alert tracking
  alert_generated BOOLEAN NOT NULL DEFAULT false,
  alert_id UUID REFERENCES alerts(id) ON DELETE SET NULL,
  alert_generated_at TIMESTAMPTZ,
  
  -- Status
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ
);

-- Table for rule evaluation audit log
CREATE TABLE IF NOT EXISTS alert_rule_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES alert_rules(id) ON DELETE CASCADE,
  battery_system_id VARCHAR(255) NOT NULL,
  
  -- Evaluation details
  evaluated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  rule_matched BOOLEAN NOT NULL,
  actual_value DECIMAL(10, 4),
  threshold_value DECIMAL(10, 4),
  
  -- Action taken
  action_taken VARCHAR(50) CHECK (action_taken IN ('alert_created', 'debounced', 'no_action', 'rule_disabled')),
  alert_id UUID REFERENCES alerts(id) ON DELETE SET NULL,
  
  -- Metadata
  metadata JSONB
);

-- Indexes for alert_rules
CREATE INDEX IF NOT EXISTS idx_alert_rules_facility 
  ON alert_rules(facility_id, enabled);

CREATE INDEX IF NOT EXISTS idx_alert_rules_type 
  ON alert_rules(rule_type, enabled);

-- Indexes for alert_rule_violations
CREATE INDEX IF NOT EXISTS idx_rule_violations_rule 
  ON alert_rule_violations(rule_id, battery_system_id, resolved);

CREATE INDEX IF NOT EXISTS idx_rule_violations_battery 
  ON alert_rule_violations(battery_system_id, resolved);

CREATE INDEX IF NOT EXISTS idx_rule_violations_unresolved 
  ON alert_rule_violations(resolved, first_violation_at) 
  WHERE resolved = false;

-- Indexes for audit log
CREATE INDEX IF NOT EXISTS idx_rule_audit_rule 
  ON alert_rule_audit_log(rule_id, evaluated_at DESC);

CREATE INDEX IF NOT EXISTS idx_rule_audit_battery 
  ON alert_rule_audit_log(battery_system_id, evaluated_at DESC);

CREATE INDEX IF NOT EXISTS idx_rule_audit_time 
  ON alert_rule_audit_log(evaluated_at DESC);

-- Insert default rules based on US3 requirements
-- Temperature > 45°C
INSERT INTO alert_rules (facility_id, name, description, rule_type, operator, threshold_value, severity, debounce_minutes, enabled)
VALUES (
  'default',
  'High Temperature Alert',
  'Alert when battery temperature exceeds 45°C',
  'temperature',
  '>',
  45.0,
  'high',
  5,
  true
) ON CONFLICT DO NOTHING;

-- Voltage < 2.5V
INSERT INTO alert_rules (facility_id, name, description, rule_type, operator, threshold_value, severity, debounce_minutes, enabled)
VALUES (
  'default',
  'Low Voltage Alert',
  'Alert when battery voltage drops below 2.5V',
  'voltage',
  '<',
  2.5,
  'critical',
  5,
  true
) ON CONFLICT DO NOTHING;

-- SoC < 20%
INSERT INTO alert_rules (facility_id, name, description, rule_type, operator, threshold_value, severity, debounce_minutes, enabled)
VALUES (
  'default',
  'Low State of Charge Alert',
  'Alert when battery SoC falls below 20%',
  'soc',
  '<',
  20.0,
  'medium',
  5,
  true
) ON CONFLICT DO NOTHING;

-- SoH < 70%
INSERT INTO alert_rules (facility_id, name, description, rule_type, operator, threshold_value, severity, debounce_minutes, enabled)
VALUES (
  'default',
  'Low State of Health Alert',
  'Alert when battery SoH falls below 70%',
  'soh',
  '<',
  70.0,
  'critical',
  5,
  true
) ON CONFLICT DO NOTHING;

-- RUL < 30 days
INSERT INTO alert_rules (facility_id, name, description, rule_type, operator, threshold_value, severity, debounce_minutes, enabled)
VALUES (
  'default',
  'Low Remaining Useful Life Alert',
  'Alert when battery RUL is less than 30 days',
  'rul',
  '<',
  30.0,
  'high',
  5,
  true
) ON CONFLICT DO NOTHING;

-- Comments
COMMENT ON TABLE alert_rules IS 'Alert rule definitions for automatic alert generation';
COMMENT ON TABLE alert_rule_violations IS 'Tracks rule violations for debouncing and alert generation';
COMMENT ON TABLE alert_rule_audit_log IS 'Audit log of all rule evaluations';
COMMENT ON COLUMN alert_rules.debounce_minutes IS 'Time window to wait before generating an alert after first violation';
COMMENT ON COLUMN alert_rule_violations.violation_count IS 'Number of times the rule has been violated in current window';
