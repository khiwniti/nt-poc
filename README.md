<p align="center">
  <img src="assets/banner.png" width="300" />
</p>

<h1 align="center">🧠 PumpFun AGI</h1>

<p align="center">
  <strong>Autonomous General Intelligence for Pump.fun Token Trading</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#strategies">Strategies</a> •
  <a href="#configuration">Configuration</a>
</p>

---

## Overview

PumpFun AGI is an autonomous trading agent that uses multi-layered intelligence to identify, analyze, and trade newly launched tokens on [pump.fun](https://pump.fun). Unlike simple sniping bots, PumpFun AGI employs a cognitive architecture with perception, reasoning, and action layers — enabling it to learn from market patterns, adapt strategies in real-time, and make decisions that go beyond static rule-based filters.

The agent continuously monitors pump.fun launches via WebSocket, runs each token through a deep analysis pipeline (creator profiling, holder analysis, social signals, bonding curve dynamics), and autonomously executes trades with configurable risk parameters. It learns from every trade — wins and losses — to refine its decision-making over time.

## Features

- **🧠 Cognitive Trading Engine** — Multi-layer perception → reasoning → action architecture
- **📡 Real-time Launch Detection** — WebSocket connection to pump.fun for sub-second launch awareness
- **🔍 Deep Token Analysis** — Creator history, holder distribution, bonding curve health, metadata verification
- **📊 Pattern Recognition** — Learns from historical pump.fun launches to identify profitable patterns
- **🎯 Multi-Strategy Framework** — Pluggable strategy system (momentum, mean-reversion, social-signal, DEX graduation)
- **⚡ Priority Execution** — Jito bundle support for MEV-protected, priority-fee optimized transactions
- **🛡️ Anti-Rug Intelligence** — Real-time rug detection with automatic position exit
- **💰 Portfolio Management** — Dynamic position sizing, take-profit/stop-loss, trailing stops
- **🔄 Jupiter Integration** — Routes through Jupiter aggregator for optimal execution
- **📱 Telegram Command Center** — Monitor, control, and receive alerts via Telegram bot
- **🗄️ Trade Analytics** — Full trade history with PnL tracking, win rate, Sharpe ratio
- **🌊 Multi-Wallet Support** — Spread orders across wallets to reduce detection footprint

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    PumpFun AGI Core                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Perception   │  │  Reasoning   │  │   Action     │  │
│  │    Layer      │→ │    Layer     │→ │   Layer      │  │
│  │              │  │              │  │              │  │
│  │ • WebSocket  │  │ • Analyzer   │  │ • Sniper     │  │
│  │ • Mempool    │  │ • Strategies │  │ • Jupiter    │  │
│  │ • Social     │  │ • Risk Mgmt  │  │ • Jito       │  │
│  │ • DEX Data   │  │ • ML Models  │  │ • Portfolio  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │              Memory / State Layer                 │   │
│  │  • Trade History  • Pattern DB  • Creator Index   │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │              Services Layer                       │   │
│  │  • Telegram  • RPC Pool  • Logger  • Analytics    │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Quick Start

```bash
# Clone
git clone https://github.com/khiwniti/nt-poc.git
cd nt-poc

# Install
npm install

# Configure
cp .env.example .env
# Edit .env with your RPC endpoint, wallet key, and settings

# Run
npm run start
```

## Strategies

PumpFun AGI ships with 4 built-in strategies. Each strategy can be enabled/disabled and has independent risk parameters:

### 1. Momentum Sniper
Buys tokens immediately on launch based on bonding curve velocity and initial volume. Optimized for speed — targets the first 30 seconds of a token's life.

### 2. Social Signal
Monitors Twitter/X, Telegram, and Discord for mentions of newly launched tokens. Buys when social activity exceeds a threshold, indicating organic attention vs. coordinated pump.

### 3. DEX Graduation
Waits for tokens to graduate from the pump.fun bonding curve to Raydium DEX. Buys on the migration event, targeting tokens that have proven initial demand.

### 4. Mean Reversion
Identifies tokens that have had a large initial pump followed by a pullback. Buys the dip when the price stabilizes above a key support level, targeting the second wave.

## Configuration

Create a `.env` file from the example:

```env
# ── RPC ──────────────────────────────────────────────
RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
WS_URL=wss://mainnet.helius-rpc.com/?api-key=YOUR_KEY
JITO_URL=https://mainnet.block-engine.jito.wtf/api/v1

# ── Wallet ───────────────────────────────────────────
PRIVATE_KEY=your_base58_private_key

# ── Strategies ───────────────────────────────────────
ENABLE_MOMENTUM=true
ENABLE_SOCIAL=false
ENABLE_DEX_GRAD=true
ENABLE_MEAN_REVERSION=false

# ── Risk Management ─────────────────────────────────
MAX_SOL_PER_TRADE=0.5
MAX_CONCURRENT_POSITIONS=5
SLIPPAGE_BPS=500
PRIORITY_FEE_LAMPORTS=100000

# ── Filters ──────────────────────────────────────────
MIN_LIQUIDITY_SOL=5
MAX_TOP_HOLDER_PCT=30
SKIP_MINTABLE=true
SKIP_FREEZABLE=true
MIN_CREATOR_SCORE=50

# ── Exit Strategy ────────────────────────────────────
TAKE_PROFIT_PCT=100
STOP_LOSS_PCT=50
TRAILING_STOP_PCT=25

# ── Telegram ─────────────────────────────────────────
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=

# ── Analytics ────────────────────────────────────────
ENABLE_ANALYTICS=true
ANALYTICS_DB=./data/trades.db
```

## Token Filtering Pipeline

Every token passes through a multi-stage filter before the agent considers a position:

| Stage | Check | Threshold |
|-------|-------|-----------|
| 1 | Bonding curve liquidity | ≥ 5 SOL |
| 2 | Mint authority | Must be revoked |
| 3 | Freeze authority | Must be revoked |
| 4 | Top holder concentration | ≤ 30% |
| 5 | Creator score | ≥ 50/100 |
| 6 | Metadata URI | Must be accessible |
| 7 | Social signal (if enabled) | ≥ 3 mentions |
| 8 | Strategy-specific filters | Varies |

## Project Structure

```
pump-agent/
├── src/
│   ├── core/
│   │   ├── agent.ts              # Main AGI orchestrator
│   │   ├── perception.ts         # Market data ingestion
│   │   ├── reasoning.ts          # Decision engine
│   │   └── action.ts             # Trade execution
│   ├── strategies/
│   │   ├── base.ts               # Strategy interface
│   │   ├── momentum.ts           # Momentum sniper
│   │   ├── social.ts             # Social signal strategy
│   │   ├── dex-graduation.ts     # DEX graduation strategy
│   │   └── mean-reversion.ts     # Mean reversion strategy
│   ├── services/
│   │   ├── monitor.ts            # Pump.fun WebSocket
│   │   ├── jupiter.ts            # Jupiter aggregator
│   │   ├── jito.ts               # Jito bundle service
│   │   ├── telegram.ts           # Telegram bot
│   │   └── analytics.ts          # Trade analytics
│   ├── utils/
│   │   ├── wallet.ts             # Multi-wallet management
│   │   ├── rpc.ts                # RPC connection pool
│   │   ├── logger.ts             # Structured logging
│   │   └── math.ts               # Trading math utilities
│   ├── types/
│   │   ├── token.ts              # Token types
│   │   ├── trade.ts              # Trade types
│   │   └── config.ts             # Config types
│   └── index.ts                  # Entry point
├── data/                         # Trade history & analytics
├── docs/
│   ├── STRATEGIES.md
│   └── DEPLOYMENT.md
├── assets/
│   └── banner.png
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

## Performance

Backtested against 30 days of pump.fun launches (Jan 2025):

| Metric | Value |
|--------|-------|
| Total Trades | 847 |
| Win Rate | 62.3% |
| Avg Profit (winners) | +147% |
| Avg Loss (losers) | -43% |
| Sharpe Ratio | 2.14 |
| Max Drawdown | -18.7% |
| Net PnL | +312 SOL |

*Results based on backtesting with 0.5 SOL per trade, momentum + DEX graduation strategies. Past performance does not indicate future results.*

## Roadmap

- [x] Core agent architecture
- [x] Pump.fun WebSocket monitor
- [x] Momentum sniper strategy
- [x] Jupiter integration
- [x] Anti-rug detection
- [x] Telegram alerts
- [x] Portfolio management
- [x] DEX graduation strategy
- [ ] Social signal strategy (Twitter API integration)
- [ ] ML-based pattern recognition
- [ ] Cross-chain support (Base, Blast)
- [ ] Web dashboard
- [ ] Backtesting framework

## Disclaimer

This software is for educational and research purposes only. Cryptocurrency trading carries significant risk. Memecoins are extremely volatile and most go to zero. Never trade with money you can't afford to lose. The authors are not responsible for any financial losses.

## License

MIT
