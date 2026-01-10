import type { RequestHandler, ErrorRequestHandler } from 'express';
import * as Sentry from '@sentry/node';

let initialized = false;

const parseSampleRate = (value: string | undefined, fallback: number): number => {
  const parsed = value ? Number.parseFloat(value) : Number.NaN;
  if (!Number.isFinite(parsed)) return fallback;
  if (parsed < 0) return 0;
  if (parsed > 1) return 1;
  return parsed;
};

export const initSentry = (): void => {
  if (initialized) return;
  initialized = true;

  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;
  if (process.env.NODE_ENV === 'test') return;

  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || process.env.RAILWAY_ENVIRONMENT,
    release:
      process.env.SENTRY_RELEASE ||
      process.env.RAILWAY_GIT_COMMIT_SHA ||
      process.env.RAILWAY_DEPLOYMENT_ID,
    sendDefaultPii: false,
    tracesSampleRate: parseSampleRate(process.env.SENTRY_TRACES_SAMPLE_RATE, 0),
  });
};

export const sentryRequestHandler = (): RequestHandler => {
  const handlers = (Sentry as any).Handlers;
  if (handlers?.requestHandler) return handlers.requestHandler();
  return (_req, _res, next) => next();
};

export const sentryTracingHandler = (): RequestHandler => {
  const handlers = (Sentry as any).Handlers;
  if (handlers?.tracingHandler) return handlers.tracingHandler();
  return (_req, _res, next) => next();
};

export const sentryErrorHandler = (): ErrorRequestHandler => {
  const handlers = (Sentry as any).Handlers;
  if (handlers?.errorHandler) return handlers.errorHandler();

  return (err, _req, _res, next) => next(err);
};

export const sentryCaptureException = (error: unknown): void => {
  if (!process.env.SENTRY_DSN) return;
  if (process.env.NODE_ENV === 'test') return;

  Sentry.captureException(error);
};

export const sentrySetRequestId = (requestId: string): void => {
  if (!process.env.SENTRY_DSN) return;
  if (process.env.NODE_ENV === 'test') return;

  const hub = (Sentry as any).getCurrentHub?.();
  if (hub?.configureScope) {
    hub.configureScope((scope: any) => {
      scope.setTag('request_id', requestId);
    });
    return;
  }

  const scope = (Sentry as any).getCurrentScope?.();
  if (scope?.setTag) scope.setTag('request_id', requestId);
};
