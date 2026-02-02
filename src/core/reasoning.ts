import { Connection, PublicKey } from "@solana/web3.js";
import { AgentConfig } from "../types/config";
import { TokenInfo, TokenAnalysis, CreatorProfile, BondingCurveMetrics } from "../types/token";
import { StrategyType } from "../types/trade";
import { logger } from "../utils/logger";

/**
 * Reasoning Layer — analyzes tokens and selects strategies
 *
 * Responsibilities:
 * - Deep token analysis (creator, holders, bonding curve)
 * - Risk scoring
 * - Strategy selection based on token characteristics
 * - Pattern matching against historical data
 */
export class Reasoning {
    private connection: Connection;
    private config: AgentConfig;
    private creatorCache = new Map<string, CreatorProfile>();

    constructor(connection: Connection, config: AgentConfig) {
        this.connection = connection;
        this.config = config;
    }

    async analyze(token: TokenInfo): Promise<TokenAnalysis> {
        const reasons: string[] = [];
        let score = 100;

        // 1. Check mint/freeze authority
        try {
            const mintPk = new PublicKey(token.mint);
            const mintInfo = await this.connection.getParsedAccountInfo(mintPk);
            if (mintInfo.value) {
                const data = (mintInfo.value.data as any)?.parsed?.info;
                if (data?.mintAuthority && this.config.filters.skipMintable) {
                    reasons.push("Mint authority not revoked");
                    score -= 40;
                }
                if (data?.freezeAuthority && this.config.filters.skipFreezable) {
                    reasons.push("Freeze authority not revoked");
                    score -= 30;
                }
            }
        } catch (err) {
            reasons.push("Failed to fetch mint info");
            score -= 10;
        }

        // 2. Creator profiling
        const creatorHistory = await this.profileCreator(token.creator);
        if (creatorHistory.rugCount > 2) {
            reasons.push(`Creator has ${creatorHistory.rugCount} rugs`);
            score -= 50;
        } else if (creatorHistory.rugCount > 0) {
            reasons.push(`Creator has ${creatorHistory.rugCount} rugs`);
            score -= 20;
        }
        if (creatorHistory.successRate > 0.5) {
            score += 10; // bonus for reliable creators
        }

        // 3. Holder analysis
        const holderDistribution = await this.analyzeHolders(token.mint);
        const topHolderPct = holderDistribution.length > 0
            ? holderDistribution[0].percentage
            : 0;
        if (topHolderPct > this.config.filters.maxTopHolderPct) {
            reasons.push(`Top holder: ${topHolderPct.toFixed(1)}%`);
            score -= 30;
        }

        // 4. Liquidity check
        if (token.liquiditySol < this.config.filters.minLiquiditySol) {
            reasons.push(`Low liquidity: ${token.liquiditySol.toFixed(1)} SOL`);
            score -= 20;
        }

        // 5. Bonding curve metrics
        const bondingCurveHealth = await this.analyzeBondingCurve(token);

        // 6. Creator score threshold
        const creatorScore = this.calculateCreatorScore(creatorHistory);
        if (creatorScore < this.config.filters.minCreatorScore) {
            reasons.push(`Creator score: ${creatorScore}/100`);
            score -= 15;
        }

        return {
            token,
            safe: score >= 60 && reasons.length === 0,
            score: Math.max(0, Math.min(100, score)),
            reasons,
            creatorHistory,
            holderDistribution,
            bondingCurveHealth,
        };
    }

    async selectStrategy(analysis: TokenAnalysis): Promise<StrategyType | null> {
        const enabled = this.config.strategies.enabled;
        const bc = analysis.bondingCurveHealth;

        // Momentum: high velocity, early in bonding curve
        if (
            enabled.includes("MOMENTUM") &&
            bc.velocity > this.config.strategies.momentum.minVelocity &&
            bc.percentSold < 30 &&
            (Date.now() - analysis.token.timestamp) / 1000 <
            this.config.strategies.momentum.maxEntryAge
        ) {
            return "MOMENTUM";
        }

        // DEX Graduation: near completion of bonding curve
        if (
            enabled.includes("DEX_GRADUATION") &&
            bc.graduationProgress > 85
        ) {
            return "DEX_GRADUATION";
        }

        // Mean Reversion: price pulled back significantly
        if (
            enabled.includes("MEAN_REVERSION") &&
            bc.percentSold > 40 &&
            bc.velocity < this.config.strategies.momentum.minVelocity * 0.3
        ) {
            return "MEAN_REVERSION";
        }

        return null;
    }

    private async profileCreator(address: string): Promise<CreatorProfile> {
        if (this.creatorCache.has(address)) {
            return this.creatorCache.get(address)!;
        }

        const profile: CreatorProfile = {
            address,
            totalTokensCreated: 0,
            rugCount: 0,
            avgLifespan: 0,
            successRate: 0,
            totalVolume: 0,
        };

        try {
            const pubkey = new PublicKey(address);
            const sigs = await this.connection.getSignaturesForAddress(pubkey, {
                limit: 100,
            });
            profile.totalTokensCreated = sigs.filter(
                (s) => s.memo?.includes("create") || s.memo?.includes("initialize")
            ).length;
        } catch {
            // default profile
        }

        this.creatorCache.set(address, profile);
        return profile;
    }

    private async analyzeHolders(mint: string) {
        try {
            const mintPk = new PublicKey(mint);
            const accounts = await this.connection.getTokenLargestAccounts(mintPk);
            const total = accounts.value.reduce((sum, a) => sum + Number(a.amount), 0);

            return accounts.value.map((a) => ({
                address: a.address.toBase58(),
                balance: Number(a.amount),
                percentage: total > 0 ? (Number(a.amount) / total) * 100 : 0,
                isCreator: false,
            }));
        } catch {
            return [];
        }
    }

    private async analyzeBondingCurve(token: TokenInfo): Promise<BondingCurveMetrics> {
        return {
            liquiditySol: token.liquiditySol,
            tokensSold: 0,
            totalSupply: 1_000_000_000,
            percentSold: (token.marketCapSol / 85) * 100,
            velocity: 0,
            priceImpact1Sol: 0,
            graduationProgress: Math.min(100, (token.marketCapSol / 85) * 100),
        };
    }

    private calculateCreatorScore(profile: CreatorProfile): number {
        let score = 70; // base score for unknown creators
        if (profile.rugCount > 0) score -= profile.rugCount * 20;
        if (profile.successRate > 0.5) score += 15;
        if (profile.totalTokensCreated > 10) score -= 10; // serial launcher penalty
        return Math.max(0, Math.min(100, score));
    }
}
