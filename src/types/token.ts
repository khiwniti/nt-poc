export interface TokenInfo {
    mint: string;
    name: string;
    symbol: string;
    uri: string;
    creator: string;
    bondingCurve: string;
    marketCapSol: number;
    liquiditySol: number;
    timestamp: number;
    holderCount?: number;
    topHolderPct?: number;
    mintable?: boolean;
    freezable?: boolean;
    creatorScore?: number;
}

export interface TokenAnalysis {
    token: TokenInfo;
    safe: boolean;
    score: number;
    reasons: string[];
    creatorHistory: CreatorProfile;
    holderDistribution: HolderInfo[];
    bondingCurveHealth: BondingCurveMetrics;
}

export interface CreatorProfile {
    address: string;
    totalTokensCreated: number;
    rugCount: number;
    avgLifespan: number; // seconds before rug
    successRate: number; // % of tokens that survived > 1hr
    totalVolume: number; // SOL
}

export interface HolderInfo {
    address: string;
    balance: number;
    percentage: number;
    isCreator: boolean;
}

export interface BondingCurveMetrics {
    liquiditySol: number;
    tokensSold: number;
    totalSupply: number;
    percentSold: number;
    velocity: number; // tokens/sec being bought
    priceImpact1Sol: number; // % slippage for 1 SOL buy
    graduationProgress: number; // 0-100% to Raydium
}
