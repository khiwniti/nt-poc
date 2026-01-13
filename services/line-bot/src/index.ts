import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import webhookRouter from './routes/webhook.js';
import notifyRouter from './routes/notify.js';
import logger from './config/logger.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

app.use(helmet());
app.use(cors());

// Webhook route - needs to be raw body or handled by middleware first?
// Line middleware handles body parsing, so mounted before express.json()
app.use('/webhook', webhookRouter);

app.use(express.json());
app.use('/notify', notifyRouter);

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', service: 'line-bot' });
});

app.listen(PORT, () => {
    logger.info(`Line Bot Service running on port ${PORT}`);
});
