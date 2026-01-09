/**
 * Server Entry Point
 * Starts the Express server and scheduled jobs
 */

import { initializeSentry } from './config/sentry.js';
import logger from './config/logger.js';
import app from './app.js';
import { startScheduledJob } from './services/scheduledPredictionJob.js';
import { startEscalationJob } from './services/alertEscalationJob.js';

// Initialize Sentry first
initializeSentry();

const PORT = process.env.PORT || 3000;
const PREDICTION_JOB_INTERVAL = parseInt(process.env.PREDICTION_JOB_INTERVAL_MINUTES || '60', 10);
const ESCALATION_JOB_INTERVAL = parseInt(process.env.ESCALATION_JOB_INTERVAL_MINUTES || '5', 10);

async function startServer() {
  try {
    // Start HTTP server
    app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
    });

    // Start scheduled prediction job
    logger.info(`Starting scheduled prediction job (interval: ${PREDICTION_JOB_INTERVAL} minutes)`);
    await startScheduledJob(PREDICTION_JOB_INTERVAL);
    logger.info('Scheduled prediction job is active');

    // Start alert escalation job
    logger.info(`Starting alert escalation job (interval: ${ESCALATION_JOB_INTERVAL} minutes)`);
    startEscalationJob(ESCALATION_JOB_INTERVAL);
    logger.info('Alert escalation job is active');

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

startServer();
