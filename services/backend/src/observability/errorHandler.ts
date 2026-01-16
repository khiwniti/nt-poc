import type { ErrorRequestHandler } from 'express';
import { logger } from './logger';
import { sentryCaptureException } from './sentry';

export const errorHandler = (): ErrorRequestHandler => {
  return (err, req, res, _next) => {
    const statusCode = res.statusCode >= 400 ? res.statusCode : 500;
    res.status(statusCode);

    logger.error('unhandled_error', {
      requestId: req.requestId,
      statusCode,
      errorName: err instanceof Error ? err.name : undefined,
      errorMessage: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });

    sentryCaptureException(err);

    const message =
      process.env.NODE_ENV === 'production' ? 'Internal server error' : (err instanceof Error ? err.message : String(err));

    res.json({
      error: message,
      requestId: req.requestId,
    });
  };
};

