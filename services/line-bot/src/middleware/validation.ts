import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger.js';

/**
 * Validation middleware for notify endpoint
 * Ensures message is present and within acceptable limits
 */
export function validateNotifyRequest(req: Request, res: Response, next: NextFunction): void {
    const { message } = req.body;

    // Check if message exists
    if (!message) {
        logger.warn('Notify request without message', { ip: req.ip });
        res.status(400).json({
            status: 'error',
            message: 'Message is required',
        });
        return;
    }

    // Check message type
    if (typeof message !== 'string') {
        logger.warn('Notify request with invalid message type', { 
            ip: req.ip,
            type: typeof message,
        });
        res.status(400).json({
            status: 'error',
            message: 'Message must be a string',
        });
        return;
    }

    // Check message length (LINE has 5000 character limit)
    if (message.length === 0) {
        res.status(400).json({
            status: 'error',
            message: 'Message cannot be empty',
        });
        return;
    }

    if (message.length > 5000) {
        logger.warn('Notify request with message too long', {
            ip: req.ip,
            length: message.length,
        });
        res.status(400).json({
            status: 'error',
            message: 'Message too long (max 5000 characters)',
        });
        return;
    }

    // Validation passed
    next();
}

/**
 * Sanitize message content
 * Remove potentially dangerous content
 */
export function sanitizeMessage(message: string): string {
    // Trim whitespace
    let sanitized = message.trim();

    // Remove null bytes
    sanitized = sanitized.replace(/\0/g, '');

    // Normalize line breaks
    sanitized = sanitized.replace(/\r\n/g, '\n');

    return sanitized;
}
