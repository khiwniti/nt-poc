import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables FIRST, before any other imports
// Path is relative to this file: src/index.ts -> ../.env
const envPath = resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import webhookRouter from './routes/webhook.js';
import notifyRouter from './routes/notify.js';
import logger from './config/logger.js';

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
