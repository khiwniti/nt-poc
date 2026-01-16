import express from 'express';
import cors from 'cors';
import { register } from './config/metrics';
import monitoringRouter from './routes/monitoring';
import { loggingMiddleware } from './middleware/logging';
import { metricsMiddleware } from './middleware/metrics';
import { errorHandler } from './middleware/errorHandler';
import facilitiesRouter from './routes/facilities';
import sensorReadingsRouter from './routes/sensorReadings';
import predictionsRouter from './routes/predictions';
import comparativeAnalysisRouter from './routes/comparativeAnalysis';
import mlRouter from './routes/ml';
import modelPerformanceRouter from './routes/modelPerformance';
import alertsRouter from './routes/alerts';
import jobsRouter from './routes/jobs';
import explainabilityRouter from './routes/explainability';
import whatIfScenarioRouter from './routes/whatIfScenario';
import streamRouter from './routes/stream';
import geospatialRouter from './routes/geospatial';
import reportAnalyticsRouter from './routes/reportAnalytics';
import weatherRouter from './routes/weather';
import batteryHealthRouter from './routes/batteryHealth';
import settingsRouter from './routes/settings';
import chatbotRouter from './routes/chatbot';
export const app = express();
app.use(cors());
app.use(express.json());
// Monitoring middleware
app.use(loggingMiddleware);
app.use(metricsMiddleware);
const requireBearerToken = (req, res) => {
    const token = process.env.METRICS_AUTH_TOKEN;
    if (!token)
        return true;
    const headerValue = req.header('authorization') || '';
    const expected = `Bearer ${token}`;
    if (headerValue === expected)
        return true;
    res.status(401).json({ error: 'Unauthorized' });
    return false;
};
// Prometheus metrics (Railway-friendly top-level endpoint)
app.get('/metrics', async (req, res) => {
    if (!requireBearerToken(req, res))
        return;
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
app.use('/api/v1/battery-health', batteryHealthRouter);
app.use('/api/v1/settings', settingsRouter);
app.use('/api/v1/chatbot', chatbotRouter);
// Centralized error handler (logs + Sentry + metrics)
app.use(errorHandler);
export default app;
