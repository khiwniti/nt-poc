import express from 'express';
import cors from 'cors';
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
import monitoringRouter from './routes/monitoring.js';
import { loggingMiddleware } from './middleware/logging.js';
import { metricsMiddleware } from './middleware/metrics.js';
import { errorHandler } from './middleware/errorHandler.js';
export const app = express();
app.use(cors());
app.use(express.json());
// Monitoring middleware
app.use(loggingMiddleware);
app.use(metricsMiddleware);
// Health and metrics endpoints
app.use('/api/v1', monitoringRouter);
// API routes
app.use('/api/v1/facilities', facilitiesRouter);
app.use('/api/v1/sensor-readings', sensorReadingsRouter);
app.use('/api/v1/predictions', predictionsRouter);
app.use('/api/v1/comparative-analysis', comparativeAnalysisRouter);
app.use('/api/v1/ml', mlRouter);
app.use('/api/v1/model-performance', modelPerformanceRouter);
app.use('/api/v1/alerts', alertsRouter);
app.use('/api/v1/jobs', jobsRouter);
app.use('/api/v1/explainability', explainabilityRouter);
app.use('/api/v1/what-if', whatIfScenarioRouter);
// Custom error handler
app.use(errorHandler);
export default app;
