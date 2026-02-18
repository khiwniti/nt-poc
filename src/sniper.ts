import {
    Connection,
    Keypair,
    PublicKey,
    Transaction,
    TransactionInstruction,
    sendAndConfirmTransaction,
    ComputeBudgetProgram,
    LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { TokenAnalyzer, AnalysisResult } from "./analyzer";
import { Portfolio } from "./portfolio";
import { TelegramAlerts } from "./alerts";
import { logger } from "./utils/logger";

export interface SniperConfig {
    maxSolPerTrade: number;
    slippageBps: number;
    priorityFeeLamports: number;
    autoBuy: boolean;
}

export class Sniper {
    private connection: Connection;
    private wallet: Keypair;
    private analyzer: TokenAnalyzer;
    private portfolio: Portfolio;
    private alerts: TelegramAlerts;
    private config: SniperConfig;

    constructor(
        connection: Connection,
        wallet: Keypair,
        analyzer: TokenAnalyzer,
        portfolio: Portfolio,
        alerts: TelegramAlerts,
        config: SniperConfig
    ) {
        this.connection = connection;
        this.wallet = wallet;
        this.analyzer = analyzer;
        this.portfolio = portfolio;
        this.alerts = alerts;
        this.config = config;
    }

    async evaluate(token: any): Promise<void> {
        // run analysis
        const analysis = await this.analyzer.analyze(token.mint, token.creator);

        if (!analysis.safe) {
            logger.warn(`  ⚠️ ${token.symbol}: ${analysis.reasons.join(", ")}`);
            return;
        }

        logger.info(`  ✅ ${token.symbol} passed analysis — score: ${analysis.score}/100`);

        if (!this.config.autoBuy) {
            logger.info(`  ℹ️ Auto-buy disabled — skipping execution`);
            await this.alerts.send(
                `🔍 Token passed: ${token.name} (${token.symbol})\n` +
                `Mint: ${token.mint}\n` +
                `Score: ${analysis.score}/100\n` +
                `Auto-buy disabled`
            );
            return;
        }

        // execute buy
        await this.buy(token, analysis);
    }

    private async buy(token: any, analysis: AnalysisResult): Promise<void> {
        const solAmount = Math.min(
            this.config.maxSolPerTrade,
            (await this.connection.getBalance(this.wallet.publicKey)) /
            LAMPORTS_PER_SOL * 0.9 // keep 10% buffer
        );

        if (solAmount < 0.01) {
            logger.error("Insufficient balance for trade");
            return;
        }

        logger.info(
            `  💰 Buying ${token.symbol} — ${solAmount.toFixed(3)} SOL`
        );

        try {
            const tx = new Transaction();

            // add priority fee
            tx.add(
                ComputeBudgetProgram.setComputeUnitPrice({
                    microLamports: this.config.priorityFeeLamports,
                })
            );

            // build swap instruction via pump.fun bonding curve
            const swapIx = await this.buildPumpSwapInstruction(
                new PublicKey(token.mint),
                new PublicKey(token.bondingCurve),
                solAmount
            );

            tx.add(swapIx);

            const sig = await sendAndConfirmTransaction(
                this.connection,
                tx,
                [this.wallet],
                { commitment: "confirmed", maxRetries: 3 }
            );

            logger.info(`  ✅ BUY confirmed: ${sig}`);

            // track position
            await this.portfolio.addPosition({
                mint: token.mint,
                symbol: token.symbol,
                name: token.name,
                entryPriceSol: solAmount,
                entrySig: sig,
                timestamp: Date.now(),
            });

            // alert
            await this.alerts.send(
                `🟢 BOUGHT: ${token.name} (${token.symbol})\n` +
                `Amount: ${solAmount.toFixed(3)} SOL\n` +
                `Score: ${analysis.score}/100\n` +
                `TX: https://solscan.io/tx/${sig}`
            );
        } catch (err) {
            logger.error(`  ❌ Buy failed for ${token.symbol}:`, err);
            await this.alerts.send(
                `🔴 BUY FAILED: ${token.symbol}\nError: ${err}`
            );
        }
    }

    private async buildPumpSwapInstruction(
        mint: PublicKey,
        bondingCurve: PublicKey,
        solAmount: number
    ): Promise<TransactionInstruction> {
        const PUMP_PROGRAM = new PublicKey(
            "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P"
        );

        // build the pump.fun buy instruction
        const lamports = Math.floor(solAmount * LAMPORTS_PER_SOL);
        const maxSolCost = Math.floor(
            lamports * (1 + this.config.slippageBps / 10000)
        );

        const keys = [
            { pubkey: bondingCurve, isSigner: false, isWritable: true },
            { pubkey: mint, isSigner: false, isWritable: false },
            { pubkey: this.wallet.publicKey, isSigner: true, isWritable: true },
        ];

        // instruction data: buy discriminator + amount + max_sol_cost
        const data = Buffer.alloc(24);
        data.writeBigUInt64LE(BigInt("16927863322537952870"), 0); // buy discriminator
        data.writeBigUInt64LE(BigInt(lamports), 8);
        data.writeBigUInt64LE(BigInt(maxSolCost), 16);

        return new TransactionInstruction({
            keys,
            programId: PUMP_PROGRAM,
            data,
        });
    }
}
