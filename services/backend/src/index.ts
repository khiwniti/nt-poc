/**
 * Server Entry Point
 * Starts the Express server and scheduled jobs
 */

import Sentry, { initializeSentry } from './config/sentry.js';
import logger from './config/logger.js';
import app from './app.js';
import { startScheduledJob } from './services/scheduledPredictionJob.js';
import { startEscalationJob } from './services/alertEscalationJob.js';
import { startAlertRuleJob } from './services/alertRuleEvaluationJob.js';

// Initialize Sentry first
initializeSentry();

const PORT = process.env.PORT || 3000;
const PREDICTION_JOB_INTERVAL = parseInt(process.env.PREDICTION_JOB_INTERVAL_MINUTES || '60', 10);
const ESCALATION_JOB_INTERVAL = parseInt(process.env.ESCALATION_JOB_INTERVAL_MINUTES || '5', 10);
const RULE_EVALUATION_JOB_INTERVAL = parseInt(process.env.RULE_EVALUATION_JOB_INTERVAL_MINUTES || '5', 10);

async function startServer() {
  try {
    const server = app.listen(PORT, () => {
      logger.info('server_started', { port: PORT });
    });

    logger.info('scheduled_prediction_job_starting', { intervalMinutes: PREDICTION_JOB_INTERVAL });
    await startScheduledJob(PREDICTION_JOB_INTERVAL);
    logger.info('scheduled_prediction_job_active');

    logger.info('alert_escalation_job_starting', { intervalMinutes: ESCALATION_JOB_INTERVAL });
    startEscalationJob(ESCALATION_JOB_INTERVAL);
    logger.info('alert_escalation_job_active');

    logger.info('alert_rule_evaluation_job_starting', { intervalMinutes: RULE_EVALUATION_JOB_INTERVAL });
    startAlertRuleJob();
    logger.info('alert_rule_evaluation_job_active');

    const shutdown = (signal: string) => {
      logger.info('shutdown_signal_received', { signal });
      server.close(() => {
        logger.info('server_closed');
        process.exit(0);
      });
      setTimeout(() => {
        logger.error('shutdown_forced', { signal });
        process.exit(1);
      }, 10_000).unref();
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.error('server_start_failed', { error });
    Sentry.captureException(error);
    process.exit(1);
  }
}

process.on('unhandledRejection', (reason) => {
  logger.error('unhandled_rejection', { reason });
  Sentry.captureException(reason);
});

process.on('uncaughtException', (error) => {
  logger.error('uncaught_exception', { error });
  Sentry.captureException(error);
  process.exit(1);
});

startServer();

