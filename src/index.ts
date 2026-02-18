import { Connection, Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import dotenv from "dotenv";
import { PumpMonitor } from "./monitor";
import { Sniper } from "./sniper";
import { TokenAnalyzer } from "./analyzer";
import { Portfolio } from "./portfolio";
import { Seller } from "./seller";
import { TelegramAlerts } from "./alerts";
import { logger } from "./utils/logger";

dotenv.config();

async function main() {
    logger.info("🚀 PumpFun Agent starting...");

    // validate config
    const requiredEnv = ["RPC_URL", "WS_URL", "PRIVATE_KEY"];
    for (const key of requiredEnv) {
        if (!process.env[key]) {
            logger.error(`Missing required env var: ${key}`);
            process.exit(1);
        }
    }

    // init connection
    const connection = new Connection(process.env.RPC_URL!, {
        wsEndpoint: process.env.WS_URL!,
        commitment: "confirmed",
    });

    // init wallet
    const wallet = Keypair.fromSecretKey(
        bs58.decode(process.env.PRIVATE_KEY!)
    );
    logger.info(`Wallet: ${wallet.publicKey.toBase58()}`);

    // check balance
    const balance = await connection.getBalance(wallet.publicKey);
    logger.info(`Balance: ${balance / 1e9} SOL`);

    if (balance === 0) {
        logger.error("Wallet has no SOL. Fund it before running.");
        process.exit(1);
    }

    // init components
    const analyzer = new TokenAnalyzer(connection);
    const portfolio = new Portfolio(connection, wallet);
    const alerts = new TelegramAlerts();

    const seller = new Seller(connection, wallet, portfolio, alerts, {
        takeProfitPct: Number(process.env.TAKE_PROFIT_PCT || 100),
        stopLossPct: Number(process.env.STOP_LOSS_PCT || 50),
    });

    const sniper = new Sniper(connection, wallet, analyzer, portfolio, alerts, {
        maxSolPerTrade: Number(process.env.MAX_SOL_PER_TRADE || 0.5),
        slippageBps: Number(process.env.SLIPPAGE_BPS || 500),
        priorityFeeLamports: Number(process.env.PRIORITY_FEE_LAMPORTS || 100000),
        autoBuy: process.env.AUTO_BUY === "true",
    });

    const monitor = new PumpMonitor(connection, sniper, {
        minLiquiditySol: Number(process.env.MIN_LIQUIDITY_SOL || 5),
        maxTopHolderPct: Number(process.env.MAX_TOP_HOLDER_PCT || 30),
        skipMintable: process.env.SKIP_MINTABLE === "true",
        skipFreezable: process.env.SKIP_FREEZABLE === "true",
    });

    // start components
    await seller.start();
    await monitor.start();

    logger.info("✅ Agent running — monitoring pump.fun launches");
    logger.info("Press Ctrl+C to stop");

    // graceful shutdown
    process.on("SIGINT", async () => {
        logger.info("Shutting down...");
        await monitor.stop();
        await seller.stop();
        await portfolio.save();
        process.exit(0);
    });
}

main().catch((err) => {
    logger.error("Fatal error:", err);
    process.exit(1);
});
