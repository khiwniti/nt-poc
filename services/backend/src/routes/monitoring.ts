/**
 * Health and Metrics Routes
 * Provides endpoints for health checks and Prometheus metrics
 */

import { Router, Request, Response } from 'express';
import { register } from '../config/metrics.js';
import db from '../config/knex.js';

const router = Router();

/**
 * Health check endpoint
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    // Check database connectivity
    await db.raw('SELECT 1');
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      service: 'battery-management-backend',
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Database connection failed',
    });
  }
});

/**
 * Prometheus metrics endpoint
 */
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    res.status(500).end(error);
  }
});

export default router;
