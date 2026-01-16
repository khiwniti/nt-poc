import type { RequestHandler } from 'express';
import { logger } from './logger';

const redactPath = (path: string): string => {
  if (path.startsWith('/api/v1/auth')) return '/api/v1/auth/*';
  return path;
};

export const httpLoggingMiddleware = (): RequestHandler => {
  return (req, res, next) => {
    const startTime = process.hrtime.bigint();

    res.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - startTime) / 1_000_000;

      logger.info('http_request', {
        requestId: req.requestId,
        method: req.method,
        path: redactPath(req.path),
        statusCode: res.statusCode,
        durationMs: Math.round(durationMs * 100) / 100,
      });
    });

    next();
  };
};

