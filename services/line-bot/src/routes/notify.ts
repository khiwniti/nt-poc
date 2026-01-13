import express from 'express';
import lineBotService from '../services/lineBot.js';
import logger from '../config/logger.js';
import { authenticateApiKey } from '../middleware/auth.js';
import { validateNotifyRequest, sanitizeMessage } from '../middleware/validation.js';

const router = express.Router();

// Internal endpoint to trigger broadcast
// Protected with API key authentication and input validation
router.post('/', authenticateApiKey, validateNotifyRequest, async (req, res) => {
    try {
        const { message } = req.body;
        
        // Sanitize message content
        const sanitizedMessage = sanitizeMessage(message);

        logger.info('Broadcasting message to LINE followers', {
            messageLength: sanitizedMessage.length,
        });

        await lineBotService.broadcast(sanitizedMessage);
        
        res.status(200).json({ 
            status: 'success',
            message: 'Broadcast sent successfully',
        });
    } catch (error) {
        logger.error('Error processing notification request:', error);
        res.status(500).json({ 
            status: 'error',
            message: 'Failed to send broadcast',
        });
    }
});

export default router;
