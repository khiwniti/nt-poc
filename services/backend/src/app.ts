import express from 'express';
import cors from 'cors';
import facilitiesRouter from './routes/facilities.js';
import sensorReadingsRouter from './routes/sensorReadings.js';
import predictionsRouter from './routes/predictions.js';

export const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/v1/facilities', facilitiesRouter);
app.use('/api/v1/sensor-readings', sensorReadingsRouter);
app.use('/api/v1/predictions', predictionsRouter);

export default app;
