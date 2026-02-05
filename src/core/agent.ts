import { Connection, Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import { Perception } from "./perception";
import { Reasoning } from "./reasoning";
import { Action } from "./action";
import { AgentConfig } from "../types/config";
import { TokenInfo, TokenAnalysis } from "../types/token";
import { Position, PortfolioStats } from "../types/trade";
import { TelegramService } from "../services/telegram";
import { AnalyticsService } from "../services/analytics";
import { logger } from "../utils/logger";

/**
 * PumpFun AGI — Autonomous General Intelligence for token trading
 *
 * The agent operates on a cognitive loop:
 * 1. PERCEIVE — ingest new token launches, market data, social signals
 * 2. REASON  — analyze tokens, score opportunities, select strategy
 * 3. ACT    — execute trades, manage positions, handle exits
 *
 * Each cycle runs continuously with the agent learning from every
 * trade outcome to refine future decisions.
 */
export class Agent {
    private connection: Connection;
    private wallet: Keypair;
    private config: AgentConfig;

    private perception: Perception;
    private reasoning: Reasoning;
    private action: Action;

    private telegram: TelegramService;
    private analytics: AnalyticsService;

    private running = false;
    private cycleCount = 0;

    constructor(config: AgentConfig) {
        this.config = config;
        this.connection = new Connection(config.rpc.url, {
            wsEndpoint: config.rpc.wsUrl,
            commitment: config.rpc.commitment,
        });

        this.wallet = Keypair.fromSecretKey(
            bs58.decode(config.wallet.privateKey)
        );

        this.perception = new Perception(this.connection, config);
        this.reasoning = new Reasoning(this.connection, config);
        this.action = new Action(this.connection, this.wallet, config);

        this.telegram = new TelegramService(config.telegram);
        this.analytics = new AnalyticsService(config.analytics);
    }

    async start(): Promise<void> {
        logger.info("🧠 PumpFun AGI initializing...");

        // verify wallet
        const balance = await this.connection.getBalance(this.wallet.publicKey);
        const solBalance = balance / 1e9;
        logger.info(`💰 Wallet: ${this.wallet.publicKey.toBase58()} (${solBalance.toFixed(2)} SOL)`);

        if (balance === 0) {
            throw new Error("Wallet has no SOL — fund it before starting");
        }

        // init services
        await this.analytics.init();
        await this.telegram.start();
        await this.telegram.send(
            `🧠 PumpFun AGI started\n💰 Balance: ${solBalance.toFixed(2)} SOL\n📊 Strategies: ${this.config.strategies.enabled.join(", ")}`
        );

        // start perception layer
        this.running = true;
        this.perception.onNewToken((token) => this.cognitiveLoop(token));
        await this.perception.start();

        // start position monitor
        this.action.startPositionMonitor();

        logger.info("✅ AGI running — monitoring pump.fun");
        logger.info(`📊 Active strategies: ${this.config.strategies.enabled.join(", ")}`);
    }

    async stop(): Promise<void> {
        logger.info("Shutting down AGI...");
        this.running = false;
        await this.perception.stop();
        await this.action.stopPositionMonitor();
        await this.analytics.flush();
        await this.telegram.send("🛑 PumpFun AGI stopped");
    }

    /**
     * Core cognitive loop — runs for every new token detected
     */
    private async cognitiveLoop(token: TokenInfo): Promise<void> {
        this.cycleCount++;
        const cycleId = `cycle-${this.cycleCount}`;

        try {
            // ── PERCEIVE ──────────────────────────────────────
            logger.info(`[${cycleId}] 👁️ New token: ${token.name} (${token.symbol})`);

            // ── REASON ────────────────────────────────────────
            const analysis = await this.reasoning.analyze(token);

            if (!analysis.safe) {
                logger.info(`[${cycleId}] ❌ Rejected: ${analysis.reasons.join(", ")}`);
                return;
            }

            // select best strategy for this token
            const strategy = await this.reasoning.selectStrategy(analysis);
            if (!strategy) {
                logger.info(`[${cycleId}] ⏭️ No strategy matched`);
                return;
            }

            logger.info(
                `[${cycleId}] ✅ Score: ${analysis.score}/100 — Strategy: ${strategy}`
            );

            // check risk limits
            const canTrade = await this.action.checkRiskLimits();
            if (!canTrade) {
                logger.warn(`[${cycleId}] ⚠️ Risk limits reached — skipping`);
                return;
            }

            // ── ACT ───────────────────────────────────────────
            const position = await this.action.executeBuy(token, analysis, strategy);

            if (position) {
                await this.telegram.send(
                    `🟢 BOUGHT: ${token.name} (${token.symbol})\n` +
                    `💰 ${position.entryPriceSol.toFixed(3)} SOL\n` +
                    `📊 Score: ${analysis.score}/100\n` +
                    `🎯 Strategy: ${strategy}\n` +
                    `🔗 https://pump.fun/${token.mint}`
                );

                await this.analytics.recordTrade(position.entryTrade);
            }
        } catch (err) {
            logger.error(`[${cycleId}] Error in cognitive loop:`, err);
        }
    }

    async getStats(): Promise<PortfolioStats> {
        return this.action.getPortfolioStats();
    }
}
