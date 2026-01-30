import { LAMPORTS_PER_SOL } from "@solana/web3.js";

/**
 * Trading math utilities
 */

export function solToLamports(sol: number): number {
    return Math.floor(sol * LAMPORTS_PER_SOL);
}

export function lamportsToSol(lamports: number): number {
    return lamports / LAMPORTS_PER_SOL;
}

export function calculatePnlPct(entry: number, current: number): number {
    if (entry === 0) return 0;
    return ((current - entry) / entry) * 100;
}

export function calculateSlippage(expected: number, actual: number): number {
    if (expected === 0) return 0;
    return Math.abs((actual - expected) / expected) * 100;
}

/**
 * Bonding curve price calculation
 * pump.fun uses a linear bonding curve: price = k * supply_sold
 */
export function bondingCurvePrice(
    virtualSolReserves: number,
    virtualTokenReserves: number,
    buyAmountSol: number
): { tokensOut: number; pricePerToken: number; priceImpact: number } {
    // constant product formula: x * y = k
    const k = virtualSolReserves * virtualTokenReserves;
    const newSolReserves = virtualSolReserves + buyAmountSol;
    const newTokenReserves = k / newSolReserves;
    const tokensOut = virtualTokenReserves - newTokenReserves;
    const pricePerToken = buyAmountSol / tokensOut;

    // price impact
    const spotPrice = virtualSolReserves / virtualTokenReserves;
    const priceImpact = ((pricePerToken - spotPrice) / spotPrice) * 100;

    return { tokensOut, pricePerToken, priceImpact };
}

/**
 * Calculate position size based on Kelly Criterion
 */
export function kellyPosition(
    winRate: number,
    avgWin: number,
    avgLoss: number,
    maxRisk: number = 0.25
): number {
    if (avgLoss === 0) return maxRisk;

    const b = avgWin / avgLoss;
    const p = winRate;
    const q = 1 - p;

    const kelly = (b * p - q) / b;

    // half-Kelly for conservative sizing
    const halfKelly = kelly / 2;

    return Math.max(0, Math.min(maxRisk, halfKelly));
}

/**
 * Sharpe ratio calculation
 */
export function sharpeRatio(returns: number[], riskFreeRate: number = 0): number {
    if (returns.length < 2) return 0;

    const avgReturn = returns.reduce((s, r) => s + r, 0) / returns.length;
    const variance =
        returns.reduce((s, r) => s + Math.pow(r - avgReturn, 2), 0) /
        (returns.length - 1);
    const stdDev = Math.sqrt(variance);

    if (stdDev === 0) return 0;

    return (avgReturn - riskFreeRate) / stdDev;
}
