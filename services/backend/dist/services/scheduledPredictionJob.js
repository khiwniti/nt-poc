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
import { pool } from '../config/database';
import { getModel, initializeModel } from '../ml/predictiveMaintenanceModel';
import { logger } from '../observability/logger';
export class ScheduledPredictionJob {
    task = null;
    isRunning = false;
    lastRun = null;
    lastMetrics = null;
    cronExpression;
    retryAttempts;
    retryDelayMs;
    constructor(intervalMinutes = 60, retryAttempts = 3, retryDelayMs = 5000) {
        // Convert minutes to cron expression (runs at minute 0 of every Nth hour)
        this.cronExpression = intervalMinutes >= 60
            ? `0 */${Math.floor(intervalMinutes / 60)} * * *`
            : `*/${intervalMinutes} * * * *`;
        this.retryAttempts = retryAttempts;
        this.retryDelayMs = retryDelayMs;
    }
    /**
     * Start the scheduled job
     */
    async start() {
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
    stop() {
        if (this.task) {
            this.task.stop();
            this.task = null;
            logger.info('scheduled_prediction_job_stopped');
        }
    }
    /**
     * Initialize the ML model
     */
    async initializeMLModel() {
        try {
            logger.info('ml_model_initializing');
            await initializeModel();
            logger.info('ml_model_initialized');
        }
        catch (error) {
            logger.error('ml_model_initialize_failed', { error });
            throw new Error('Cannot start prediction job without ML model');
        }
    }
    /**
     * Run the prediction job
     */
    async runJob() {
        if (this.isRunning) {
            logger.info('scheduled_prediction_job_skipped_previous_still_running');
            return;
        }
        this.isRunning = true;
        const metrics = {
            startTime: new Date(),
            batteriesProcessed: 0,
            predictionsCreated: 0,
            errors: 0,
        };
        try {
            logger.info('scheduled_prediction_job_run_started', { startTime: metrics.startTime.toISOString() });
            // Fetch all active batteries
            const batteries = await this.fetchActiveBatteries();
            logger.info('scheduled_prediction_job_batteries_fetched', { count: batteries.length });
            // Process each battery with error handling
            for (const battery of batteries) {
                try {
                    await this.processBatteryWithRetry(battery, metrics);
                    metrics.batteriesProcessed++;
                }
                catch (error) {
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
        }
        catch (error) {
            metrics.endTime = new Date();
            metrics.lastError = error instanceof Error ? error.message : 'Unknown error';
            this.lastMetrics = metrics;
            logger.error('scheduled_prediction_job_critical_error', { error });
        }
        finally {
            this.isRunning = false;
        }
    }
    /**
     * Fetch all active battery systems from the database
     */
    async fetchActiveBatteries() {
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
        const result = await pool.query(query);
        return result.rows;
    }
    /**
     * Process a single battery with retry logic
     */
    async processBatteryWithRetry(battery, metrics) {
        let lastError = null;
        for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
            try {
                await this.processBattery(battery, metrics);
                return; // Success
            }
            catch (error) {
                lastError = error instanceof Error ? error : new Error('Unknown error');
                if (attempt < this.retryAttempts) {
                    console.warn(`Retry ${attempt}/${this.retryAttempts} for battery ${battery.id}:`, lastError.message);
                    await this.delay(this.retryDelayMs * attempt); // Exponential backoff
                }
            }
        }
        throw lastError; // All retries exhausted
    }
    /**
     * Process a single battery system
     */
    async processBattery(battery, metrics) {
        // Extract features from battery data
        const features = {
            sohDelta: battery.last_soh_delta,
            anomalyCount: battery.anomaly_count,
            tempMax: battery.max_temp,
            voltageMin: battery.min_voltage,
        };
        // Get ML model prediction
        const model = getModel();
        const prediction = await model.predict(battery.id, features);
        // Convert risk level to RUL (days)
        const rulMap = {
            '7d': 7,
            '14d': 14,
            '30d': 30,
            'safe': 365, // 1 year for safe batteries
        };
        const predictedRUL = rulMap[prediction.riskLevel] || 365;
        // Calculate confidence from probabilities
        const confidence = Math.max(prediction.probability7d, prediction.probability14d, prediction.probability30d);
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
    async storePrediction(prediction) {
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
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * Get job status and metrics
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            lastRun: this.lastRun,
            metrics: this.lastMetrics,
        };
    }
    /**
     * Manually trigger the job (for testing/debugging)
     */
    async triggerManually() {
        if (this.isRunning) {
            throw new Error('Job is already running');
        }
        await this.runJob();
    }
}
// Singleton instance
let jobInstance = null;
/**
 * Get the scheduled job instance
 */
export function getScheduledJob(intervalMinutes = 60) {
    if (!jobInstance) {
        jobInstance = new ScheduledPredictionJob(intervalMinutes);
    }
    return jobInstance;
}
/**
 * Start the scheduled prediction job
 */
export async function startScheduledJob(intervalMinutes = 60) {
    const job = getScheduledJob(intervalMinutes);
    await job.start();
}
/**
 * Stop the scheduled prediction job
 */
export function stopScheduledJob() {
    if (jobInstance) {
        jobInstance.stop();
    }
}
