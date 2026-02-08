import { Trade, PortfolioStats } from "../types/trade";
import { AnalyticsConfig } from "../types/config";
import { logger } from "../utils/logger";
import fs from "fs";

export class AnalyticsService {
    private config: AnalyticsConfig;
    private trades: Trade[] = [];

    constructor(config: AnalyticsConfig) {
        this.config = config;
    }

    async init(): Promise<void> {
        if (!this.config.enabled) return;

        // ensure data directory exists
        const dir = this.config.dbPath.split("/").slice(0, -1).join("/");
        if (dir && !fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        // load existing trades
        try {
            if (fs.existsSync(this.config.dbPath)) {
                const data = fs.readFileSync(this.config.dbPath, "utf-8");
                this.trades = JSON.parse(data);
                logger.info(`📊 Loaded ${this.trades.length} historical trades`);
            }
        } catch {
            this.trades = [];
        }

        logger.info("📊 Analytics service initialized");
    }

    async recordTrade(trade: Trade): Promise<void> {
        this.trades.push(trade);
        await this.flush();
    }

    async flush(): Promise<void> {
        if (!this.config.enabled) return;

        try {
            fs.writeFileSync(
                this.config.dbPath,
                JSON.stringify(this.trades, null, 2)
            );
        } catch (err) {
            logger.error("Failed to flush analytics:", err);
        }
    }

    getStats(): {
        totalTrades: number;
        buys: number;
        sells: number;
        volumeSol: number;
    } {
        const buys = this.trades.filter((t) => t.side === "BUY");
        const sells = this.trades.filter((t) => t.side === "SELL");
        const volume = this.trades.reduce((sum, t) => sum + t.solAmount, 0);

        return {
            totalTrades: this.trades.length,
            buys: buys.length,
            sells: sells.length,
            volumeSol: volume,
        };
    }
}
