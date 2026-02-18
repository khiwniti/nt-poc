import { Connection, PublicKey } from "@solana/web3.js";
import { logger } from "./utils/logger";

export interface AnalysisResult {
    safe: boolean;
    score: number;
    reasons: string[];
}

export class TokenAnalyzer {
    private connection: Connection;
    private creatorCache = new Map<string, number>(); // creator -> rug count

    constructor(connection: Connection) {
        this.connection = connection;
    }

    async analyze(mintAddress: string, creator: string): Promise<AnalysisResult> {
        const reasons: string[] = [];
        let score = 100;

        const mint = new PublicKey(mintAddress);

        try {
            // check mint authority
            const mintInfo = await this.connection.getParsedAccountInfo(mint);
            if (mintInfo.value) {
                const data = (mintInfo.value.data as any)?.parsed?.info;
                if (data) {
                    if (data.mintAuthority) {
                        reasons.push("Mint authority not revoked");
                        score -= 40;
                    }
                    if (data.freezeAuthority) {
                        reasons.push("Freeze authority not revoked");
                        score -= 30;
                    }
                }
            }

            // check creator history
            const rugCount = await this.checkCreatorHistory(creator);
            if (rugCount > 2) {
                reasons.push(`Creator has ${rugCount} previous rugs`);
                score -= 50;
            } else if (rugCount > 0) {
                reasons.push(`Creator has ${rugCount} previous rugs`);
                score -= 20;
            }

            // check top holder concentration
            const topHolderPct = await this.checkTopHolders(mint);
            if (topHolderPct > 50) {
                reasons.push(`Top holder owns ${topHolderPct.toFixed(1)}%`);
                score -= 40;
            } else if (topHolderPct > 30) {
                reasons.push(`Top holder owns ${topHolderPct.toFixed(1)}%`);
                score -= 15;
            }
        } catch (err) {
            logger.error(`Analysis error for ${mintAddress}:`, err);
            reasons.push("Analysis incomplete due to RPC error");
            score -= 10;
        }

        return {
            safe: score >= 50 && reasons.length === 0,
            score: Math.max(0, score),
            reasons,
        };
    }

    private async checkCreatorHistory(creator: string): Promise<number> {
        if (this.creatorCache.has(creator)) {
            return this.creatorCache.get(creator)!;
        }

        try {
            const pubkey = new PublicKey(creator);
            const sigs = await this.connection.getSignaturesForAddress(pubkey, {
                limit: 50,
            });

            // heuristic: if creator has many token creation txs,
            // they might be serial token launcher (potential rugger)
            let tokenCreations = 0;
            for (const sig of sigs) {
                if (sig.memo?.includes("create") || sig.memo?.includes("initialize")) {
                    tokenCreations++;
                }
            }

            const rugCount = Math.max(0, tokenCreations - 3);
            this.creatorCache.set(creator, rugCount);
            return rugCount;
        } catch {
            return 0;
        }
    }

    private async checkTopHolders(mint: PublicKey): Promise<number> {
        try {
            const largestAccounts =
                await this.connection.getTokenLargestAccounts(mint);

            if (largestAccounts.value.length === 0) return 0;

            const totalSupply = largestAccounts.value.reduce(
                (sum, acc) => sum + Number(acc.amount),
                0
            );

            if (totalSupply === 0) return 0;

            const topHolder = Number(largestAccounts.value[0].amount);
            return (topHolder / totalSupply) * 100;
        } catch {
            return 0;
        }
    }
}
