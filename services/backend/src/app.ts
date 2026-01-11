import express from 'express';
import cors from 'cors';
import type { Request, Response } from 'express';
import { register } from './config/metrics.js';
import monitoringRouter from './routes/monitoring.js';
import { loggingMiddleware } from './middleware/logging.js';
import { metricsMiddleware } from './middleware/metrics.js';
import { errorHandler } from './middleware/errorHandler.js';
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

export const app = express();

app.use(cors());
app.use(express.json());

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

// Health/metrics/dashboard endpoints
app.use('/api/v1', monitoringRouter);

app.use('/api/v1/facilities', facilitiesRouter);
app.use('/api/v1/sensor-readings', sensorReadingsRouter);
app.use('/api/v1/predictions', predictionsRouter);
app.use('/api/v1/comparative-analysis', comparativeAnalysisRouter);
app.use('/api/v1/ml', mlRouter);
app.use('/api/v1/model-performance', modelPerformanceRouter);
app.use('/api/v1/alerts', alertsRouter);
app.use('/api/v1/stream', streamRouter);
app.use('/api/v1/jobs', jobsRouter);
app.use('/api/v1/explainability', explainabilityRouter);
app.use('/api/v1/what-if', whatIfScenarioRouter);
app.use('/api/v1/geospatial', geospatialRouter);
app.use('/api/v1/report-analytics', reportAnalyticsRouter);
app.use('/api/v1/weather', weatherRouter);

// Centralized error handler (logs + Sentry + metrics)
app.use(errorHandler);

export default app;
