import {
    Connection,
    Keypair,
    PublicKey,
    LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { logger } from "./utils/logger";
import fs from "fs";

export interface Position {
    mint: string;
    symbol: string;
    name: string;
    entryPriceSol: number;
    entrySig: string;
    timestamp: number;
    currentPriceSol?: number;
    pnlPct?: number;
    sold?: boolean;
    exitSig?: string;
}

const PORTFOLIO_FILE = "./portfolio.json";

export class Portfolio {
    private connection: Connection;
    private wallet: Keypair;
    private positions: Position[] = [];

    constructor(connection: Connection, wallet: Keypair) {
        this.connection = connection;
        this.wallet = wallet;
        this.load();
    }

    private load(): void {
        try {
            if (fs.existsSync(PORTFOLIO_FILE)) {
                const data = fs.readFileSync(PORTFOLIO_FILE, "utf-8");
                this.positions = JSON.parse(data);
                logger.info(`Loaded ${this.positions.length} positions from portfolio`);
            }
        } catch (err) {
            logger.warn("Failed to load portfolio:", err);
        }
    }

    async save(): Promise<void> {
        try {
            fs.writeFileSync(
                PORTFOLIO_FILE,
                JSON.stringify(this.positions, null, 2)
            );
        } catch (err) {
            logger.error("Failed to save portfolio:", err);
        }
    }

    async addPosition(position: Position): Promise<void> {
        this.positions.push(position);
        await this.save();
        logger.info(
            `📊 Position added: ${position.symbol} — ${position.entryPriceSol.toFixed(3)} SOL`
        );
    }

    getOpenPositions(): Position[] {
        return this.positions.filter((p) => !p.sold);
    }

    async updatePrices(): Promise<void> {
        for (const pos of this.getOpenPositions()) {
            try {
                const mint = new PublicKey(pos.mint);
                const accounts = await this.connection.getTokenLargestAccounts(mint);

                // estimate current value based on bonding curve
                if (accounts.value.length > 0) {
                    const totalSupply = accounts.value.reduce(
                        (sum, a) => sum + Number(a.amount),
                        0
                    );
                    // simplified price estimation
                    pos.currentPriceSol = pos.entryPriceSol; // placeholder
                    pos.pnlPct = 0;
                }
            } catch {
                // skip on error
            }
        }
    }

    markSold(mint: string, exitSig: string): void {
        const pos = this.positions.find((p) => p.mint === mint && !p.sold);
        if (pos) {
            pos.sold = true;
            pos.exitSig = exitSig;
        }
    }

    getTotalPnL(): { totalInvested: number; currentValue: number; pnlPct: number } {
        const open = this.getOpenPositions();
        const totalInvested = open.reduce((sum, p) => sum + p.entryPriceSol, 0);
        const currentValue = open.reduce(
            (sum, p) => sum + (p.currentPriceSol || p.entryPriceSol),
            0
        );
        const pnlPct =
            totalInvested > 0
                ? ((currentValue - totalInvested) / totalInvested) * 100
                : 0;

        return { totalInvested, currentValue, pnlPct };
    }
}
