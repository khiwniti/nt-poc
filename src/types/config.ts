import { StrategyType } from "./trade";

export interface AgentConfig {
    rpc: RpcConfig;
    wallet: WalletConfig;
    strategies: StrategiesConfig;
    risk: RiskConfig;
    filters: FilterConfig;
    exits: ExitConfig;
    telegram: TelegramConfig;
    analytics: AnalyticsConfig;
}

export interface RpcConfig {
    url: string;
    wsUrl: string;
    jitoUrl?: string;
    commitment: "processed" | "confirmed" | "finalized";
}

export interface WalletConfig {
    privateKey: string;
    additionalWallets?: string[]; // for multi-wallet mode
}

export interface StrategiesConfig {
    enabled: StrategyType[];
    momentum: MomentumConfig;
    social: SocialConfig;
    dexGraduation: DexGradConfig;
    meanReversion: MeanRevConfig;
}

export interface MomentumConfig {
    minVelocity: number; // tokens/sec
    maxEntryAge: number; // seconds after launch
    minBondingCurveProgress: number; // %
}

export interface SocialConfig {
    twitterApiKey?: string;
    minMentions: number;
    mentionWindow: number; // seconds
    sentimentThreshold: number; // 0-1
}

export interface DexGradConfig {
    buyOnMigration: boolean;
    maxEntryDelay: number; // seconds after migration
    minInitialLiquidity: number; // SOL
}

export interface MeanRevConfig {
    pullbackThreshold: number; // % from peak
    stabilizationPeriod: number; // seconds
    minVolume: number; // SOL
}

export interface RiskConfig {
    maxSolPerTrade: number;
    maxConcurrentPositions: number;
    slippageBps: number;
    priorityFeeLamports: number;
    maxPortfolioRisk: number; // % of total balance
}

export interface FilterConfig {
    minLiquiditySol: number;
    maxTopHolderPct: number;
    skipMintable: boolean;
    skipFreezable: boolean;
    minCreatorScore: number;
}

export interface ExitConfig {
    takeProfitPct: number;
    stopLossPct: number;
    trailingStopPct: number;
    maxHoldTime: number; // seconds
}

export interface TelegramConfig {
    enabled: boolean;
    botToken: string;
    chatId: string;
    commandsEnabled: boolean;
}

export interface AnalyticsConfig {
    enabled: boolean;
    dbPath: string;
    exportInterval: number; // seconds
}
