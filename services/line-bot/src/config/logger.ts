import winston from 'winston';

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.json(),
    defaultMeta: { service: 'line-bot-service' },
    transports: [
        new winston.transports.Console({
            format: winston.format.simple(),
        }),
    ],
});

export default logger;
