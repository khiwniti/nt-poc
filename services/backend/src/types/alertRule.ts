/**
 * Alert Rule Engine Types
 * T118: US3 - Alert rule definitions and evaluation
 */

export type RuleType = 'temperature' | 'voltage' | 'soc' | 'soh' | 'rul';
export type RuleOperator = '>' | '>=' | '<' | '<=' | '==' | '!=';
export type AlertSeverity = 'info' | 'medium' | 'high' | 'critical';

export interface AlertRule {
  id: string;
  facilityId: string;
  name: string;
  description?: string;
  ruleType: RuleType;
  operator: RuleOperator;
  thresholdValue: number;
  severity: AlertSeverity;
  enabled: boolean;
  debounceMinutes: number;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
}

export interface AlertRuleRow {
  id: string;
  facility_id: string;
  name: string;
  description?: string;
  rule_type: RuleType;
  operator: RuleOperator;
  threshold_value: number;
  severity: AlertSeverity;
  enabled: boolean;
  debounce_minutes: number;
  created_at: Date;
  updated_at: Date;
  metadata?: Record<string, unknown>;
}

export interface AlertRuleViolation {
  id: string;
  ruleId: string;
  batterySystemId: string;
  violationValue: number;
  firstViolationAt: Date;
  lastViolationAt: Date;
  violationCount: number;
  alertGenerated: boolean;
  alertId?: string;
  alertGeneratedAt?: Date;
  resolved: boolean;
  resolvedAt?: Date;
}

export interface AlertRuleViolationRow {
  id: string;
  rule_id: string;
  battery_system_id: string;
  violation_value: number;
  first_violation_at: Date;
  last_violation_at: Date;
  violation_count: number;
  alert_generated: boolean;
  alert_id?: string;
  alert_generated_at?: Date;
  resolved: boolean;
  resolved_at?: Date;
}

export interface AlertRuleAuditLog {
  id: string;
  ruleId: string;
  batterySystemId: string;
  evaluatedAt: Date;
  ruleMatched: boolean;
  actualValue?: number;
  thresholdValue?: number;
  actionTaken?: 'alert_created' | 'debounced' | 'no_action' | 'rule_disabled';
  alertId?: string;
  metadata?: Record<string, unknown>;
}

export interface AlertRuleAuditLogRow {
  id: string;
  rule_id: string;
  battery_system_id: string;
  evaluated_at: Date;
  rule_matched: boolean;
  actual_value?: number;
  threshold_value?: number;
  action_taken?: 'alert_created' | 'debounced' | 'no_action' | 'rule_disabled';
  alert_id?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateAlertRuleRequest {
  facilityId: string;
  name: string;
  description?: string;
  ruleType: RuleType;
  operator: RuleOperator;
  thresholdValue: number;
  severity: AlertSeverity;
  enabled?: boolean;
  debounceMinutes?: number;
  metadata?: Record<string, unknown>;
}

export interface UpdateAlertRuleRequest {
  name?: string;
  description?: string;
  operator?: RuleOperator;
  thresholdValue?: number;
  severity?: AlertSeverity;
  enabled?: boolean;
  debounceMinutes?: number;
  metadata?: Record<string, unknown>;
}

export interface SensorData {
  batterySystemId: string;
  temperature?: number;
  voltage?: number;
  soc?: number;
  soh?: number;
  timestamp: Date;
}

export interface RULData {
  batterySystemId: string;
  predictedRUL: number;
  predictionDate: Date;
}

export interface RuleEvaluationResult {
  rule: AlertRule;
  matched: boolean;
  actualValue?: number;
  shouldGenerateAlert: boolean;
  reason: string;
  violation?: AlertRuleViolation;
}

export interface RuleEvaluationSummary {
  totalRulesEvaluated: number;
  rulesMatched: number;
  alertsGenerated: number;
  violationsDebounced: number;
  errors: string[];
}
