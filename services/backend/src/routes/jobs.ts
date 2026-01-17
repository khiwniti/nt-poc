/**
 * Scheduled Job Management API
 * T143: API endpoints to manage scheduled ML prediction job
 */

import express, { Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { getScheduledJob } from '../services/scheduledPredictionJob.js';

const router = express.Router();

router.use(authenticate);

/**
 * GET /api/v1/jobs/predictions/status
 * Get the status of the scheduled prediction job
 */
router.get('/predictions/status', async (req: AuthRequest, res: Response) => {
  try {
    const job = getScheduledJob();
    const status = job.getStatus();

    res.json({
      data: {
        isRunning: status.isRunning,
        lastRun: status.lastRun,
        metrics: status.metrics ? {
          startTime: status.metrics.startTime,
          endTime: status.metrics.endTime,
          durationMs: status.metrics.endTime 
            ? status.metrics.endTime.getTime() - status.metrics.startTime.getTime() 
            : null,
          batteriesProcessed: status.metrics.batteriesProcessed,
          predictionsCreated: status.metrics.predictionsCreated,
          errors: status.metrics.errors,
          lastError: status.metrics.lastError,
        } : null,
      },
    });
  } catch (error) {
    console.error('Error fetching job status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/v1/jobs/predictions/trigger
 * Manually trigger the prediction job
 */
router.post('/predictions/trigger', async (req: AuthRequest, res: Response) => {
  try {
    const job = getScheduledJob();
    
    // Trigger job asynchronously
    job.triggerManually().catch(error => {
      console.error('Error in manually triggered job:', error);
    });

    res.json({
      message: 'Prediction job triggered successfully',
      data: {
        triggeredAt: new Date(),
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('already running')) {
      return res.status(409).json({ error: 'Job is already running' });
    }
    
    console.error('Error triggering job:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
