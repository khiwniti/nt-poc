import pino from "pino";

export const logger = pino({
    level: process.env.LOG_LEVEL || "info",
    transport: {
        target: "pino-pretty",
        options: {
            colorize: true,
            translateTime: "HH:MM:ss",
            ignore: "pid,hostname",
        },
    },
});
export const VERSION = "1.1.0";
