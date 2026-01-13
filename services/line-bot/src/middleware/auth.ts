import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger.js';

/**
 * Middleware to authenticate API requests using API key
 * Checks for x-api-key header and compares with environment variable
 */
export function authenticateApiKey(req: Request, res: Response, next: NextFunction): void {
    const apiKey = req.headers['x-api-key'];
    const expectedApiKey = process.env.API_SECRET_KEY;

    // If no API key is configured, log warning but allow (development mode)
    if (!expectedApiKey) {
        logger.warn('API_SECRET_KEY not configured - authentication disabled');
        next();
        return;
    }

    // Check if API key is provided
    if (!apiKey) {
        logger.warn('API request without API key', {
            ip: req.ip,
            path: req.path,
        });
        res.status(401).json({
            status: 'error',
            message: 'API key required',
        });
        return;
    }

    // Verify API key
    if (apiKey !== expectedApiKey) {
        logger.warn('API request with invalid API key', {
            ip: req.ip,
            path: req.path,
        });
        res.status(401).json({
            status: 'error',
            message: 'Invalid API key',
        });
        return;
    }

    // API key is valid, proceed
    next();
}
