import type { RequestHandler, Request, Response } from 'express';
import client from 'prom-client';

const registry = new client.Registry();
client.collectDefaultMetrics({ register: registry });

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  registers: [registry],
  labelNames: ['method', 'route', 'status_code'] as const,
});

const httpRequestDurationSeconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  registers: [registry],
  labelNames: ['method', 'route', 'status_code'] as const,
  buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

const httpServerErrorsTotal = new client.Counter({
  name: 'http_server_errors_total',
  help: 'Total number of HTTP 5xx responses',
  registers: [registry],
  labelNames: ['method', 'route', 'status_code'] as const,
});

const normalizeRoute = (req: Request): string => {
  const matchedPath = (req as any).route?.path as string | undefined;
  const route = matchedPath ? `${req.baseUrl}${matchedPath}` : req.path;
  return route || '/';
};

export const metricsMiddleware = (): RequestHandler => {
  return (req, res, next) => {
    const startTime = process.hrtime.bigint();

    res.on('finish', () => {
      const durationSeconds = Number(process.hrtime.bigint() - startTime) / 1_000_000_000;
      const route = normalizeRoute(req);
      const labels = {
        method: req.method,
        route,
        status_code: String(res.statusCode),
      };

      httpRequestsTotal.inc(labels, 1);
      httpRequestDurationSeconds.observe(labels, durationSeconds);

      if (res.statusCode >= 500) {
        httpServerErrorsTotal.inc(labels, 1);
      }
    });

    next();
  };
};

const requireBearerToken = (req: Request, res: Response): boolean => {
  const token = process.env.METRICS_AUTH_TOKEN;
  if (!token) return true;

  const headerValue = req.header('authorization') || '';
  const expected = `Bearer ${token}`;
  if (headerValue === expected) return true;

  res.status(401).json({ error: 'Unauthorized' });
  return false;
};

export const metricsHandler = (): RequestHandler => {
  return async (req, res) => {
    if (!requireBearerToken(req, res)) return;

    res.setHeader('Content-Type', registry.contentType);
    res.send(await registry.metrics());
  };
};

export const metricsJsonHandler = (): RequestHandler => {
  return async (req, res) => {
    if (!requireBearerToken(req, res)) return;

    res.json({
      data: await registry.getMetricsAsJSON(),
    });
  };
};

