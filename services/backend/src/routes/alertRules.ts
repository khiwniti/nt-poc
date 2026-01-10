/**
 * Alert Rule Management Routes
 * T118: US3 - API endpoints for alert rule CRUD and management
 */

import express, { Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import alertRuleEngineService from '../services/alertRuleEngineService.js';
import { getAlertRuleJob } from '../services/alertRuleEvaluationJob.js';
import type {
  CreateAlertRuleRequest,
  UpdateAlertRuleRequest,
  RuleType,
  RuleOperator,
  AlertSeverity,
} from '../types/alertRule.js';

const router = express.Router();

router.use(authenticate);

// GET /api/v1/alert-rules - List all alert rules for a facility
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { facilityId, enabledOnly = 'true' } = req.query;

    if (!facilityId || typeof facilityId !== 'string') {
      return res.status(400).json({ error: 'facilityId query parameter is required' });
    }

    const rules = await alertRuleEngineService.getRulesForFacility(
      facilityId,
      enabledOnly === 'true'
    );

    res.json({
      data: rules,
      total: rules.length,
    });
  } catch (error) {
    console.error('Error fetching alert rules:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/v1/alert-rules/:id - Get a specific alert rule
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const rule = await alertRuleEngineService.getRuleById(id);

    if (!rule) {
      return res.status(404).json({ error: 'Alert rule not found' });
    }

    res.json({ data: rule });
  } catch (error) {
    console.error('Error fetching alert rule:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/v1/alert-rules - Create a new alert rule
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const {
      facilityId,
      name,
      description,
      ruleType,
      operator,
      thresholdValue,
      severity,
      enabled,
      debounceMinutes,
      metadata,
    } = req.body;

    // Validation
    if (!facilityId || typeof facilityId !== 'string') {
      return res.status(400).json({ error: 'facilityId is required' });
    }
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'name is required' });
    }
    if (!ruleType || !['temperature', 'voltage', 'soc', 'soh', 'rul'].includes(ruleType)) {
      return res.status(400).json({
        error: 'ruleType must be one of: temperature, voltage, soc, soh, rul',
      });
    }
    if (!operator || !['>', '>=', '<', '<=', '==', '!='].includes(operator)) {
      return res.status(400).json({
        error: 'operator must be one of: >, >=, <, <=, ==, !=',
      });
    }
    if (typeof thresholdValue !== 'number') {
      return res.status(400).json({ error: 'thresholdValue must be a number' });
    }
    if (!severity || !['info', 'medium', 'high', 'critical'].includes(severity)) {
      return res.status(400).json({
        error: 'severity must be one of: info, medium, high, critical',
      });
    }

    const request: CreateAlertRuleRequest = {
      facilityId,
      name,
      description,
      ruleType: ruleType as RuleType,
      operator: operator as RuleOperator,
      thresholdValue,
      severity: severity as AlertSeverity,
      enabled,
      debounceMinutes,
      metadata,
    };

    const rule = await alertRuleEngineService.createRule(request);

    res.status(201).json({
      success: true,
      message: 'Alert rule created successfully',
      data: rule,
    });
  } catch (error) {
    console.error('Error creating alert rule:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/v1/alert-rules/:id - Update an alert rule
router.patch('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      operator,
      thresholdValue,
      severity,
      enabled,
      debounceMinutes,
      metadata,
    } = req.body;

    // Validation
    if (operator && !['>', '>=', '<', '<=', '==', '!='].includes(operator)) {
      return res.status(400).json({
        error: 'operator must be one of: >, >=, <, <=, ==, !=',
      });
    }
    if (thresholdValue !== undefined && typeof thresholdValue !== 'number') {
      return res.status(400).json({ error: 'thresholdValue must be a number' });
    }
    if (severity && !['info', 'medium', 'high', 'critical'].includes(severity)) {
      return res.status(400).json({
        error: 'severity must be one of: info, medium, high, critical',
      });
    }

    const request: UpdateAlertRuleRequest = {
      name,
      description,
      operator: operator as RuleOperator | undefined,
      thresholdValue,
      severity: severity as AlertSeverity | undefined,
      enabled,
      debounceMinutes,
      metadata,
    };

    const rule = await alertRuleEngineService.updateRule(id, request);

    res.json({
      success: true,
      message: 'Alert rule updated successfully',
      data: rule,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ error: 'Alert rule not found' });
    }
    console.error('Error updating alert rule:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/v1/alert-rules/:id - Delete an alert rule
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    await alertRuleEngineService.deleteRule(id);

    res.json({
      success: true,
      message: 'Alert rule deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting alert rule:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/v1/alert-rules/:id/audit-log - Get audit log for a rule
router.get('/:id/audit-log', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { limit = '100' } = req.query;

    const limitNum = parseInt(limit as string, 10);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 1000) {
      return res.status(400).json({ error: 'limit must be between 1 and 1000' });
    }

    const auditLog = await alertRuleEngineService.getAuditLog(id, limitNum);

    res.json({
      data: auditLog,
      total: auditLog.length,
    });
  } catch (error) {
    console.error('Error fetching audit log:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/v1/alert-rules/violations/:batterySystemId - Get active violations for a battery
router.get('/violations/:batterySystemId', async (req: AuthRequest, res: Response) => {
  try {
    const { batterySystemId } = req.params;

    const violations = await alertRuleEngineService.getActiveViolations(batterySystemId);

    res.json({
      data: violations,
      total: violations.length,
    });
  } catch (error) {
    console.error('Error fetching violations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/v1/alert-rules/job/status - Get rule evaluation job status
router.get('/job/status', async (req: AuthRequest, res: Response) => {
  try {
    const job = getAlertRuleJob();
    const status = job.getStatus();

    res.json({
      data: {
        isRunning: status.isRunning,
        lastRun: status.lastRun,
        metrics: status.metrics
          ? {
              startTime: status.metrics.startTime,
              endTime: status.metrics.endTime,
              durationMs: status.metrics.endTime
                ? status.metrics.endTime.getTime() - status.metrics.startTime.getTime()
                : null,
              batteriesChecked: status.metrics.batteriesChecked,
              sensorsEvaluated: status.metrics.sensorsEvaluated,
              rulEvaluated: status.metrics.rulEvaluated,
              alertsGenerated: status.metrics.alertsGenerated,
              errors: status.metrics.errors,
              lastError: status.metrics.lastError,
            }
          : null,
      },
    });
  } catch (error) {
    console.error('Error fetching job status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/v1/alert-rules/job/trigger - Manually trigger rule evaluation job
router.post('/job/trigger', async (req: AuthRequest, res: Response) => {
  try {
    const job = getAlertRuleJob();

    job.triggerManually().catch((error) => {
      console.error('Error in manually triggered rule evaluation job:', error);
    });

    res.json({
      success: true,
      message: 'Rule evaluation job triggered successfully',
      data: {
        triggeredAt: new Date(),
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('already running')) {
      return res.status(409).json({ error: 'Job is already running' });
    }

    console.error('Error triggering rule evaluation job:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
