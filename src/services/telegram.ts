import { logger } from "../utils/logger";

export interface TelegramConfig {
    enabled: boolean;
    botToken: string;
    chatId: string;
    commandsEnabled: boolean;
}

export class TelegramService {
    private config: TelegramConfig;

    constructor(config: TelegramConfig) {
        this.config = config;
    }

    async start(): Promise<void> {
        if (!this.config.enabled) return;
        logger.info("📱 Telegram service started");
    }

    async send(message: string): Promise<void> {
        if (!this.config.enabled) return;

        try {
            const url = `https://api.telegram.org/bot${this.config.botToken}/sendMessage`;
            await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    chat_id: this.config.chatId,
                    text: message,
                    parse_mode: "Markdown",
                    disable_web_page_preview: true,
                }),
            });
        } catch (err) {
            logger.warn("Telegram send failed:", err);
        }
    }
}
