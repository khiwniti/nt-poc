/**
 * Alert Rule Engine Service Tests
 * T118: US3 - Comprehensive tests for alert rule evaluation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { pool } from '../../config/database.js';
import alertRuleEngineService from '../alertRuleEngineService.js';
import type {
  AlertRule,
  CreateAlertRuleRequest,
  SensorData,
  RULData,
} from '../../types/alertRule.js';

describe('AlertRuleEngineService', () => {
  let testFacilityId: string;
  let testBatterySystemId: string;
  let createdRuleIds: string[] = [];

  beforeEach(async () => {
    const client = await pool.connect();
    try {
      // Create test facility
      const facilityResult = await client.query(
        `INSERT INTO facilities (name, location, timezone) VALUES ($1, $2, $3) RETURNING id`,
        ['Test Facility', 'Test Location', 'UTC']
      );
      testFacilityId = facilityResult.rows[0].id;

      // Create test battery system
      const batteryResult = await client.query(
        `INSERT INTO battery_systems (facility_id, name, capacity_kwh, status) 
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [testFacilityId, 'Test Battery', 100, 'online']
      );
      testBatterySystemId = batteryResult.rows[0].id;
    } finally {
      client.release();
    }
  });

  afterEach(async () => {
    const client = await pool.connect();
    try {
      // Clean up created rules
      if (createdRuleIds.length > 0) {
        await client.query(`DELETE FROM alert_rules WHERE id = ANY($1)`, [createdRuleIds]);
      }

      // Clean up test data
      await client.query(`DELETE FROM battery_systems WHERE id = $1`, [testBatterySystemId]);
      await client.query(`DELETE FROM facilities WHERE id = $1`, [testFacilityId]);

      createdRuleIds = [];
    } finally {
      client.release();
    }
  });

  describe('Rule CRUD Operations', () => {
    it('should create a new alert rule', async () => {
      const request: CreateAlertRuleRequest = {
        facilityId: testFacilityId,
        name: 'High Temperature Alert',
        description: 'Alert when temperature exceeds 45°C',
        ruleType: 'temperature',
        operator: '>',
        thresholdValue: 45.0,
        severity: 'high',
        enabled: true,
        debounceMinutes: 5,
      };

      const rule = await alertRuleEngineService.createRule(request);
      createdRuleIds.push(rule.id);

      expect(rule).toBeDefined();
      expect(rule.name).toBe('High Temperature Alert');
      expect(rule.ruleType).toBe('temperature');
      expect(rule.thresholdValue).toBe(45.0);
      expect(rule.enabled).toBe(true);
    });

    it('should get rule by ID', async () => {
      const request: CreateAlertRuleRequest = {
        facilityId: testFacilityId,
        name: 'Low Voltage Alert',
        ruleType: 'voltage',
        operator: '<',
        thresholdValue: 2.5,
        severity: 'critical',
      };

      const created = await alertRuleEngineService.createRule(request);
      createdRuleIds.push(created.id);

      const retrieved = await alertRuleEngineService.getRuleById(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.name).toBe('Low Voltage Alert');
    });

    it('should get rules for facility', async () => {
      const request1: CreateAlertRuleRequest = {
        facilityId: testFacilityId,
        name: 'Rule 1',
        ruleType: 'temperature',
        operator: '>',
        thresholdValue: 50,
        severity: 'high',
      };
      const request2: CreateAlertRuleRequest = {
        facilityId: testFacilityId,
        name: 'Rule 2',
        ruleType: 'voltage',
        operator: '<',
        thresholdValue: 3.0,
        severity: 'medium',
      };

      const rule1 = await alertRuleEngineService.createRule(request1);
      const rule2 = await alertRuleEngineService.createRule(request2);
      createdRuleIds.push(rule1.id, rule2.id);

      const rules = await alertRuleEngineService.getRulesForFacility(testFacilityId);

      expect(rules.length).toBeGreaterThanOrEqual(2);
      const ruleNames = rules.map((r) => r.name);
      expect(ruleNames).toContain('Rule 1');
      expect(ruleNames).toContain('Rule 2');
    });

    it('should update an alert rule', async () => {
      const request: CreateAlertRuleRequest = {
        facilityId: testFacilityId,
        name: 'Original Name',
        ruleType: 'soc',
        operator: '<',
        thresholdValue: 20,
        severity: 'medium',
      };

      const rule = await alertRuleEngineService.createRule(request);
      createdRuleIds.push(rule.id);

      const updated = await alertRuleEngineService.updateRule(rule.id, {
        name: 'Updated Name',
        thresholdValue: 15,
        severity: 'high',
      });

      expect(updated.name).toBe('Updated Name');
      expect(updated.thresholdValue).toBe(15);
      expect(updated.severity).toBe('high');
    });

    it('should delete an alert rule', async () => {
      const request: CreateAlertRuleRequest = {
        facilityId: testFacilityId,
        name: 'To Be Deleted',
        ruleType: 'soh',
        operator: '<',
        thresholdValue: 70,
        severity: 'critical',
      };

      const rule = await alertRuleEngineService.createRule(request);
      await alertRuleEngineService.deleteRule(rule.id);

      const retrieved = await alertRuleEngineService.getRuleById(rule.id);
      expect(retrieved).toBeNull();
    });
  });

  describe('Rule Evaluation', () => {
    it('should match temperature threshold violation', async () => {
      const request: CreateAlertRuleRequest = {
        facilityId: testFacilityId,
        name: 'High Temp',
        ruleType: 'temperature',
        operator: '>',
        thresholdValue: 45.0,
        severity: 'high',
        debounceMinutes: 0, // No debounce for immediate test
      };

      const rule = await alertRuleEngineService.createRule(request);
      createdRuleIds.push(rule.id);

      const sensorData: SensorData = {
        batterySystemId: testBatterySystemId,
        temperature: 50.0,
        voltage: 3.7,
        soc: 80,
        soh: 95,
        timestamp: new Date(),
      };

      const result = await alertRuleEngineService.evaluateRule(rule, sensorData);

      expect(result.matched).toBe(true);
      expect(result.actualValue).toBe(50.0);
      expect(result.shouldGenerateAlert).toBe(true);
    });

    it('should not match when threshold not violated', async () => {
      const request: CreateAlertRuleRequest = {
        facilityId: testFacilityId,
        name: 'Low Voltage',
        ruleType: 'voltage',
        operator: '<',
        thresholdValue: 2.5,
        severity: 'critical',
      };

      const rule = await alertRuleEngineService.createRule(request);
      createdRuleIds.push(rule.id);

      const sensorData: SensorData = {
        batterySystemId: testBatterySystemId,
        temperature: 30,
        voltage: 3.7, // Above threshold
        soc: 80,
        soh: 95,
        timestamp: new Date(),
      };

      const result = await alertRuleEngineService.evaluateRule(rule, sensorData);

      expect(result.matched).toBe(false);
      expect(result.shouldGenerateAlert).toBe(false);
    });

    it('should debounce violations', async () => {
      const request: CreateAlertRuleRequest = {
        facilityId: testFacilityId,
        name: 'Low SoC',
        ruleType: 'soc',
        operator: '<',
        thresholdValue: 20,
        severity: 'medium',
        debounceMinutes: 10, // 10 minute debounce
      };

      const rule = await alertRuleEngineService.createRule(request);
      createdRuleIds.push(rule.id);

      const sensorData: SensorData = {
        batterySystemId: testBatterySystemId,
        temperature: 30,
        voltage: 3.7,
        soc: 15, // Below threshold
        soh: 95,
        timestamp: new Date(),
      };

      // First evaluation should create violation but not alert
      const result1 = await alertRuleEngineService.evaluateRule(rule, sensorData);
      expect(result1.matched).toBe(true);
      expect(result1.shouldGenerateAlert).toBe(false);
      expect(result1.reason).toContain('Debouncing');

      // Second evaluation immediately after should still be debounced
      const result2 = await alertRuleEngineService.evaluateRule(rule, sensorData);
      expect(result2.matched).toBe(true);
      expect(result2.shouldGenerateAlert).toBe(false);
    });

    it('should evaluate RUL threshold', async () => {
      const request: CreateAlertRuleRequest = {
        facilityId: testFacilityId,
        name: 'Low RUL',
        ruleType: 'rul',
        operator: '<',
        thresholdValue: 30,
        severity: 'high',
        debounceMinutes: 0,
      };

      const rule = await alertRuleEngineService.createRule(request);
      createdRuleIds.push(rule.id);

      const rulData: RULData = {
        batterySystemId: testBatterySystemId,
        predictedRUL: 25, // Below 30
        predictionDate: new Date(),
      };

      const result = await alertRuleEngineService.evaluateRule(rule, rulData);

      expect(result.matched).toBe(true);
      expect(result.actualValue).toBe(25);
      expect(result.shouldGenerateAlert).toBe(true);
    });

    it('should support different operators', async () => {
      // Greater than or equal
      const rule1 = await alertRuleEngineService.createRule({
        facilityId: testFacilityId,
        name: 'Temp GTE',
        ruleType: 'temperature',
        operator: '>=',
        thresholdValue: 45.0,
        severity: 'medium',
        debounceMinutes: 0,
      });
      createdRuleIds.push(rule1.id);

      const data1: SensorData = {
        batterySystemId: testBatterySystemId,
        temperature: 45.0,
        timestamp: new Date(),
      };

      const result1 = await alertRuleEngineService.evaluateRule(rule1, data1);
      expect(result1.matched).toBe(true);

      // Less than or equal
      const rule2 = await alertRuleEngineService.createRule({
        facilityId: testFacilityId,
        name: 'Voltage LTE',
        ruleType: 'voltage',
        operator: '<=',
        thresholdValue: 2.5,
        severity: 'critical',
        debounceMinutes: 0,
      });
      createdRuleIds.push(rule2.id);

      const data2: SensorData = {
        batterySystemId: testBatterySystemId,
        voltage: 2.5,
        timestamp: new Date(),
      };

      const result2 = await alertRuleEngineService.evaluateRule(rule2, data2);
      expect(result2.matched).toBe(true);
    });
  });

  describe('Bulk Evaluation', () => {
    it('should evaluate all sensor data rules', async () => {
      // Create multiple rules
      await alertRuleEngineService.createRule({
        facilityId: testFacilityId,
        name: 'High Temp',
        ruleType: 'temperature',
        operator: '>',
        thresholdValue: 45,
        severity: 'high',
        debounceMinutes: 0,
      });

      await alertRuleEngineService.createRule({
        facilityId: testFacilityId,
        name: 'Low SoC',
        ruleType: 'soc',
        operator: '<',
        thresholdValue: 20,
        severity: 'medium',
        debounceMinutes: 0,
      });

      const sensorData: SensorData = {
        batterySystemId: testBatterySystemId,
        temperature: 50, // Violates temp rule
        voltage: 3.7,
        soc: 15, // Violates SoC rule
        soh: 90,
        timestamp: new Date(),
      };

      const summary = await alertRuleEngineService.evaluateSensorData(sensorData);

      expect(summary.totalRulesEvaluated).toBeGreaterThan(0);
      expect(summary.rulesMatched).toBeGreaterThan(0);
    });
  });

  describe('Audit Log', () => {
    it('should create audit log entries', async () => {
      const rule = await alertRuleEngineService.createRule({
        facilityId: testFacilityId,
        name: 'Test Rule',
        ruleType: 'temperature',
        operator: '>',
        thresholdValue: 45,
        severity: 'high',
        debounceMinutes: 0,
      });
      createdRuleIds.push(rule.id);

      const sensorData: SensorData = {
        batterySystemId: testBatterySystemId,
        temperature: 50,
        timestamp: new Date(),
      };

      await alertRuleEngineService.evaluateRule(rule, sensorData);

      const auditLog = await alertRuleEngineService.getAuditLog(rule.id);

      expect(auditLog.length).toBeGreaterThan(0);
      expect(auditLog[0].ruleId).toBe(rule.id);
      expect(auditLog[0].batterySystemId).toBe(testBatterySystemId);
      expect(auditLog[0].ruleMatched).toBe(true);
    });
  });

  describe('Violation Tracking', () => {
    it('should track active violations', async () => {
      const rule = await alertRuleEngineService.createRule({
        facilityId: testFacilityId,
        name: 'Test Violation',
        ruleType: 'soh',
        operator: '<',
        thresholdValue: 70,
        severity: 'critical',
        debounceMinutes: 10,
      });
      createdRuleIds.push(rule.id);

      const sensorData: SensorData = {
        batterySystemId: testBatterySystemId,
        soh: 65,
        timestamp: new Date(),
      };

      await alertRuleEngineService.evaluateRule(rule, sensorData);

      const violations = await alertRuleEngineService.getActiveViolations(testBatterySystemId);

      expect(violations.length).toBeGreaterThan(0);
      expect(violations[0].batterySystemId).toBe(testBatterySystemId);
      expect(violations[0].resolved).toBe(false);
    });

    it('should resolve violations when threshold no longer violated', async () => {
      const rule = await alertRuleEngineService.createRule({
        facilityId: testFacilityId,
        name: 'Test Resolution',
        ruleType: 'temperature',
        operator: '>',
        thresholdValue: 45,
        severity: 'high',
        debounceMinutes: 10,
      });
      createdRuleIds.push(rule.id);

      // Create violation
      const data1: SensorData = {
        batterySystemId: testBatterySystemId,
        temperature: 50,
        timestamp: new Date(),
      };
      await alertRuleEngineService.evaluateRule(rule, data1);

      let violations = await alertRuleEngineService.getActiveViolations(testBatterySystemId);
      expect(violations.length).toBeGreaterThan(0);

      // Resolve violation
      const data2: SensorData = {
        batterySystemId: testBatterySystemId,
        temperature: 40, // Below threshold
        timestamp: new Date(),
      };
      await alertRuleEngineService.evaluateRule(rule, data2);

      violations = await alertRuleEngineService.getActiveViolations(testBatterySystemId);
      expect(violations.length).toBe(0);
    });
  });
});
