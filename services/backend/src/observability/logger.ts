import winston from 'winston';

const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

export const logger = winston.createLogger({
  level: LOG_LEVEL,
  defaultMeta: {
    service: 'backend',
    environment: process.env.NODE_ENV || process.env.RAILWAY_ENVIRONMENT || 'development',
  },
  transports: [new winston.transports.Console()],
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
});

