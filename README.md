# 🚀 PumpFun Agent

An autonomous Solana agent for monitoring and sniping token launches on [pump.fun](https://pump.fun). Built with TypeScript and the Solana Web3.js SDK.

## Features

- **Real-time monitoring** — WebSocket connection to pump.fun for instant launch detection
- **Auto-buy engine** — Configurable snipe parameters (max SOL, slippage, priority fees)
- **Smart filtering** — Filter tokens by creator history, liquidity, holder distribution
- **Anti-rug detection** — Analyzes token metadata, mint authority, and freeze authority
- **Portfolio tracker** — Track PnL across all positions in real-time
- **Take-profit / Stop-loss** — Automated sell orders at configurable thresholds
- **Multi-wallet support** — Spread buys across multiple wallets to avoid detection
- **Jupiter integration** — Routes through Jupiter aggregator for best execution
- **Telegram alerts** — Real-time notifications for buys, sells, and rug detection

## Quick Start

```bash
# Clone
git clone https://github.com/khiwniti/pump-agent.git
cd pump-agent

# Install dependencies
npm install

# Configure
cp .env.example .env
# Edit .env with your RPC endpoint and wallet private key

# Run
npm run start
```

## Configuration

Create a `.env` file:

```env
# Solana RPC (Helius/Quicknode recommended for WebSocket support)
RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
WS_URL=wss://mainnet.helius-rpc.com/?api-key=YOUR_KEY

# Wallet
PRIVATE_KEY=your_base58_private_key

# Snipe Settings
MAX_SOL_PER_TRADE=0.5
SLIPPAGE_BPS=500
PRIORITY_FEE_LAMPORTS=100000
AUTO_BUY=true

# Filters
MIN_LIQUIDITY_SOL=5
MAX_TOP_HOLDER_PCT=30
SKIP_MINTABLE=true
SKIP_FREEZABLE=true

# Take Profit / Stop Loss
TAKE_PROFIT_PCT=100
STOP_LOSS_PCT=50

# Telegram Alerts (optional)
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
```

## Architecture

```
pump-agent/
├── src/
│   ├── index.ts           # Entry point
│   ├── monitor.ts         # Pump.fun WebSocket monitor
│   ├── sniper.ts          # Auto-buy execution engine
│   ├── analyzer.ts        # Token analysis & anti-rug checks
│   ├── portfolio.ts       # Position tracking & PnL
│   ├── seller.ts          # Take-profit / stop-loss automation
│   ├── jupiter.ts         # Jupiter swap integration
│   ├── alerts.ts          # Telegram notification service
│   └── utils/
│       ├── wallet.ts      # Multi-wallet management
│       ├── rpc.ts         # RPC connection pool
│       └── logger.ts      # Structured logging
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

## Token Filtering

The agent applies multiple filters before sniping:

| Filter | Description | Default |
|--------|-------------|---------|
| `MIN_LIQUIDITY_SOL` | Minimum SOL liquidity in bonding curve | 5 SOL |
| `MAX_TOP_HOLDER_PCT` | Max % held by single wallet | 30% |
| `SKIP_MINTABLE` | Skip if mint authority not revoked | true |
| `SKIP_FREEZABLE` | Skip if freeze authority not revoked | true |
| Creator History | Skip if creator has >2 rugged tokens | auto |

## Anti-Rug Detection

Before buying, the agent checks:
- ✅ Mint authority revoked
- ✅ Freeze authority revoked
- ✅ Creator wallet history (previous rug pulls)
- ✅ Metadata URI accessibility
- ✅ Top holder concentration
- ✅ Bonding curve liquidity depth

## Disclaimer

This software is for educational purposes only. Trading memecoins is extremely risky. You will likely lose money. Use at your own risk. The authors are not responsible for any financial losses.

## License

MIT
