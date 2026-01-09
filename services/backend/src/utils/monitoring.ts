/**
 * Monitoring Utilities
 * Helper functions for tracking application metrics and performance
 */

import Sentry from '../config/sentry.js';
import logger from '../config/logger.js';
import {
  predictionDuration,
  predictionTotal,
  alertsGenerated,
  dbQueryDuration,
  jobExecutionDuration,
  jobExecutionTotal,
} from '../config/metrics.js';

/**
 * Track prediction performance
 */
export async function trackPrediction<T>(
  modelType: string,
  operation: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();
  let status = 'success';

  try {
    const result = await operation();
    return result;
  } catch (error) {
    status = 'error';
    logger.error('Prediction failed', { modelType, error });
    Sentry.captureException(error, { tags: { modelType } });
    throw error;
  } finally {
    const duration = (Date.now() - startTime) / 1000;
    predictionDuration.observe({ model_type: modelType }, duration);
    predictionTotal.inc({ model_type: modelType, status });
  }
}

/**
 * Track database query performance
 */
export async function trackDbQuery<T>(
  operation: string,
  table: string,
  query: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();

  try {
    const result = await query();
    return result;
  } finally {
    const duration = (Date.now() - startTime) / 1000;
    dbQueryDuration.observe({ operation, table }, duration);
  }
}

/**
 * Track job execution
 */
export async function trackJobExecution<T>(
  jobName: string,
  job: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();
  let status = 'success';

  logger.info(`Starting job: ${jobName}`);

  try {
    const result = await job();
    logger.info(`Job completed successfully: ${jobName}`);
    return result;
  } catch (error) {
    status = 'error';
    logger.error(`Job failed: ${jobName}`, { error });
    Sentry.captureException(error, { tags: { jobName } });
    throw error;
  } finally {
    const duration = (Date.now() - startTime) / 1000;
    jobExecutionDuration.observe({ job_name: jobName }, duration);
    jobExecutionTotal.inc({ job_name: jobName, status });
  }
}

/**
 * Track alert generation
 */
export function trackAlert(severity: string, alertType: string) {
  alertsGenerated.inc({ severity, alert_type: alertType });
  logger.info('Alert generated', { severity, alertType });
}

/**
 * Set custom context for error tracking
 */
export function setErrorContext(context: Record<string, any>) {
  Sentry.setContext('custom', context);
}

/**
 * Set user context for error tracking
 */
export function setUserContext(userId: string, email?: string) {
  Sentry.setUser({ id: userId, email });
}

/**
 * Clear user context
 */
export function clearUserContext() {
  Sentry.setUser(null);
}

/**
 * Capture custom message
 */
export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
  logger[level](message);
  Sentry.captureMessage(message, level);
}
