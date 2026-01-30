import { Keypair, Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";
import bs58 from "bs58";
import { logger } from "./logger";

export interface WalletInfo {
    keypair: Keypair;
    publicKey: string;
    balance: number;
}

/**
 * Multi-wallet management for spreading orders
 */
export class WalletManager {
    private wallets: WalletInfo[] = [];
    private connection: Connection;

    constructor(connection: Connection) {
        this.connection = connection;
    }

    addWallet(privateKeyBase58: string): void {
        const keypair = Keypair.fromSecretKey(bs58.decode(privateKeyBase58));
        this.wallets.push({
            keypair,
            publicKey: keypair.publicKey.toBase58(),
            balance: 0,
        });
    }

    async refreshBalances(): Promise<void> {
        for (const w of this.wallets) {
            try {
                const bal = await this.connection.getBalance(w.keypair.publicKey);
                w.balance = bal / LAMPORTS_PER_SOL;
            } catch {
                w.balance = 0;
            }
        }
    }

    /**
     * Get the wallet with the highest balance for the next trade
     */
    getBestWallet(minBalance: number = 0.05): WalletInfo | null {
        const eligible = this.wallets
            .filter((w) => w.balance >= minBalance)
            .sort((a, b) => b.balance - a.balance);

        return eligible.length > 0 ? eligible[0] : null;
    }

    /**
     * Round-robin wallet selection to spread orders
     */
    private rrIndex = 0;
    getNextWallet(minBalance: number = 0.05): WalletInfo | null {
        const eligible = this.wallets.filter((w) => w.balance >= minBalance);
        if (eligible.length === 0) return null;

        const wallet = eligible[this.rrIndex % eligible.length];
        this.rrIndex++;
        return wallet;
    }

    getAll(): WalletInfo[] {
        return this.wallets;
    }

    getTotalBalance(): number {
        return this.wallets.reduce((sum, w) => sum + w.balance, 0);
    }
}
