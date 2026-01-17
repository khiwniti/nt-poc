/**
 * Scheduled ML Prediction Job
 * T143: Create scheduled job to run ML predictions every 1 hour for all active batteries
 *
 * Features:
 * - Runs every 1 hour (configurable)
 * - Batch processes all active batteries
 * - Stores predictions in RULPrediction table
 * - Error handling and retry logic
 * - Job execution logging and metrics
 */

import * as cron from 'node-cron';
import { pool } from '../config/database.js';
import { getModel, initializeModel } from '../ml/predictiveMaintenanceModel.js';
import type { MaintenanceFeatures } from '../types/predictiveMaintenance.js';
import { logger } from '../observability/logger.js';

interface JobMetrics {
  startTime: Date;
  endTime?: Date;
  batteriesProcessed: number;
  predictionsCreated: number;
  errors: number;
  lastError?: string;
}

interface BatteryData {
  id: string;
  current_soh: number;
  last_soh_delta: number;
  anomaly_count: number;
  max_temp: number;
  min_voltage: number;
}

export class ScheduledPredictionJob {
  private task: cron.ScheduledTask | null = null;
  private isRunning: boolean = false;
  private lastRun: Date | null = null;
  private lastMetrics: JobMetrics | null = null;
  private readonly cronExpression: string;
  private readonly retryAttempts: number;
  private readonly retryDelayMs: number;

  constructor(
    intervalMinutes: number = 60,
    retryAttempts: number = 3,
    retryDelayMs: number = 5000
  ) {
    // Convert minutes to cron expression (runs at minute 0 of every Nth hour)
    this.cronExpression =
      intervalMinutes >= 60
        ? `0 */${Math.floor(intervalMinutes / 60)} * * *`
        : `*/${intervalMinutes} * * * *`;

    this.retryAttempts = retryAttempts;
    this.retryDelayMs = retryDelayMs;
  }

  /**
   * Start the scheduled job
   */
  async start(): Promise<void> {
    if (this.task) {
      logger.info('scheduled_prediction_job_already_running');
      return;
    }

    // Initialize ML model
    await this.initializeMLModel();

    logger.info('scheduled_prediction_job_starting', { cronExpression: this.cronExpression });

    this.task = cron.schedule(this.cronExpression, async () => {
      await this.runJob();
    });

    logger.info('scheduled_prediction_job_started');
  }

  /**
   * Stop the scheduled job
   */
  stop(): void {
    if (this.task) {
      this.task.stop();
      this.task = null;
      logger.info('scheduled_prediction_job_stopped');
    }
  }

  /**
   * Initialize the ML model
   */
  private async initializeMLModel(): Promise<void> {
    try {
      logger.info('ml_model_initializing');
      await initializeModel();
      logger.info('ml_model_initialized');
    } catch (error) {
      logger.error('ml_model_initialize_failed', { error });
      throw new Error('Cannot start prediction job without ML model');
    }
  }

  /**
   * Run the prediction job
   */
  private async runJob(): Promise<void> {
    if (this.isRunning) {
      logger.info('scheduled_prediction_job_skipped_previous_still_running');
      return;
    }

    this.isRunning = true;
    const metrics: JobMetrics = {
      startTime: new Date(),
      batteriesProcessed: 0,
      predictionsCreated: 0,
      errors: 0,
    };

    try {
      logger.info('scheduled_prediction_job_run_started', {
        startTime: metrics.startTime.toISOString(),
      });

      // Fetch all active batteries
      const batteries = await this.fetchActiveBatteries();
      logger.info('scheduled_prediction_job_batteries_fetched', { count: batteries.length });

      // Process each battery with error handling
      for (const battery of batteries) {
        try {
          await this.processBatteryWithRetry(battery, metrics);
          metrics.batteriesProcessed++;
        } catch (error) {
          metrics.errors++;
          metrics.lastError = error instanceof Error ? error.message : 'Unknown error';
          logger.error('scheduled_prediction_job_battery_failed', { batteryId: battery.id, error });
        }
      }

      metrics.endTime = new Date();
      this.lastRun = metrics.endTime;
      this.lastMetrics = metrics;

      const duration = metrics.endTime.getTime() - metrics.startTime.getTime();
      logger.info('scheduled_prediction_job_run_completed', {
        endTime: metrics.endTime.toISOString(),
        durationMs: duration,
        batteriesProcessed: metrics.batteriesProcessed,
        predictionsCreated: metrics.predictionsCreated,
        errors: metrics.errors,
      });
    } catch (error) {
      metrics.endTime = new Date();
      metrics.lastError = error instanceof Error ? error.message : 'Unknown error';
      this.lastMetrics = metrics;

      logger.error('scheduled_prediction_job_critical_error', { error });
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Fetch all active battery systems from the database
   */
  private async fetchActiveBatteries(): Promise<BatteryData[]> {
    const query = `
      SELECT 
        bs.id,
        bs.current_soh,
        -- Calculate SoH delta from recent readings
        COALESCE(
          (bs.current_soh - LAG(bs.current_soh) OVER (PARTITION BY bs.id ORDER BY bs.updated_at)) / 
          NULLIF(EXTRACT(EPOCH FROM (bs.updated_at - LAG(bs.updated_at) OVER (PARTITION BY bs.id ORDER BY bs.updated_at))) / 86400, 0),
          -0.01
        ) as last_soh_delta,
        -- Count anomalies in last 24 hours
        COALESCE(
          (SELECT COUNT(*) 
           FROM sensor_readings sr 
           WHERE sr.battery_system_id = bs.id 
             AND sr.timestamp > NOW() - INTERVAL '24 hours'
             AND (sr.temperature > 60 OR sr.voltage < 3.0 OR sr.current > 100)),
          0
        ) as anomaly_count,
        -- Get max temperature in last 24 hours
        COALESCE(
          (SELECT MAX(temperature) 
           FROM sensor_readings sr 
           WHERE sr.battery_system_id = bs.id 
             AND sr.timestamp > NOW() - INTERVAL '24 hours'),
          25
        ) as max_temp,
        -- Get min voltage in last 24 hours
        COALESCE(
          (SELECT MIN(voltage) 
           FROM sensor_readings sr 
           WHERE sr.battery_system_id = bs.id 
             AND sr.timestamp > NOW() - INTERVAL '24 hours'),
          3.7
        ) as min_voltage
      FROM battery_systems bs
      WHERE bs.status = 'active'
      ORDER BY bs.id
    `;

    const result = await pool.query<BatteryData>(query);
    return result.rows;
  }

  /**
   * Process a single battery with retry logic
   */
  private async processBatteryWithRetry(battery: BatteryData, metrics: JobMetrics): Promise<void> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        await this.processBattery(battery, metrics);
        return; // Success
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');

        if (attempt < this.retryAttempts) {
          console.warn(
            `Retry ${attempt}/${this.retryAttempts} for battery ${battery.id}:`,
            lastError.message
          );
          await this.delay(this.retryDelayMs * attempt); // Exponential backoff
        }
      }
    }

    throw lastError; // All retries exhausted
  }

  /**
   * Process a single battery system
   */
  private async processBattery(battery: BatteryData, metrics: JobMetrics): Promise<void> {
    // Extract features from battery data
    const features: MaintenanceFeatures = {
      sohDelta: battery.last_soh_delta,
      anomalyCount: battery.anomaly_count,
      tempMax: battery.max_temp,
      voltageMin: battery.min_voltage,
    };

    // Get ML model prediction
    const model = getModel();
    const prediction = await model.predict(battery.id, features);

    // Convert risk level to RUL (days)
    const rulMap: Record<string, number> = {
      '7d': 7,
      '14d': 14,
      '30d': 30,
      safe: 365, // 1 year for safe batteries
    };
    const predictedRUL = rulMap[prediction.riskLevel] || 365;

    // Calculate confidence from probabilities
    const confidence = Math.max(
      prediction.probability7d,
      prediction.probability14d,
      prediction.probability30d
    );

    // Store prediction in database
    await this.storePrediction({
      batterySystemId: battery.id,
      predictedRUL,
      confidence,
      modelVersion: prediction.modelVersion,
      features: {
        ...features,
        riskLevel: prediction.riskLevel,
        probabilities: {
          '7d': prediction.probability7d,
          '14d': prediction.probability14d,
          '30d': prediction.probability30d,
        },
      },
    });

    metrics.predictionsCreated++;
  }

  /**
   * Store prediction in the database
   */
  private async storePrediction(prediction: {
    batterySystemId: string;
    predictedRUL: number;
    confidence: number;
    modelVersion: string;
    features: Record<string, unknown>;
  }): Promise<void> {
    const query = `
      INSERT INTO rul_predictions (
        id,
        battery_system_id,
        predicted_rul,
        confidence,
        prediction_date,
        model_version,
        features,
        created_at
      ) VALUES (
        gen_random_uuid(),
        $1,
        $2,
        $3,
        NOW(),
        $4,
        $5,
        NOW()
      )
    `;

    await pool.query(query, [
      prediction.batterySystemId,
      prediction.predictedRUL,
      prediction.confidence,
      prediction.modelVersion,
      JSON.stringify(prediction.features),
    ]);
  }

  /**
   * Delay utility for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get job status and metrics
   */
  getStatus(): {
    isRunning: boolean;
    lastRun: Date | null;
    metrics: JobMetrics | null;
  } {
    return {
      isRunning: this.isRunning,
      lastRun: this.lastRun,
      metrics: this.lastMetrics,
    };
  }

  /**
   * Manually trigger the job (for testing/debugging)
   */
  async triggerManually(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Job is already running');
    }
    await this.runJob();
  }
}

// Singleton instance
let jobInstance: ScheduledPredictionJob | null = null;

/**
 * Get the scheduled job instance
 */
export function getScheduledJob(intervalMinutes: number = 60): ScheduledPredictionJob {
  if (!jobInstance) {
    jobInstance = new ScheduledPredictionJob(intervalMinutes);
  }
  return jobInstance;
}

/**
 * Start the scheduled prediction job
 */
export async function startScheduledJob(intervalMinutes: number = 60): Promise<void> {
  const job = getScheduledJob(intervalMinutes);
  await job.start();
}

/**
 * Stop the scheduled prediction job
 */
export function stopScheduledJob(): void {
  if (jobInstance) {
    jobInstance.stop();
  }
}
