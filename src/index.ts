import dotenv from "dotenv";
import { Agent } from "./core/agent";
import { AgentConfig } from "./types/config";
import { logger } from "./utils/logger";

dotenv.config();

function loadConfig(): AgentConfig {
    const required = ["RPC_URL", "WS_URL", "PRIVATE_KEY"];
    for (const key of required) {
        if (!process.env[key]) {
            logger.error(`Missing required env var: ${key}`);
            process.exit(1);
        }
    }

    const enabledStrategies: any[] = [];
    if (process.env.ENABLE_MOMENTUM === "true") enabledStrategies.push("MOMENTUM");
    if (process.env.ENABLE_SOCIAL === "true") enabledStrategies.push("SOCIAL");
    if (process.env.ENABLE_DEX_GRAD === "true") enabledStrategies.push("DEX_GRADUATION");
    if (process.env.ENABLE_MEAN_REVERSION === "true") enabledStrategies.push("MEAN_REVERSION");

    if (enabledStrategies.length === 0) {
        enabledStrategies.push("MOMENTUM"); // default
    }

    return {
        rpc: {
            url: process.env.RPC_URL!,
            wsUrl: process.env.WS_URL!,
            jitoUrl: process.env.JITO_URL,
            commitment: "confirmed",
        },
        wallet: {
            privateKey: process.env.PRIVATE_KEY!,
        },
        strategies: {
            enabled: enabledStrategies,
            momentum: {
                minVelocity: 100,
                maxEntryAge: 30,
                minBondingCurveProgress: 5,
            },
            social: {
                minMentions: 3,
                mentionWindow: 300,
                sentimentThreshold: 0.6,
            },
            dexGraduation: {
                buyOnMigration: true,
                maxEntryDelay: 10,
                minInitialLiquidity: 10,
            },
            meanReversion: {
                pullbackThreshold: 40,
                stabilizationPeriod: 60,
                minVolume: 5,
            },
        },
        risk: {
            maxSolPerTrade: Number(process.env.MAX_SOL_PER_TRADE || 0.5),
            maxConcurrentPositions: Number(process.env.MAX_CONCURRENT_POSITIONS || 5),
            slippageBps: Number(process.env.SLIPPAGE_BPS || 500),
            priorityFeeLamports: Number(process.env.PRIORITY_FEE_LAMPORTS || 100000),
            maxPortfolioRisk: 20,
        },
        filters: {
            minLiquiditySol: Number(process.env.MIN_LIQUIDITY_SOL || 5),
            maxTopHolderPct: Number(process.env.MAX_TOP_HOLDER_PCT || 30),
            skipMintable: process.env.SKIP_MINTABLE === "true",
            skipFreezable: process.env.SKIP_FREEZABLE === "true",
            minCreatorScore: Number(process.env.MIN_CREATOR_SCORE || 50),
        },
        exits: {
            takeProfitPct: Number(process.env.TAKE_PROFIT_PCT || 100),
            stopLossPct: Number(process.env.STOP_LOSS_PCT || 50),
            trailingStopPct: Number(process.env.TRAILING_STOP_PCT || 25),
            maxHoldTime: 3600,
        },
        telegram: {
            enabled: !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
            botToken: process.env.TELEGRAM_BOT_TOKEN || "",
            chatId: process.env.TELEGRAM_CHAT_ID || "",
            commandsEnabled: true,
        },
        analytics: {
            enabled: process.env.ENABLE_ANALYTICS === "true",
            dbPath: process.env.ANALYTICS_DB || "./data/trades.json",
            exportInterval: 300,
        },
    };
}

async function main() {
    logger.info("═══════════════════════════════════════════");
    logger.info("  🧠 PumpFun AGI v1.0.0                   ");
    logger.info("  Autonomous Token Trading Intelligence    ");
    logger.info("═══════════════════════════════════════════");

    const config = loadConfig();
    const agent = new Agent(config);

    await agent.start();

    // graceful shutdown
    const shutdown = async () => {
        await agent.stop();
        process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
}

main().catch((err) => {
    logger.error("Fatal:", err);
    process.exit(1);
});
