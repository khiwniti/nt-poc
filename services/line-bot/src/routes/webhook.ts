import express from 'express';
import { middleware, MiddlewareConfig } from '@line/bot-sdk';
import lineBotService from '../services/lineBot.js';
import logger from '../config/logger.js';

const router = express.Router();

const config: MiddlewareConfig = {
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
    channelSecret: process.env.LINE_CHANNEL_SECRET || '',
};

router.post('/', middleware(config), async (req, res) => {
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
