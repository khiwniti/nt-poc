/**
 * Metrics Middleware
 * Collects Prometheus metrics for HTTP requests
 */

import { Request, Response, NextFunction } from 'express';
import { httpRequestDuration, httpRequestTotal } from '../config/metrics';

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = (Date.now() - startTime) / 1000; // Convert to seconds
    const route = req.route?.path || req.path;

    // Record metrics
    httpRequestDuration.observe(
      {
        method: req.method,
        route,
        status_code: res.statusCode.toString(),
      },
      duration
    );

    httpRequestTotal.inc({
      method: req.method,
      route,
      status_code: res.statusCode.toString(),
    });
  });

  next();
}
