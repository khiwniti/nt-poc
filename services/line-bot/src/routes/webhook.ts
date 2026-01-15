import express from 'express';
import { middleware, MiddlewareConfig } from '@line/bot-sdk';
import lineBotService from '../services/lineBot.js';
import logger from '../config/logger.js';

const router = express.Router();

// Create middleware config dynamically to ensure env vars are loaded
const getMiddlewareConfig = (): MiddlewareConfig => ({
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
    channelSecret: process.env.LINE_CHANNEL_SECRET || '',
});

// GET handler for webhook verification (LINE may ping the URL)
router.get('/', (req, res) => {
    res.status(200).json({
        status: 'ok',
        message: 'LINE Bot webhook endpoint is active',
        service: 'line-bot'
    });
});

// POST handler for actual webhook events
router.post('/', (req, res, next) => {
    // Create middleware with current environment variables
    const lineMiddleware = middleware(getMiddlewareConfig());
    return lineMiddleware(req, res, next);
}, async (req, res) => {
    try {
        const events = req.body.events;
        await Promise.all(
            events.map(async (event: any) => {
                await lineBotService.handleEvent(event);
            })
        );
        res.status(200).json({ status: 'success' });
    } catch (error) {
        logger.error('Error processing Line webhook:', error);
        res.status(500).json({ status: 'error' });
    }
});

export default router;
