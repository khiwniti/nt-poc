/**
 * Alert Rule Engine Service
 * T118: US3 - Automatic alert generation based on sensor thresholds
 * 
 * Features:
 * - Rule evaluation engine
 * - Threshold configuration per facility
 * - Alert generation on rule violations
 * - Debouncing (5min window) to prevent spam
 * - Rule audit logging
 */

import { pool } from '../config/database.js';
import { logger } from '../observability/logger.js';
import type {
  AlertRule,
  AlertRuleRow,
  AlertRuleViolation,
  AlertRuleViolationRow,
  AlertRuleAuditLogRow,
  CreateAlertRuleRequest,
  UpdateAlertRuleRequest,
  SensorData,
  RULData,
  RuleEvaluationResult,
  RuleEvaluationSummary,
  RuleOperator,
  RuleType,
} from '../types/alertRule.js';

export class AlertRuleEngineService {
  private static instance: AlertRuleEngineService;

  private constructor() {}

  static getInstance(): AlertRuleEngineService {
    if (!AlertRuleEngineService.instance) {
      AlertRuleEngineService.instance = new AlertRuleEngineService();
    }
    return AlertRuleEngineService.instance;
  }

  /**
   * Convert database row to AlertRule
   */
  private rowToRule(row: AlertRuleRow): AlertRule {
    return {
      id: row.id,
      facilityId: row.facility_id,
      name: row.name,
      description: row.description,
      ruleType: row.rule_type,
      operator: row.operator,
      thresholdValue: Number(row.threshold_value),
      severity: row.severity,
      enabled: row.enabled,
      debounceMinutes: row.debounce_minutes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      metadata: row.metadata,
    };
  }

  /**
   * Convert database row to AlertRuleViolation
   */
  private rowToViolation(row: AlertRuleViolationRow): AlertRuleViolation {
    return {
      id: row.id,
      ruleId: row.rule_id,
      batterySystemId: row.battery_system_id,
      violationValue: Number(row.violation_value),
      firstViolationAt: row.first_violation_at,
      lastViolationAt: row.last_violation_at,
      violationCount: row.violation_count,
      alertGenerated: row.alert_generated,
      alertId: row.alert_id,
      alertGeneratedAt: row.alert_generated_at,
      resolved: row.resolved,
      resolvedAt: row.resolved_at,
    };
  }

  /**
   * Get all rules for a facility
   */
  async getRulesForFacility(facilityId: string, enabledOnly = true): Promise<AlertRule[]> {
    const client = await pool.connect();
    try {
      const query = enabledOnly
        ? `SELECT * FROM alert_rules WHERE facility_id = $1 AND enabled = true ORDER BY created_at`
        : `SELECT * FROM alert_rules WHERE facility_id = $1 ORDER BY created_at`;

      const result = await client.query<AlertRuleRow>(query, [facilityId]);

      // Also fetch default rules if not already in facility rules
      const defaultResult = await client.query<AlertRuleRow>(
        enabledOnly
          ? `SELECT * FROM alert_rules WHERE facility_id = 'default' AND enabled = true ORDER BY created_at`
          : `SELECT * FROM alert_rules WHERE facility_id = 'default' ORDER BY created_at`
      );

      const rules = [...result.rows, ...defaultResult.rows].map((row) => this.rowToRule(row));
      return rules;
    } finally {
      client.release();
    }
  }

  /**
   * Get rule by ID
   */
  async getRuleById(ruleId: string): Promise<AlertRule | null> {
    const client = await pool.connect();
    try {
      const result = await client.query<AlertRuleRow>(
        `SELECT * FROM alert_rules WHERE id = $1`,
        [ruleId]
      );

      if (result.rows.length === 0) return null;
      return this.rowToRule(result.rows[0]);
    } finally {
      client.release();
    }
  }

  /**
   * Create a new alert rule
   */
  async createRule(request: CreateAlertRuleRequest): Promise<AlertRule> {
    const client = await pool.connect();
    try {
      const result = await client.query<AlertRuleRow>(
        `INSERT INTO alert_rules (
          facility_id, name, description, rule_type, operator, 
          threshold_value, severity, enabled, debounce_minutes, metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
        [
          request.facilityId,
          request.name,
          request.description || null,
          request.ruleType,
          request.operator,
          request.thresholdValue,
          request.severity,
          request.enabled !== false,
          request.debounceMinutes || 5,
          request.metadata ? JSON.stringify(request.metadata) : null,
        ]
      );

      logger.info('alert_rule_created', { ruleId: result.rows[0].id, facilityId: request.facilityId });
      return this.rowToRule(result.rows[0]);
    } finally {
      client.release();
    }
  }

  /**
   * Update an existing alert rule
   */
  async updateRule(ruleId: string, request: UpdateAlertRuleRequest): Promise<AlertRule> {
    const client = await pool.connect();
    try {
      const updates: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      if (request.name !== undefined) {
        updates.push(`name = $${paramIndex++}`);
        values.push(request.name);
      }
      if (request.description !== undefined) {
        updates.push(`description = $${paramIndex++}`);
        values.push(request.description);
      }
      if (request.operator !== undefined) {
        updates.push(`operator = $${paramIndex++}`);
        values.push(request.operator);
      }
      if (request.thresholdValue !== undefined) {
        updates.push(`threshold_value = $${paramIndex++}`);
        values.push(request.thresholdValue);
      }
      if (request.severity !== undefined) {
        updates.push(`severity = $${paramIndex++}`);
        values.push(request.severity);
      }
      if (request.enabled !== undefined) {
        updates.push(`enabled = $${paramIndex++}`);
        values.push(request.enabled);
      }
      if (request.debounceMinutes !== undefined) {
        updates.push(`debounce_minutes = $${paramIndex++}`);
        values.push(request.debounceMinutes);
      }
      if (request.metadata !== undefined) {
        updates.push(`metadata = $${paramIndex++}`);
        values.push(JSON.stringify(request.metadata));
      }

      updates.push(`updated_at = NOW()`);
      values.push(ruleId);

      const result = await client.query<AlertRuleRow>(
        `UPDATE alert_rules SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        throw new Error(`Alert rule ${ruleId} not found`);
      }

      logger.info('alert_rule_updated', { ruleId });
      return this.rowToRule(result.rows[0]);
    } finally {
      client.release();
    }
  }

  /**
   * Delete an alert rule
   */
  async deleteRule(ruleId: string): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query(`DELETE FROM alert_rules WHERE id = $1`, [ruleId]);
      logger.info('alert_rule_deleted', { ruleId });
    } finally {
      client.release();
    }
  }

  /**
   * Evaluate a rule against a value
   */
  private evaluateCondition(operator: RuleOperator, actualValue: number, threshold: number): boolean {
    switch (operator) {
      case '>':
        return actualValue > threshold;
      case '>=':
        return actualValue >= threshold;
      case '<':
        return actualValue < threshold;
      case '<=':
        return actualValue <= threshold;
      case '==':
        return actualValue === threshold;
      case '!=':
        return actualValue !== threshold;
      default:
        return false;
    }
  }

  /**
   * Get or create violation record
   */
  private async getOrCreateViolation(
    client: any,
    ruleId: string,
    batterySystemId: string,
    violationValue: number
  ): Promise<AlertRuleViolation> {
    // Check for existing unresolved violation
    const existingResult = await client.query(
      `SELECT * FROM alert_rule_violations 
       WHERE rule_id = $1 AND battery_system_id = $2 AND resolved = false`,
      [ruleId, batterySystemId]
    );

    if (existingResult.rows.length > 0) {
      // Update existing violation
      const updateResult = await client.query(
        `UPDATE alert_rule_violations 
         SET last_violation_at = NOW(), 
             violation_count = violation_count + 1,
             violation_value = $3
         WHERE id = $1
         RETURNING *`,
        [existingResult.rows[0].id, batterySystemId, violationValue]
      );
      return this.rowToViolation(updateResult.rows[0] as AlertRuleViolationRow);
    } else {
      // Create new violation
      const insertResult = await client.query(
        `INSERT INTO alert_rule_violations (
          rule_id, battery_system_id, violation_value
        ) VALUES ($1, $2, $3) RETURNING *`,
        [ruleId, batterySystemId, violationValue]
      );
      return this.rowToViolation(insertResult.rows[0] as AlertRuleViolationRow);
    }
  }

  /**
   * Check if debounce period has passed
   */
  private shouldGenerateAlert(violation: AlertRuleViolation, debounceMinutes: number): boolean {
    const now = new Date();
    const minutesSinceFirst =
      (now.getTime() - new Date(violation.firstViolationAt).getTime()) / (1000 * 60);

    return minutesSinceFirst >= debounceMinutes && !violation.alertGenerated;
  }

  /**
   * Generate alert from violation
   */
  private async generateAlertFromViolation(
    client: any,
    rule: AlertRule,
    violation: AlertRuleViolation
  ): Promise<string> {
    // Create alert
    const alertResult = await client.query(
      `INSERT INTO alerts (
        battery_system_id, facility_id, type, severity, status, message, metadata
      ) VALUES ($1, $2, $3, $4, 'active', $5, $6) RETURNING id`,
      [
        violation.batterySystemId,
        rule.facilityId,
        `${rule.ruleType.toUpperCase()}_THRESHOLD_VIOLATION`,
        rule.severity,
        `${rule.name}: ${rule.ruleType} ${rule.operator} ${rule.thresholdValue} (actual: ${violation.violationValue})`,
        JSON.stringify({
          ruleId: rule.id,
          ruleName: rule.name,
          ruleType: rule.ruleType,
          thresholdValue: rule.thresholdValue,
          actualValue: violation.violationValue,
          operator: rule.operator,
          violationId: violation.id,
          violationCount: violation.violationCount,
        }),
      ]
    );

    const alertId = alertResult.rows[0].id;

    // Update violation with alert info
    await client.query(
      `UPDATE alert_rule_violations 
       SET alert_generated = true, alert_id = $1, alert_generated_at = NOW()
       WHERE id = $2`,
      [alertId, violation.id]
    );

    logger.info('alert_generated_from_rule', {
      ruleId: rule.id,
      alertId,
      batterySystemId: violation.batterySystemId,
      violationValue: violation.violationValue,
    });

    return alertId;
  }

  /**
   * Log rule evaluation to audit log
   */
  private async logEvaluation(
    client: any,
    ruleId: string,
    batterySystemId: string,
    ruleMatched: boolean,
    actualValue: number | undefined,
    thresholdValue: number,
    actionTaken: 'alert_created' | 'debounced' | 'no_action' | 'rule_disabled',
    alertId?: string
  ): Promise<void> {
    await client.query(
      `INSERT INTO alert_rule_audit_log (
        rule_id, battery_system_id, rule_matched, actual_value, 
        threshold_value, action_taken, alert_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [ruleId, batterySystemId, ruleMatched, actualValue || null, thresholdValue, actionTaken, alertId || null]
    );
  }

  /**
   * Evaluate a single rule against sensor/RUL data
   */
  async evaluateRule(
    rule: AlertRule,
    data: SensorData | RULData
  ): Promise<RuleEvaluationResult> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Extract actual value based on rule type
      let actualValue: number | undefined;
      if (rule.ruleType === 'rul' && 'predictedRUL' in data) {
        actualValue = data.predictedRUL;
      } else if ('temperature' in data) {
        const sensorData = data as SensorData;
        switch (rule.ruleType) {
          case 'temperature':
            actualValue = sensorData.temperature;
            break;
          case 'voltage':
            actualValue = sensorData.voltage;
            break;
          case 'soc':
            actualValue = sensorData.soc;
            break;
          case 'soh':
            actualValue = sensorData.soh;
            break;
        }
      }

      // If no value available, no match
      if (actualValue === undefined) {
        await this.logEvaluation(
          client,
          rule.id,
          data.batterySystemId,
          false,
          undefined,
          rule.thresholdValue,
          'no_action'
        );
        await client.query('COMMIT');
        return {
          rule,
          matched: false,
          shouldGenerateAlert: false,
          reason: 'No data available for rule type',
        };
      }

      // Evaluate condition
      const matched = this.evaluateCondition(rule.operator, actualValue, rule.thresholdValue);

      if (!matched) {
        // Rule not matched, resolve any existing violations
        await client.query(
          `UPDATE alert_rule_violations 
           SET resolved = true, resolved_at = NOW()
           WHERE rule_id = $1 AND battery_system_id = $2 AND resolved = false`,
          [rule.id, data.batterySystemId]
        );

        await this.logEvaluation(
          client,
          rule.id,
          data.batterySystemId,
          false,
          actualValue,
          rule.thresholdValue,
          'no_action'
        );
        await client.query('COMMIT');
        return {
          rule,
          matched: false,
          actualValue,
          shouldGenerateAlert: false,
          reason: 'Condition not met',
        };
      }

      // Rule matched, get or create violation
      const violation = await this.getOrCreateViolation(
        client,
        rule.id,
        data.batterySystemId,
        actualValue
      );

      // Check if we should generate alert based on debounce
      const shouldGenerate = this.shouldGenerateAlert(violation, rule.debounceMinutes);

      if (shouldGenerate) {
        const alertId = await this.generateAlertFromViolation(client, rule, violation);
        await this.logEvaluation(
          client,
          rule.id,
          data.batterySystemId,
          true,
          actualValue,
          rule.thresholdValue,
          'alert_created',
          alertId
        );
        await client.query('COMMIT');
        return {
          rule,
          matched: true,
          actualValue,
          shouldGenerateAlert: true,
          reason: `Alert generated after ${rule.debounceMinutes}min debounce`,
          violation,
        };
      } else {
        await this.logEvaluation(
          client,
          rule.id,
          data.batterySystemId,
          true,
          actualValue,
          rule.thresholdValue,
          'debounced'
        );
        await client.query('COMMIT');
        const minutesSinceFirst =
          (new Date().getTime() - new Date(violation.firstViolationAt).getTime()) / (1000 * 60);
        return {
          rule,
          matched: true,
          actualValue,
          shouldGenerateAlert: false,
          reason: `Debouncing: ${Math.floor(minutesSinceFirst)}/${rule.debounceMinutes} minutes elapsed`,
          violation,
        };
      }
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Evaluate all rules for sensor data
   */
  async evaluateSensorData(sensorData: SensorData): Promise<RuleEvaluationSummary> {
    const client = await pool.connect();
    try {
      // Get facility for battery system
      const facilityResult = await client.query(
        `SELECT facility_id FROM battery_systems WHERE id = $1`,
        [sensorData.batterySystemId]
      );

      if (facilityResult.rows.length === 0) {
        logger.warn('battery_system_not_found', { batterySystemId: sensorData.batterySystemId });
        return {
          totalRulesEvaluated: 0,
          rulesMatched: 0,
          alertsGenerated: 0,
          violationsDebounced: 0,
          errors: ['Battery system not found'],
        };
      }

      const facilityId = facilityResult.rows[0].facility_id;
      const rules = await this.getRulesForFacility(facilityId);

      const summary: RuleEvaluationSummary = {
        totalRulesEvaluated: 0,
        rulesMatched: 0,
        alertsGenerated: 0,
        violationsDebounced: 0,
        errors: [],
      };

      // Filter rules to only sensor-related types
      const sensorRules = rules.filter((r) =>
        ['temperature', 'voltage', 'soc', 'soh'].includes(r.ruleType)
      );

      for (const rule of sensorRules) {
        try {
          summary.totalRulesEvaluated++;
          const result = await this.evaluateRule(rule, sensorData);

          if (result.matched) {
            summary.rulesMatched++;
            if (result.shouldGenerateAlert) {
              summary.alertsGenerated++;
            } else {
              summary.violationsDebounced++;
            }
          }
        } catch (error) {
          const errorMsg = `Failed to evaluate rule ${rule.id}: ${
            error instanceof Error ? error.message : String(error)
          }`;
          logger.error('rule_evaluation_failed', { ruleId: rule.id, error: errorMsg });
          summary.errors.push(errorMsg);
        }
      }

      return summary;
    } finally {
      client.release();
    }
  }

  /**
   * Evaluate all rules for RUL data
   */
  async evaluateRULData(rulData: RULData): Promise<RuleEvaluationSummary> {
    const client = await pool.connect();
    try {
      // Get facility for battery system
      const facilityResult = await client.query(
        `SELECT facility_id FROM battery_systems WHERE id = $1`,
        [rulData.batterySystemId]
      );

      if (facilityResult.rows.length === 0) {
        logger.warn('battery_system_not_found', { batterySystemId: rulData.batterySystemId });
        return {
          totalRulesEvaluated: 0,
          rulesMatched: 0,
          alertsGenerated: 0,
          violationsDebounced: 0,
          errors: ['Battery system not found'],
        };
      }

      const facilityId = facilityResult.rows[0].facility_id;
      const rules = await this.getRulesForFacility(facilityId);

      const summary: RuleEvaluationSummary = {
        totalRulesEvaluated: 0,
        rulesMatched: 0,
        alertsGenerated: 0,
        violationsDebounced: 0,
        errors: [],
      };

      // Filter rules to only RUL type
      const rulRules = rules.filter((r) => r.ruleType === 'rul');

      for (const rule of rulRules) {
        try {
          summary.totalRulesEvaluated++;
          const result = await this.evaluateRule(rule, rulData);

          if (result.matched) {
            summary.rulesMatched++;
            if (result.shouldGenerateAlert) {
              summary.alertsGenerated++;
            } else {
              summary.violationsDebounced++;
            }
          }
        } catch (error) {
          const errorMsg = `Failed to evaluate rule ${rule.id}: ${
            error instanceof Error ? error.message : String(error)
          }`;
          logger.error('rule_evaluation_failed', { ruleId: rule.id, error: errorMsg });
          summary.errors.push(errorMsg);
        }
      }

      return summary;
    } finally {
      client.release();
    }
  }

  /**
   * Get audit log for a rule
   */
  async getAuditLog(
    ruleId: string,
    limit = 100
  ): Promise<Array<{
    id: string;
    ruleId: string;
    batterySystemId: string;
    evaluatedAt: Date;
    ruleMatched: boolean;
    actualValue?: number;
    thresholdValue?: number;
    actionTaken?: string;
    alertId?: string;
  }>> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT 
          id, rule_id as "ruleId", battery_system_id as "batterySystemId",
          evaluated_at as "evaluatedAt", rule_matched as "ruleMatched",
          actual_value as "actualValue", threshold_value as "thresholdValue",
          action_taken as "actionTaken", alert_id as "alertId"
         FROM alert_rule_audit_log
         WHERE rule_id = $1
         ORDER BY evaluated_at DESC
         LIMIT $2`,
        [ruleId, limit]
      );

      return result.rows;
    } finally {
      client.release();
    }
  }

  /**
   * Get active violations for a battery system
   */
  async getActiveViolations(batterySystemId: string): Promise<AlertRuleViolation[]> {
    const client = await pool.connect();
    try {
      const result = await client.query<AlertRuleViolationRow>(
        `SELECT * FROM alert_rule_violations
         WHERE battery_system_id = $1 AND resolved = false
         ORDER BY first_violation_at DESC`,
        [batterySystemId]
      );

      return result.rows.map((row) => this.rowToViolation(row));
    } finally {
      client.release();
    }
  }
}

export default AlertRuleEngineService.getInstance();
