import { Connection, PublicKey } from "@solana/web3.js";
import WebSocket from "ws";
import { Sniper } from "./sniper";
import { logger } from "./utils/logger";

export interface MonitorConfig {
    minLiquiditySol: number;
    maxTopHolderPct: number;
    skipMintable: boolean;
    skipFreezable: boolean;
}

interface PumpToken {
    mint: string;
    name: string;
    symbol: string;
    uri: string;
    creator: string;
    bondingCurve: string;
    marketCapSol: number;
    timestamp: number;
}

const PUMP_WS = "wss://pumpportal.fun/api/data";
const PUMP_PROGRAM = new PublicKey(
    "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P"
);

export class PumpMonitor {
    private ws: WebSocket | null = null;
    private connection: Connection;
    private sniper: Sniper;
    private config: MonitorConfig;
    private running = false;
    private seenMints = new Set<string>();

    constructor(
        connection: Connection,
        sniper: Sniper,
        config: MonitorConfig
    ) {
        this.connection = connection;
        this.sniper = sniper;
        this.config = config;
    }

    async start(): Promise<void> {
        this.running = true;
        this.connect();
        logger.info("📡 Monitoring pump.fun for new token launches...");
    }

    async stop(): Promise<void> {
        this.running = false;
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    private connect(): void {
        this.ws = new WebSocket(PUMP_WS);

        this.ws.on("open", () => {
            logger.info("Connected to pump.fun WebSocket");

            // subscribe to new token events
            this.ws?.send(
                JSON.stringify({
                    method: "subscribeNewToken",
                })
            );
        });

        this.ws.on("message", async (data: Buffer) => {
            try {
                const msg = JSON.parse(data.toString());
                if (msg.txType === "create") {
                    await this.handleNewToken(msg);
                }
            } catch (err) {
                logger.error("Error parsing message:", err);
            }
        });

        this.ws.on("close", () => {
            logger.warn("WebSocket disconnected");
            if (this.running) {
                logger.info("Reconnecting in 3s...");
                setTimeout(() => this.connect(), 3000);
            }
        });

        this.ws.on("error", (err) => {
            logger.error("WebSocket error:", err);
        });
    }

    private async handleNewToken(msg: any): Promise<void> {
        const token: PumpToken = {
            mint: msg.mint,
            name: msg.name || "Unknown",
            symbol: msg.symbol || "???",
            uri: msg.uri || "",
            creator: msg.traderPublicKey,
            bondingCurve: msg.bondingCurveKey,
            marketCapSol: msg.marketCapSol || 0,
            timestamp: Date.now(),
        };

        // dedupe
        if (this.seenMints.has(token.mint)) return;
        this.seenMints.add(token.mint);

        logger.info(
            `🆕 New token: ${token.name} (${token.symbol}) — ${token.mint}`
        );

        // apply filters
        if (token.marketCapSol < this.config.minLiquiditySol) {
            logger.debug(`  ↳ Skipped: low liquidity (${token.marketCapSol} SOL)`);
            return;
        }

        // pass to sniper for analysis & execution
        await this.sniper.evaluate(token);
    }
}
