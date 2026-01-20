/**
 * Monitoring Routes
 * Provides endpoints for health checks, Prometheus metrics, and a lightweight dashboard.
 */

import { Router, type Request, type Response } from 'express';
import { register } from '../config/metrics.js';
import db from '../config/knex.js';
import { performHealthCheck, checkLiveness, checkReadiness } from '../services/healthCheckService.js';

const router = Router();

const requireBearerToken = (req: Request, res: Response, token: string | undefined): boolean => {
  if (!token) return true;

  const headerValue = req.header('authorization') || '';
  const expected = `Bearer ${token}`;
  if (headerValue === expected) return true;

  res.status(401).json({ error: 'Unauthorized' });
  return false;
};

// Comprehensive health check with all dependencies
router.get('/health', async (_req: Request, res: Response) => {
  try {
    const health = await performHealthCheck();

    const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;

    res.status(statusCode).json({
      ...health,
      environment: process.env.NODE_ENV || process.env.RAILWAY_ENVIRONMENT || 'development',
      version: process.env.SENTRY_RELEASE || process.env.RAILWAY_GIT_COMMIT_SHA || null,
      service: 'battery-management-backend',
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Kubernetes liveness probe (simple - just checks if process is running)
router.get('/health/live', async (_req: Request, res: Response) => {
  const isAlive = await checkLiveness();
  if (isAlive) {
    res.status(200).json({ status: 'alive', timestamp: new Date().toISOString() });
  } else {
    res.status(503).json({ status: 'dead', timestamp: new Date().toISOString() });
  }
});

// Kubernetes readiness probe (checks if ready to serve traffic)
router.get('/health/ready', async (_req: Request, res: Response) => {
  const isReady = await checkReadiness();
  if (isReady) {
    res.status(200).json({ status: 'ready', timestamp: new Date().toISOString() });
  } else {
    res.status(503).json({ status: 'not_ready', timestamp: new Date().toISOString() });
  }
});

router.get('/metrics', async (req: Request, res: Response) => {
  if (!requireBearerToken(req, res, process.env.METRICS_AUTH_TOKEN)) return;

  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

router.get('/monitoring', (req: Request, res: Response) => {
  if (!requireBearerToken(req, res, process.env.MONITORING_AUTH_TOKEN)) return;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Monitoring</title>
    <style>
      body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; margin: 24px; color: #111827; }
      .card { border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; max-width: 880px; }
      .row { display: flex; gap: 16px; flex-wrap: wrap; }
      .pill { display: inline-block; padding: 2px 10px; border-radius: 999px; background: #eef2ff; color: #3730a3; font-size: 12px; }
      code { background: #f3f4f6; padding: 2px 6px; border-radius: 6px; }
      a { color: #2563eb; text-decoration: none; }
      a:hover { text-decoration: underline; }
      pre { background: #0b1020; color: #e5e7eb; padding: 12px; border-radius: 10px; overflow: auto; }
    </style>
  </head>
  <body>
    <h1 style="margin: 0 0 10px 0;">Monitoring</h1>
    <div class="row" style="margin-bottom: 10px;">
      <span class="pill">service: backend</span>
      <span class="pill">env: ${process.env.NODE_ENV || process.env.RAILWAY_ENVIRONMENT || 'development'}</span>
      <span class="pill">release: ${process.env.SENTRY_RELEASE || process.env.RAILWAY_GIT_COMMIT_SHA || 'n/a'}</span>
    </div>
    <div class="card">
      <p style="margin-top: 0;">Endpoints:</p>
      <ul>
        <li><a href="/api/v1/health"><code>/api/v1/health</code></a></li>
        <li><a href="/metrics"><code>/metrics</code></a> (Prometheus)</li>
        <li><a href="/api/v1/metrics"><code>/api/v1/metrics</code></a> (Prometheus)</li>
        <li><a href="/api/v1/monitoring/metrics.json"><code>/api/v1/monitoring/metrics.json</code></a> (JSON)</li>
      </ul>
      <p>Quick stats:</p>
      <pre id="stats">Loading…</pre>
    </div>
    <script>
      fetch('/api/v1/monitoring/stats')
        .then(r => r.json())
        .then(data => {
          document.getElementById('stats').textContent = JSON.stringify(data, null, 2);
        })
        .catch(err => {
          document.getElementById('stats').textContent = String(err);
        });
    </script>
  </body>
</html>`);
});

router.get('/monitoring/stats', async (req: Request, res: Response) => {
  if (!requireBearerToken(req, res, process.env.MONITORING_AUTH_TOKEN)) return;

  let databaseOk = true;
  if (process.env.NODE_ENV !== 'test') {
    try {
      await db.raw('SELECT 1');
    } catch (_error) {
      databaseOk = false;
    }
  }

  res.json({
    data: {
      uptimeSeconds: Math.round(process.uptime()),
      nodeVersion: process.version,
      pid: process.pid,
      memory: process.memoryUsage(),
      databaseOk,
    },
  });
});

router.get('/monitoring/metrics.json', async (req: Request, res: Response) => {
  if (!requireBearerToken(req, res, process.env.MONITORING_AUTH_TOKEN)) return;
  res.json({ data: await register.getMetricsAsJSON() });
});

export default router;
