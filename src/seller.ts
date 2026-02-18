import {
    Connection,
    Keypair,
    PublicKey,
    Transaction,
    ComputeBudgetProgram,
    sendAndConfirmTransaction,
    LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { Portfolio } from "./portfolio";
import { TelegramAlerts } from "./alerts";
import { logger } from "./utils/logger";

interface SellerConfig {
    takeProfitPct: number;
    stopLossPct: number;
}

export class Seller {
    private connection: Connection;
    private wallet: Keypair;
    private portfolio: Portfolio;
    private alerts: TelegramAlerts;
    private config: SellerConfig;
    private interval: NodeJS.Timeout | null = null;

    constructor(
        connection: Connection,
        wallet: Keypair,
        portfolio: Portfolio,
        alerts: TelegramAlerts,
        config: SellerConfig
    ) {
        this.connection = connection;
        this.wallet = wallet;
        this.portfolio = portfolio;
        this.alerts = alerts;
        this.config = config;
    }

    async start(): Promise<void> {
        logger.info(
            `📈 Seller active — TP: ${this.config.takeProfitPct}% / SL: ${this.config.stopLossPct}%`
        );

        // check positions every 10 seconds
        this.interval = setInterval(async () => {
            await this.checkPositions();
        }, 10_000);
    }

    async stop(): Promise<void> {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }

    private async checkPositions(): Promise<void> {
        await this.portfolio.updatePrices();

        for (const pos of this.portfolio.getOpenPositions()) {
            if (pos.pnlPct === undefined) continue;

            // take profit
            if (pos.pnlPct >= this.config.takeProfitPct) {
                logger.info(
                    `  🟢 ${pos.symbol} hit TP (${pos.pnlPct.toFixed(1)}%) — selling`
                );
                await this.sell(pos, "TAKE_PROFIT");
            }

            // stop loss
            if (pos.pnlPct <= -this.config.stopLossPct) {
                logger.info(
                    `  🔴 ${pos.symbol} hit SL (${pos.pnlPct.toFixed(1)}%) — selling`
                );
                await this.sell(pos, "STOP_LOSS");
            }
        }
    }

    private async sell(pos: any, reason: string): Promise<void> {
        try {
            // build sell transaction via pump.fun bonding curve
            const tx = new Transaction();

            tx.add(
                ComputeBudgetProgram.setComputeUnitPrice({
                    microLamports: 200_000,
                })
            );

            // sell instruction would go here (similar to buy but reversed)
            // for now, log the intent
            logger.info(`  💸 Selling ${pos.symbol} — reason: ${reason}`);

            // TODO: implement actual sell via bonding curve or Jupiter

            await this.alerts.send(
                `${reason === "TAKE_PROFIT" ? "🟢" : "🔴"} ${reason}: ${pos.symbol}\n` +
                `PnL: ${pos.pnlPct?.toFixed(1)}%\n` +
                `Entry: ${pos.entryPriceSol.toFixed(3)} SOL`
            );
        } catch (err) {
            logger.error(`Sell failed for ${pos.symbol}:`, err);
        }
    }
}
