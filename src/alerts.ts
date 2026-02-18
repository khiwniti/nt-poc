import { logger } from "./utils/logger";

export class TelegramAlerts {
    private botToken: string | undefined;
    private chatId: string | undefined;
    private enabled: boolean;

    constructor() {
        this.botToken = process.env.TELEGRAM_BOT_TOKEN;
        this.chatId = process.env.TELEGRAM_CHAT_ID;
        this.enabled = !!(this.botToken && this.chatId);

        if (this.enabled) {
            logger.info("📱 Telegram alerts enabled");
        }
    }

    async send(message: string): Promise<void> {
        if (!this.enabled) return;

        try {
            const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    chat_id: this.chatId,
                    text: message,
                    parse_mode: "Markdown",
                    disable_web_page_preview: true,
                }),
            });

            if (!response.ok) {
                logger.warn("Telegram send failed:", await response.text());
            }
        } catch (err) {
            logger.warn("Telegram error:", err);
        }
    }
}
