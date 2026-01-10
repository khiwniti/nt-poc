/**
 * Alert Rule Evaluation Job
 * T118: US3 - Periodically evaluates alert rules against sensor/RUL data
 * 
 * Runs every 5 minutes to check latest sensor readings and RUL predictions
 * against configured alert rules
 */

import { pool } from '../config/database.js';
import alertRuleEngineService from './alertRuleEngineService.js';
import { logger } from '../observability/logger.js';
import type { SensorData, RULData } from '../types/alertRule.js';

interface JobMetrics {
  startTime: Date;
  endTime?: Date;
  batteriesChecked: number;
  sensorsEvaluated: number;
  rulEvaluated: number;
  alertsGenerated: number;
  errors: string[];
  lastError?: string;
}

interface JobStatus {
  isRunning: boolean;
  lastRun?: Date;
  metrics?: JobMetrics;
}

export class AlertRuleEvaluationJob {
  private isRunning = false;
  private intervalId?: NodeJS.Timeout;
  private lastRun?: Date;
  private metrics?: JobMetrics;
  private readonly intervalMinutes: number;

  constructor(intervalMinutes: number = 5) {
    this.intervalMinutes = intervalMinutes;
  }

  /**
   * Start the job scheduler
   */
  start(): void {
    if (this.intervalId) {
      logger.warn('alert_rule_job_already_running');
      return;
    }

    logger.info('alert_rule_job_started', { intervalMinutes: this.intervalMinutes });

    // Run immediately on start
    this.run().catch((error) => {
      logger.error('alert_rule_job_failed_initial_run', { error });
    });

    // Schedule recurring runs
    this.intervalId = setInterval(() => {
      this.run().catch((error) => {
        logger.error('alert_rule_job_failed', { error });
      });
    }, this.intervalMinutes * 60 * 1000);
  }

  /**
   * Stop the job scheduler
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
      logger.info('alert_rule_job_stopped');
    }
  }

  /**
   * Get job status
   */
  getStatus(): JobStatus {
    return {
      isRunning: this.isRunning,
      lastRun: this.lastRun,
      metrics: this.metrics,
    };
  }

  /**
   * Manually trigger a job run
   */
  async triggerManually(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Job is already running');
    }
    await this.run();
  }

  /**
   * Execute job: evaluate rules for all battery systems
   */
  private async run(): Promise<void> {
    if (this.isRunning) {
      logger.warn('alert_rule_job_already_running_skipping');
      return;
    }

    this.isRunning = true;
    this.lastRun = new Date();

    const metrics: JobMetrics = {
      startTime: new Date(),
      batteriesChecked: 0,
      sensorsEvaluated: 0,
      rulEvaluated: 0,
      alertsGenerated: 0,
      errors: [],
    };

    const client = await pool.connect();
    try {
      logger.info('alert_rule_job_run_started');

      // Get all active battery systems
      const batteriesResult = await client.query(
        `SELECT id, facility_id FROM battery_systems WHERE status != 'offline' ORDER BY id`
      );

      const batteries = batteriesResult.rows;
      logger.info('alert_rule_job_batteries_found', { count: batteries.length });

      for (const battery of batteries) {
        try {
          metrics.batteriesChecked++;

          // Get latest sensor reading (within last 10 minutes)
          const sensorResult = await client.query(
            `SELECT 
              battery_system_id,
              temperature,
              voltage,
              soc,
              soh,
              time as timestamp
             FROM sensor_readings
             WHERE battery_system_id = $1 
               AND time > NOW() - INTERVAL '10 minutes'
             ORDER BY time DESC
             LIMIT 1`,
            [battery.id]
          );

          if (sensorResult.rows.length > 0) {
            const sensorData: SensorData = {
              batterySystemId: sensorResult.rows[0].battery_system_id,
              temperature: sensorResult.rows[0].temperature ? Number(sensorResult.rows[0].temperature) : undefined,
              voltage: sensorResult.rows[0].voltage ? Number(sensorResult.rows[0].voltage) : undefined,
              soc: sensorResult.rows[0].soc ? Number(sensorResult.rows[0].soc) : undefined,
              soh: sensorResult.rows[0].soh ? Number(sensorResult.rows[0].soh) : undefined,
              timestamp: sensorResult.rows[0].timestamp,
            };

            const sensorSummary = await alertRuleEngineService.evaluateSensorData(sensorData);
            metrics.sensorsEvaluated++;
            metrics.rulEvaluated += sensorSummary.totalRulesEvaluated;
            metrics.alertsGenerated += sensorSummary.alertsGenerated;
            if (sensorSummary.errors.length > 0) {
              metrics.errors.push(...sensorSummary.errors);
            }
          }

          // Get latest RUL prediction (within last 24 hours)
          const rulResult = await client.query(
            `SELECT 
              battery_system_id,
              predicted_rul as "predictedRUL",
              prediction_date as "predictionDate"
             FROM rul_predictions
             WHERE battery_system_id = $1 
               AND prediction_date > NOW() - INTERVAL '24 hours'
             ORDER BY prediction_date DESC
             LIMIT 1`,
            [battery.id]
          );

          if (rulResult.rows.length > 0) {
            const rulData: RULData = {
              batterySystemId: rulResult.rows[0].battery_system_id,
              predictedRUL: Number(rulResult.rows[0].predictedRUL),
              predictionDate: rulResult.rows[0].predictionDate,
            };

            const rulSummary = await alertRuleEngineService.evaluateRULData(rulData);
            metrics.rulEvaluated++;
            metrics.rulEvaluated += rulSummary.totalRulesEvaluated;
            metrics.alertsGenerated += rulSummary.alertsGenerated;
            if (rulSummary.errors.length > 0) {
              metrics.errors.push(...rulSummary.errors);
            }
          }
        } catch (error) {
          const errorMsg = `Failed to evaluate battery ${battery.id}: ${
            error instanceof Error ? error.message : String(error)
          }`;
          logger.error('alert_rule_job_battery_failed', { batteryId: battery.id, error: errorMsg });
          metrics.errors.push(errorMsg);
          metrics.lastError = errorMsg;
        }
      }

      metrics.endTime = new Date();
      this.metrics = metrics;

      logger.info('alert_rule_job_run_completed', {
        durationMs: metrics.endTime.getTime() - metrics.startTime.getTime(),
        batteriesChecked: metrics.batteriesChecked,
        sensorsEvaluated: metrics.sensorsEvaluated,
        rulEvaluated: metrics.rulEvaluated,
        alertsGenerated: metrics.alertsGenerated,
        errorsCount: metrics.errors.length,
      });
    } catch (error) {
      metrics.endTime = new Date();
      const errorMsg = `Alert rule job failed: ${error instanceof Error ? error.message : String(error)}`;
      metrics.errors.push(errorMsg);
      metrics.lastError = errorMsg;
      this.metrics = metrics;
      logger.error('alert_rule_job_failed', { error: errorMsg });
      throw error;
    } finally {
      client.release();
      this.isRunning = false;
    }
  }
}

// Singleton instance
let jobInstance: AlertRuleEvaluationJob | null = null;

export function getAlertRuleJob(): AlertRuleEvaluationJob {
  if (!jobInstance) {
    jobInstance = new AlertRuleEvaluationJob(5); // 5 minutes default
  }
  return jobInstance;
}

export function startAlertRuleJob(): void {
  const job = getAlertRuleJob();
  job.start();
}

export function stopAlertRuleJob(): void {
  if (jobInstance) {
    jobInstance.stop();
  }
}
