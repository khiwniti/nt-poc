import express from 'express';
import cors from 'cors';
import type { Request, Response } from 'express';
import { register } from './config/metrics.js';
import monitoringRouter from './routes/monitoring.js';
import { loggingMiddleware } from './middleware/logging.js';
import { metricsMiddleware } from './middleware/metrics.js';
import { errorHandler } from './middleware/errorHandler.js';
import { securityMiddleware } from './middleware/security.js';
import { apiLimiter, strictLimiter, readLimiter, mlLimiter } from './middleware/rateLimiting.js';
import facilitiesRouter from './routes/facilities.js';
import sensorReadingsRouter from './routes/sensorReadings.js';
import predictionsRouter from './routes/predictions.js';
import comparativeAnalysisRouter from './routes/comparativeAnalysis.js';
import mlRouter from './routes/ml.js';
import modelPerformanceRouter from './routes/modelPerformance.js';
import alertsRouter from './routes/alerts.js';
import jobsRouter from './routes/jobs.js';
import explainabilityRouter from './routes/explainability.js';
import whatIfScenarioRouter from './routes/whatIfScenario.js';
import streamRouter from './routes/stream.js';
import geospatialRouter from './routes/geospatial.js';
import reportAnalyticsRouter from './routes/reportAnalytics.js';
import weatherRouter from './routes/weather.js';
import batteryHealthRouter from './routes/batteryHealth.js';
import settingsRouter from './routes/settings.js';
import chatbotRouter from './routes/chatbot.js';

export const app = express();

// Security middleware (must be before other middleware)
app.use(securityMiddleware);
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Set request body limit

// Monitoring middleware
app.use(loggingMiddleware);
app.use(metricsMiddleware);

const requireBearerToken = (req: Request, res: Response): boolean => {
  const token = process.env.METRICS_AUTH_TOKEN;
  if (!token) return true;

  const headerValue = req.header('authorization') || '';
  const expected = `Bearer ${token}`;
  if (headerValue === expected) return true;

  res.status(401).json({ error: 'Unauthorized' });
  return false;
};

// Prometheus metrics (Railway-friendly top-level endpoint)
app.get('/metrics', async (req, res) => {
  if (!requireBearerToken(req, res)) return;
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Health/metrics/dashboard endpoints (no rate limiting for health checks)
app.use('/api/v1', monitoringRouter);

// Apply rate limiting to API routes
// Read-heavy endpoints (higher limits)
app.use('/api/v1/facilities', readLimiter, facilitiesRouter);
app.use('/api/v1/sensor-readings', readLimiter, sensorReadingsRouter);
app.use('/api/v1/predictions', readLimiter, predictionsRouter);
app.use('/api/v1/model-performance', readLimiter, modelPerformanceRouter);
app.use('/api/v1/battery-health', readLimiter, batteryHealthRouter);
app.use('/api/v1/geospatial', readLimiter, geospatialRouter);
app.use('/api/v1/weather', readLimiter, weatherRouter);

// Standard API endpoints
app.use('/api/v1/comparative-analysis', apiLimiter, comparativeAnalysisRouter);
app.use('/api/v1/stream', apiLimiter, streamRouter);
app.use('/api/v1/jobs', apiLimiter, jobsRouter);
app.use('/api/v1/explainability', apiLimiter, explainabilityRouter);
app.use('/api/v1/what-if', apiLimiter, whatIfScenarioRouter);
app.use('/api/v1/settings', apiLimiter, settingsRouter);

// Sensitive endpoints (stricter limits)
app.use('/api/v1/alerts', strictLimiter, alertsRouter);

// ML-heavy endpoints (very strict limits)
app.use('/api/v1/ml', mlLimiter, mlRouter);

// Chatbot/report endpoints (moderate limits)
app.use('/api/v1/report-analytics', strictLimiter, reportAnalyticsRouter);
app.use('/api/v1/chatbot', apiLimiter, chatbotRouter);

// Centralized error handler (logs + Sentry + metrics)
app.use(errorHandler);

export default app;
