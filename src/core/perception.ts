import { Connection, PublicKey } from "@solana/web3.js";
import WebSocket from "ws";
import { AgentConfig } from "../types/config";
import { TokenInfo } from "../types/token";
import { logger } from "../utils/logger";

const PUMP_WS = "wss://pumpportal.fun/api/data";
const PUMP_PROGRAM = new PublicKey("6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P");

type TokenCallback = (token: TokenInfo) => void;

/**
 * Perception Layer — ingests market data from pump.fun
 *
 * Responsibilities:
 * - WebSocket connection to pump.fun for real-time launches
 * - Token metadata enrichment
 * - Deduplication and rate limiting
 * - Optional: mempool monitoring for front-running detection
 */
export class Perception {
    private connection: Connection;
    private config: AgentConfig;
    private ws: WebSocket | null = null;
    private callback: TokenCallback | null = null;
    private running = false;
    private seenMints = new Set<string>();
    private launchCount = 0;

    constructor(connection: Connection, config: AgentConfig) {
        this.connection = connection;
        this.config = config;
    }

    onNewToken(callback: TokenCallback): void {
        this.callback = callback;
    }

    async start(): Promise<void> {
        this.running = true;
        this.connect();
        logger.info("📡 Perception layer active — monitoring pump.fun launches");
    }

    async stop(): Promise<void> {
        this.running = false;
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        logger.info(`📡 Perception layer stopped — ${this.launchCount} tokens observed`);
    }

    private connect(): void {
        this.ws = new WebSocket(PUMP_WS);

        this.ws.on("open", () => {
            logger.info("🔗 Connected to pump.fun WebSocket");
            this.ws?.send(JSON.stringify({ method: "subscribeNewToken" }));
        });

        this.ws.on("message", async (data: Buffer) => {
            try {
                const msg = JSON.parse(data.toString());
                if (msg.txType === "create") {
                    await this.handleLaunch(msg);
                }
            } catch (err) {
                logger.error("Perception parse error:", err);
            }
        });

        this.ws.on("close", () => {
            logger.warn("📡 WebSocket disconnected");
            if (this.running) {
                setTimeout(() => this.connect(), 3000);
            }
        });

        this.ws.on("error", (err) => {
            logger.error("WebSocket error:", err);
        });
    }

    private async handleLaunch(msg: any): Promise<void> {
        if (this.seenMints.has(msg.mint)) return;
        this.seenMints.add(msg.mint);
        this.launchCount++;

        // prune seen set periodically to prevent memory leak
        if (this.seenMints.size > 10000) {
            const arr = Array.from(this.seenMints);
            this.seenMints = new Set(arr.slice(-5000));
        }

        const token: TokenInfo = {
            mint: msg.mint,
            name: msg.name || "Unknown",
            symbol: msg.symbol || "???",
            uri: msg.uri || "",
            creator: msg.traderPublicKey,
            bondingCurve: msg.bondingCurveKey || "",
            marketCapSol: msg.marketCapSol || 0,
            liquiditySol: msg.vSolInBondingCurve || 0,
            timestamp: Date.now(),
        };

        if (this.callback) {
            this.callback(token);
        }
    }
}
