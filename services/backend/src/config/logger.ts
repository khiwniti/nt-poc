/**
 * Winston Logger Configuration
 * Provides structured logging with multiple log levels and transports
 */

import winston from 'winston';

const logLevel = process.env.LOG_LEVEL || 'info';
const nodeEnv = process.env.NODE_ENV || 'development';

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`;
    }
    return msg;
  })
);

// JSON format for production
const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create logger instance
export const logger = winston.createLogger({
  level: logLevel,
  format: nodeEnv === 'production' ? jsonFormat : consoleFormat,
  defaultMeta: { service: 'battery-management-backend' },
  transports: [
    new winston.transports.Console(),
  ],
});

// Add file transports in production
if (nodeEnv === 'production') {
  logger.add(new winston.transports.File({ 
    filename: 'logs/error.log', 
    level: 'error',
    maxsize: 10485760, // 10MB
    maxFiles: 5,
  }));
  logger.add(new winston.transports.File({ 
    filename: 'logs/combined.log',
    maxsize: 10485760, // 10MB
    maxFiles: 10,
  }));
}

export default logger;
