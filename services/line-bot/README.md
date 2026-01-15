# LINE Bot Service - AI Enhanced

Intelligent LINE Official Account bot for the NT-POC Battery Management System.

## ✨ Features

- 🤖 **AI-Powered Responses**: OpenAI GPT integration with function calling
- 💬 **Natural Language**: Understand user queries in plain language
- 🎯 **Intent Recognition**: Automatic detection of user intentions
- 📊 **Rich Messages**: Beautiful Flex Messages and Quick Replies
- 🔄 **Conversation Memory**: Context-aware conversations (30-min sessions)
- 🏢 **Facility Monitoring**: Real-time facility health and metrics
- 🚨 **Alert Management**: View, filter, and acknowledge alerts
- 🔋 **Battery Predictions**: RUL forecasting and health analysis
- 🌐 **Backend Integration**: Full API integration with NT-POC backend

## 🚀 Quick Start

### 1. Prerequisites

- Node.js >= 18
- LINE Official Account (Business or Premium)
- OpenAI API key (for AI features)
- NT-POC backend running

### 2. Installation

```bash
cd services/line-bot
npm install
```

### 3. Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Required environment variables:
- `LINE_CHANNEL_ACCESS_TOKEN`: From LINE Developers Console
- `LINE_CHANNEL_SECRET`: From LINE Developers Console
- `OPENAI_API_KEY`: From OpenAI
- `BACKEND_API_URL`: NT-POC backend URL (default: http://localhost:3000)

### 4. LINE Channel Setup

1. Go to [LINE Developers Console](https://developers.line.biz/)
2. Create a new Messaging API channel
3. Get your Channel Access Token and Secret
4. Set webhook URL: `https://your-domain.com/webhook`
5. Enable webhook and disable auto-reply

### 5. Development

```bash
# Run in development mode with hot reload
npm run dev

# Build for production
npm run build

# Run in production
npm start

# Run tests
npm test
```

## 📖 Documentation

See [AI_ENHANCED_LINE_BOT.md](./AI_ENHANCED_LINE_BOT.md) for comprehensive documentation including:
- Architecture overview
- Service descriptions
- API reference
- User commands
- Deployment guide
- Troubleshooting

## 💡 Usage Examples

### User Commands

Quick commands:
```
hi                  → Greeting and welcome
help                → List all commands
show facilities     → View all facilities
show alerts         → Alert summary
critical alerts     → Critical alerts only
system status       → Overall health
```

Natural language queries:
```
"How many critical alerts do we have?"
"What's the health of facility Bangkok-1?"
"Show me battery predictions"
"Are there any issues?"
```

### AI Capabilities

The bot can:
- ✅ Answer questions about facilities
- ✅ Fetch and explain alert data
- ✅ Get battery predictions
- ✅ Search for specific facilities
- ✅ Acknowledge alerts
- ✅ Provide system status
- ✅ Remember conversation context

## 🏗️ Architecture

```
LINE User → LINE Platform → Webhook Handler → Intent Detection
                                            ↓
                           ┌────────────────┴────────────────┐
                           ↓                                 ↓
                    Quick Commands                    AI Processing
                           ↓                                 ↓
                    Direct Response                  Function Calling
                           ↓                                 ↓
                    ← Rich Messages ←              Backend API
```

## 📁 Project Structure

```
services/line-bot/
├── src/
│   ├── index.ts                 # Entry point
│   ├── config/
│   │   └── logger.ts            # Winston logger
│   ├── middleware/
│   │   ├── auth.ts              # LINE webhook verification
│   │   └── validation.ts        # Request validation
│   ├── routes/
│   │   ├── webhook.ts           # LINE webhook endpoint
│   │   └── notify.ts            # Notification endpoint
│   └── services/
│       ├── lineBot.ts           # Main bot logic
│       ├── aiResponse.ts        # AI integration (NEW)
│       ├── backendApi.ts        # Backend API client (NEW)
│       └── richMessages.ts      # Flex messages (NEW)
├── AI_ENHANCED_LINE_BOT.md      # Full documentation
├── package.json
└── tsconfig.json
```

## 🔧 Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `LINE_CHANNEL_ACCESS_TOKEN` | Yes | - | LINE channel token |
| `LINE_CHANNEL_SECRET` | Yes | - | LINE channel secret |
| `OPENAI_API_KEY` | Yes | - | OpenAI API key |
| `AI_MODEL` | No | `gpt-4-turbo-preview` | AI model to use |
| `BACKEND_API_URL` | No | `http://localhost:3000` | Backend API URL |
| `PORT` | No | `3002` | Server port |
| `NODE_ENV` | No | `development` | Environment |

### AI Models

Supported models:
- `gpt-4-turbo-preview` (recommended, best quality)
- `gpt-4` (good quality, slower)
- `gpt-3.5-turbo` (faster, lower cost)

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm test -- --watch
```

### Manual Testing

Use LINE app to test:
1. Add your bot as a friend
2. Send messages and verify responses
3. Test rich messages and quick replies
4. Verify alert acknowledgment
5. Test conversation context

## 🚢 Deployment

### Docker

```bash
# Build image
docker build -t line-bot .

# Run container
docker run -p 3002:3002 --env-file .env line-bot
```

### Railway / Heroku

```bash
# Set environment variables in platform
# Deploy will automatically run build and start
```

### Manual

```bash
npm run build
NODE_ENV=production npm start
```

## 📊 Monitoring

The bot logs structured events using Winston:

```typescript
// Message received
logger.info('Message from user', { userId, message });

// Intent detected
logger.info('Detected intent', { intent, userId });

// AI function call
logger.info('AI function called', { function, args });

// Errors
logger.error('Error handling event', { error, context });
```

## 🐛 Troubleshooting

### Bot not responding
1. Check webhook URL is accessible
2. Verify LINE credentials are correct
3. Check server logs for errors
4. Verify backend API is running

### AI responses slow
1. Consider using `gpt-3.5-turbo`
2. Check OpenAI API status
3. Review token usage

### Type errors
- Type assertions (`as any`) are used for LINE SDK compatibility
- These don't affect runtime behavior

## 🤝 Contributing

1. Follow existing code style
2. Add tests for new features
3. Update documentation
4. Test manually with LINE app

## 📝 License

[Your License]

## 👥 Authors

NT-POC Development Team

---

For detailed documentation, see [AI_ENHANCED_LINE_BOT.md](./AI_ENHANCED_LINE_BOT.md)
