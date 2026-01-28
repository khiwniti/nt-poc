export interface Trade {
    id: string;
    mint: string;
    symbol: string;
    strategy: StrategyType;
    side: "BUY" | "SELL";
    solAmount: number;
    tokenAmount: number;
    pricePerToken: number;
    signature: string;
    timestamp: number;
    fees: {
        priorityFee: number;
        jitoTip: number;
        networkFee: number;
    };
}

export interface Position {
    mint: string;
    symbol: string;
    name: string;
    strategy: StrategyType;
    entryTrade: Trade;
    exitTrade?: Trade;
    entryPriceSol: number;
    currentPriceSol: number;
    tokenBalance: number;
    unrealizedPnl: number;
    unrealizedPnlPct: number;
    realizedPnl?: number;
    peakPriceSol: number;
    trailingStopPrice?: number;
    status: "OPEN" | "CLOSED" | "EXITING";
    openedAt: number;
    closedAt?: number;
}

export interface PortfolioStats {
    totalTrades: number;
    winRate: number;
    avgProfit: number;
    avgLoss: number;
    totalPnl: number;
    sharpeRatio: number;
    maxDrawdown: number;
    currentBalance: number;
    openPositions: number;
}

export type StrategyType = "MOMENTUM" | "SOCIAL" | "DEX_GRADUATION" | "MEAN_REVERSION";

export type ExitReason = "TAKE_PROFIT" | "STOP_LOSS" | "TRAILING_STOP" | "RUG_DETECTED" | "MANUAL";
