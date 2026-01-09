import express from 'express';
import cors from 'cors';
import facilitiesRouter from './routes/facilities.js';
import sensorReadingsRouter from './routes/sensorReadings.js';
import predictionsRouter from './routes/predictions.js';
import comparativeAnalysisRouter from './routes/comparativeAnalysis.js';
import mlRouter from './routes/ml.js';
import modelPerformanceRouter from './routes/modelPerformance.js';
import alertsRouter from './routes/alerts.js';

export const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/v1/facilities', facilitiesRouter);
app.use('/api/v1/sensor-readings', sensorReadingsRouter);
app.use('/api/v1/predictions', predictionsRouter);
app.use('/api/v1/comparative-analysis', comparativeAnalysisRouter);
app.use('/api/v1/ml', mlRouter);
app.use('/api/v1/model-performance', modelPerformanceRouter);
app.use('/api/v1/alerts', alertsRouter);

export default app;
