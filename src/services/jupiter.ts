import {
    Connection,
    Keypair,
    PublicKey,
    Transaction,
    VersionedTransaction,
    TransactionInstruction,
} from "@solana/web3.js";
import { logger } from "../utils/logger";

/**
 * Jupiter Aggregator Service
 * Routes swaps through Jupiter for optimal execution on DEX-graduated tokens
 */
export class JupiterService {
    private connection: Connection;
    private wallet: Keypair;
    private readonly JUPITER_API = "https://quote-api.jup.ag/v6";

    constructor(connection: Connection, wallet: Keypair) {
        this.connection = connection;
        this.wallet = wallet;
    }

    async getQuote(
        inputMint: string,
        outputMint: string,
        amount: number,
        slippageBps: number
    ): Promise<any> {
        const params = new URLSearchParams({
            inputMint,
            outputMint,
            amount: amount.toString(),
            slippageBps: slippageBps.toString(),
            onlyDirectRoutes: "false",
            asLegacyTransaction: "false",
        });

        const response = await fetch(`${this.JUPITER_API}/quote?${params}`);
        if (!response.ok) {
            throw new Error(`Jupiter quote failed: ${response.statusText}`);
        }

        return response.json();
    }

    async swap(
        inputMint: string,
        outputMint: string,
        amount: number,
        slippageBps: number
    ): Promise<string> {
        // get quote
        const quote = await this.getQuote(inputMint, outputMint, amount, slippageBps);

        // get swap transaction
        const swapResponse = await fetch(`${this.JUPITER_API}/swap`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                quoteResponse: quote,
                userPublicKey: this.wallet.publicKey.toBase58(),
                wrapAndUnwrapSol: true,
                dynamicComputeUnitLimit: true,
                prioritizationFeeLamports: "auto",
            }),
        });

        if (!swapResponse.ok) {
            throw new Error(`Jupiter swap failed: ${swapResponse.statusText}`);
        }

        const { swapTransaction } = await swapResponse.json();
        const txBuf = Buffer.from(swapTransaction, "base64");
        const tx = VersionedTransaction.deserialize(txBuf);

        tx.sign([this.wallet]);

        const sig = await this.connection.sendRawTransaction(tx.serialize(), {
            skipPreflight: true,
            maxRetries: 3,
        });

        await this.connection.confirmTransaction(sig, "confirmed");
        logger.info(`🔄 Jupiter swap confirmed: ${sig}`);
        return sig;
    }
}
