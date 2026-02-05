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
import { AgentConfig } from "../types/config";
import { TokenInfo, TokenAnalysis } from "../types/token";
import { Position, Trade, PortfolioStats, StrategyType, ExitReason } from "../types/trade";
import { v4 as uuid } from "uuid";
import { logger } from "../utils/logger";

const PUMP_PROGRAM = new PublicKey("6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P");

/**
 * Action Layer — executes trades and manages positions
 *
 * Responsibilities:
 * - Buy/sell execution via bonding curve
 * - Priority fee + Jito bundle optimization
 * - Position tracking and PnL
 * - Take-profit / stop-loss / trailing stop automation
 * - Risk limit enforcement
 */
export class Action {
    private connection: Connection;
    private wallet: Keypair;
    private config: AgentConfig;
    private positions: Position[] = [];
    private monitorInterval: NodeJS.Timeout | null = null;

    constructor(connection: Connection, wallet: Keypair, config: AgentConfig) {
        this.connection = connection;
        this.wallet = wallet;
        this.config = config;
    }

    async checkRiskLimits(): Promise<boolean> {
        const openCount = this.positions.filter((p) => p.status === "OPEN").length;
        if (openCount >= this.config.risk.maxConcurrentPositions) {
            return false;
        }

        const balance = await this.connection.getBalance(this.wallet.publicKey);
        const solBalance = balance / LAMPORTS_PER_SOL;
        if (solBalance < this.config.risk.maxSolPerTrade * 1.1) {
            return false;
        }

        return true;
    }

    async executeBuy(
        token: TokenInfo,
        analysis: TokenAnalysis,
        strategy: StrategyType
    ): Promise<Position | null> {
        const solAmount = Math.min(
            this.config.risk.maxSolPerTrade,
            (await this.connection.getBalance(this.wallet.publicKey)) /
            LAMPORTS_PER_SOL * 0.1
        );

        if (solAmount < 0.01) {
            logger.error("Insufficient balance");
            return null;
        }

        logger.info(`💰 Buying ${token.symbol} — ${solAmount.toFixed(3)} SOL (${strategy})`);

        try {
            const tx = new Transaction();

            tx.add(
                ComputeBudgetProgram.setComputeUnitPrice({
                    microLamports: this.config.risk.priorityFeeLamports,
                })
            );

            const swapIx = this.buildBuyInstruction(
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

            logger.info(`✅ BUY confirmed: ${sig}`);

            const trade: Trade = {
                id: uuid(),
                mint: token.mint,
                symbol: token.symbol,
                strategy,
                side: "BUY",
                solAmount,
                tokenAmount: 0, // would parse from tx
                pricePerToken: 0,
                signature: sig,
                timestamp: Date.now(),
                fees: {
                    priorityFee: this.config.risk.priorityFeeLamports,
                    jitoTip: 0,
                    networkFee: 5000,
                },
            };

            const position: Position = {
                mint: token.mint,
                symbol: token.symbol,
                name: token.name,
                strategy,
                entryTrade: trade,
                entryPriceSol: solAmount,
                currentPriceSol: solAmount,
                tokenBalance: 0,
                unrealizedPnl: 0,
                unrealizedPnlPct: 0,
                peakPriceSol: solAmount,
                status: "OPEN",
                openedAt: Date.now(),
            };

            this.positions.push(position);
            return position;
        } catch (err) {
            logger.error(`❌ Buy failed: ${err}`);
            return null;
        }
    }

    async executeSell(position: Position, reason: ExitReason): Promise<boolean> {
        logger.info(`💸 Selling ${position.symbol} — reason: ${reason}`);

        try {
            // TODO: implement actual sell via bonding curve or Jupiter
            position.status = "CLOSED";
            position.closedAt = Date.now();
            return true;
        } catch (err) {
            logger.error(`Sell failed: ${err}`);
            return false;
        }
    }

    startPositionMonitor(): void {
        this.monitorInterval = setInterval(async () => {
            for (const pos of this.positions.filter((p) => p.status === "OPEN")) {
                // update price
                // check TP/SL/trailing stop
                if (pos.unrealizedPnlPct >= this.config.exits.takeProfitPct) {
                    await this.executeSell(pos, "TAKE_PROFIT");
                } else if (pos.unrealizedPnlPct <= -this.config.exits.stopLossPct) {
                    await this.executeSell(pos, "STOP_LOSS");
                }

                // trailing stop
                if (pos.currentPriceSol > pos.peakPriceSol) {
                    pos.peakPriceSol = pos.currentPriceSol;
                    pos.trailingStopPrice =
                        pos.peakPriceSol * (1 - this.config.exits.trailingStopPct / 100);
                }
                if (pos.trailingStopPrice && pos.currentPriceSol <= pos.trailingStopPrice) {
                    await this.executeSell(pos, "TRAILING_STOP");
                }
            }
        }, 5000);
    }

    async stopPositionMonitor(): Promise<void> {
        if (this.monitorInterval) {
            clearInterval(this.monitorInterval);
            this.monitorInterval = null;
        }
    }

    getPortfolioStats(): PortfolioStats {
        const closed = this.positions.filter((p) => p.status === "CLOSED");
        const open = this.positions.filter((p) => p.status === "OPEN");
        const wins = closed.filter((p) => (p.realizedPnl || 0) > 0);

        return {
            totalTrades: closed.length,
            winRate: closed.length > 0 ? (wins.length / closed.length) * 100 : 0,
            avgProfit: wins.length > 0
                ? wins.reduce((s, p) => s + (p.realizedPnl || 0), 0) / wins.length
                : 0,
            avgLoss: 0,
            totalPnl: closed.reduce((s, p) => s + (p.realizedPnl || 0), 0),
            sharpeRatio: 0,
            maxDrawdown: 0,
            currentBalance: 0,
            openPositions: open.length,
        };
    }

    private buildBuyInstruction(
        mint: PublicKey,
        bondingCurve: PublicKey,
        solAmount: number
    ): TransactionInstruction {
        const lamports = Math.floor(solAmount * LAMPORTS_PER_SOL);
        const maxSolCost = Math.floor(
            lamports * (1 + this.config.risk.slippageBps / 10000)
        );

        const data = Buffer.alloc(24);
        data.writeBigUInt64LE(BigInt("16927863322537952870"), 0);
        data.writeBigUInt64LE(BigInt(lamports), 8);
        data.writeBigUInt64LE(BigInt(maxSolCost), 16);

        return new TransactionInstruction({
            keys: [
                { pubkey: bondingCurve, isSigner: false, isWritable: true },
                { pubkey: mint, isSigner: false, isWritable: false },
                { pubkey: this.wallet.publicKey, isSigner: true, isWritable: true },
            ],
            programId: PUMP_PROGRAM,
            data,
        });
    }
}
