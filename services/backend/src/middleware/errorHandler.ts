/**
 * Error Handler Middleware
 * Centralized error handling with Sentry integration
 */

import { Request, Response, NextFunction } from 'express';
import Sentry from '../config/sentry.js';
import logger from '../config/logger.js';
import { errorRate } from '../config/metrics.js';

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  // Log error
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    method: req.method,
    url: req.url,
  });

  // Report to Sentry
  Sentry.captureException(err, {
    tags: {
      method: req.method,
      url: req.url,
    },
    user: {
      ip_address: req.ip,
    },
  });

  // Update error metrics
  const route = req.route?.path || req.path;
  errorRate.inc({
    error_type: err.name || 'UnknownError',
    route,
  });

  // Send error response
  const statusCode = (err as any).statusCode || 500;
  res.status(statusCode).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message,
  });
}
