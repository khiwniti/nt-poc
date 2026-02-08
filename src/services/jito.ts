import { Connection, Keypair, VersionedTransaction } from "@solana/web3.js";
import { logger } from "../utils/logger";

/**
 * Jito Bundle Service
 * Submits transactions as Jito bundles for MEV protection and priority execution
 */
export class JitoService {
    private connection: Connection;
    private wallet: Keypair;
    private jitoUrl: string;

    constructor(connection: Connection, wallet: Keypair, jitoUrl: string) {
        this.connection = connection;
        this.wallet = wallet;
        this.jitoUrl = jitoUrl;
    }

    async sendBundle(
        transactions: VersionedTransaction[],
        tipLamports: number = 10000
    ): Promise<string> {
        const serialized = transactions.map((tx) =>
            Buffer.from(tx.serialize()).toString("base64")
        );

        const response = await fetch(`${this.jitoUrl}/bundles`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                jsonrpc: "2.0",
                id: 1,
                method: "sendBundle",
                params: [serialized],
            }),
        });

        if (!response.ok) {
            throw new Error(`Jito bundle failed: ${response.statusText}`);
        }

        const result = await response.json();
        const bundleId = result.result;
        logger.info(`⚡ Jito bundle submitted: ${bundleId}`);
        return bundleId;
    }

    async getBundleStatus(bundleId: string): Promise<string> {
        const response = await fetch(`${this.jitoUrl}/bundles`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                jsonrpc: "2.0",
                id: 1,
                method: "getBundleStatuses",
                params: [[bundleId]],
            }),
        });

        const result = await response.json();
        return result.result?.value?.[0]?.confirmation_status || "unknown";
    }
}
