# LINE Bot Service

A microservice for integrating LINE Messaging API with the NT-POC Battery Management System. Provides AI-powered chatbot responses and system notification broadcasting.

## Features

- 🤖 **AI-Powered Responses** - Uses OpenAI GPT to answer user queries about battery system status
- 📢 **Broadcast Notifications** - Send system alerts to all LINE followers
- 🔒 **Secure Webhook** - LINE signature verification for all webhook requests
- 📊 **Comprehensive Logging** - Winston-based logging for all operations
- 🛡️ **Security Hardened** - Helmet middleware for security headers

## Architecture

```
line-bot/
├── src/
│   ├── config/
│   │   └── logger.ts          # Winston logger configuration
│   ├── routes/
│   │   ├── webhook.ts         # LINE webhook endpoint (POST /webhook)
│   │   └── notify.ts          # Broadcast endpoint (POST /notify)
│   ├── services/
│   │   ├── lineBot.ts         # LINE SDK wrapper service
│   │   └── aiResponse.ts      # OpenAI integration service
│   └── index.ts               # Express app entry point
├── dist/                      # Compiled JavaScript (generated)
├── package.json
├── tsconfig.json
└── .env.example               # Environment variable template
```

## Prerequisites

- Node.js >= 18.0.0
- npm >= 7.0.0
- LINE Messaging API account
- OpenAI API key

## Setup

### 1. Install Dependencies

```bash
cd services/line-bot
npm install
```

### 2. Configure Environment Variables

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your credentials
nano .env
```

Required environment variables:

```env
# LINE API Credentials (from LINE Developers Console)
LINE_CHANNEL_ACCESS_TOKEN=your_token_here
LINE_CHANNEL_SECRET=your_secret_here

# OpenAI API Key
OPENAI_API_KEY=your_openai_key_here

# Server Configuration
PORT=3002
NODE_ENV=development

# Security
API_SECRET_KEY=generate_random_string_here
```

### 3. Get LINE API Credentials

1. Go to [LINE Developers Console](https://developers.line.biz/console/)
2. Create a new Provider (or use existing)
3. Create a Messaging API Channel
4. Get **Channel Access Token** from Messaging API tab
5. Get **Channel Secret** from Basic settings tab
6. Set Webhook URL to `https://your-domain.com/webhook`
7. Enable webhook in Messaging API settings

### 4. Get OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create a new API key
3. Copy the key to your `.env` file

## Development

### Start Development Server

```bash
npm run dev
```

The service will start on port 3002 (or PORT from .env) with hot reload enabled.

### Build for Production

```bash
npm run build
```

Compiles TypeScript to JavaScript in the `dist/` directory.

### Run Production Build

```bash
npm start
```

Runs the compiled JavaScript from `dist/`.

### Run Tests

```bash
npm test
```

### Type Checking

```bash
npm run typecheck
```

## API Endpoints

### 1. Health Check

```http
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "service": "line-bot"
}
```

### 2. LINE Webhook

```http
POST /webhook
```

**Purpose:** Receives events from LINE platform (messages, follows, etc.)

**Authentication:** LINE signature verification (automatic via middleware)

**Events Handled:**
- `message.text` - User text messages → AI response
- `follow` - New follower events → Logged

**Request Body:** (Sent by LINE platform)
```json
{
  "events": [
    {
      "type": "message",
      "message": {
        "type": "text",
        "text": "What is the system status?"
      },
      "replyToken": "...",
      "source": {
        "userId": "..."
      }
    }
  ]
}
```

### 3. Broadcast Notification

```http
POST /notify
Content-Type: application/json
```

**Purpose:** Internal endpoint to broadcast messages to all LINE followers

**⚠️ Security Note:** Should be protected with API key authentication (not yet implemented)

**Request Body:**
```json
{
  "message": "System alert: High temperature detected in Battery Unit 3"
}
```

**Response:**
```json
{
  "status": "success"
}
```

**Example Usage:**
```bash
curl -X POST http://localhost:3002/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Test notification"}'
```

## Integration with Backend

The LINE bot can be called from the backend service to send notifications:

```typescript
// From backend service
const response = await axios.post('http://line-bot:3002/notify', {
  message: 'Critical alert: Temperature threshold exceeded'
});
```

## AI Response System

The bot uses OpenAI GPT-3.5-turbo to generate context-aware responses about the battery management system.

**System Prompt:**
```
You are a helpful assistant for the Ottawa monitoring system. 
You have access to the current status of the battery systems and alerts. 
When asked about status, provide a summary. 
When asked about alerts, explain the severity and implications.
Keep your responses concise and suitable for a chat interface like Line.
```

**Example Conversation:**
```
User: What's the current system status?
Bot: The battery management system is operating normally. All 5 battery units 
     are within normal parameters. There are no active critical alerts.

User: Any warnings?
Bot: There is 1 warning level alert for Battery Unit 2 regarding slightly 
     elevated temperature (32°C). This is being monitored.
```

## Logging

The service uses Winston for structured logging:

```typescript
// Log levels
logger.error('Error message');
logger.warn('Warning message');
logger.info('Info message');
logger.debug('Debug message');
```

**Log Format:** JSON format with service metadata

**Log Output:** Console (can be extended to file/external service)

## Security Considerations

### Current Implementation

✅ **Helmet:** Security headers
✅ **CORS:** Cross-origin request handling
✅ **LINE Signature Verification:** Webhook requests verified
✅ **Environment Variables:** Sensitive data not in code

### ⚠️ Required Improvements

❌ **Authentication:** `/notify` endpoint needs API key auth
❌ **Rate Limiting:** No protection against DoS
❌ **Input Validation:** Message content not validated
❌ **HTTPS Only:** Should enforce HTTPS in production

See `LINE_BOT_ANALYSIS.md` for detailed security recommendations.

## Deployment

### Docker Deployment (Recommended)

```dockerfile
# Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
ENV NODE_ENV=production
EXPOSE 3002
CMD ["node", "dist/index.js"]
```

**Build and Run:**
```bash
docker build -t line-bot:latest .
docker run -p 3002:3002 --env-file .env line-bot:latest
```

### Manual Deployment

```bash
# Build
npm run build

# Set environment variables
export LINE_CHANNEL_ACCESS_TOKEN="..."
export LINE_CHANNEL_SECRET="..."
export OPENAI_API_KEY="..."

# Run
npm start
```

### Reverse Proxy Configuration (Nginx)

```nginx
location /webhook {
    proxy_pass http://localhost:3002/webhook;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

## Monitoring

### Health Check

```bash
curl http://localhost:3002/health
```

Should return:
```json
{"status":"ok","service":"line-bot"}
```

### Logs

Watch logs in development:
```bash
npm run dev | bunyan  # If using bunyan for JSON log formatting
```

### Metrics (Future)

- Request count per endpoint
- Response times
- LINE API call success/failure rates
- OpenAI API usage
- Active followers count

## Troubleshooting

### Webhook Not Receiving Events

1. **Check webhook URL** in LINE Developers Console
2. **Verify webhook is enabled** in Messaging API settings
3. **Check logs** for incoming requests
4. **Verify signature** validation is working
5. **Test with ngrok** if developing locally:
   ```bash
   ngrok http 3002
   # Use ngrok URL in LINE Console
   ```

### AI Responses Not Working

1. **Check OpenAI API key** is valid
2. **Verify API quota** not exceeded
3. **Check logs** for OpenAI errors
4. **Test OpenAI** connection separately

### Authentication Errors

1. **Verify LINE credentials** are correct
2. **Check token expiration** (tokens don't expire unless revoked)
3. **Regenerate tokens** in LINE Console if needed

### Build Errors

```bash
# Clean and rebuild
rm -rf dist node_modules
npm install
npm run build
```

## Development Guidelines

### Code Style

- TypeScript strict mode enabled
- ES Modules (not CommonJS)
- Async/await for asynchronous operations
- Comprehensive error handling
- Descriptive variable names

### Adding New Features

1. Create feature branch
2. Add TypeScript types
3. Add error handling
4. Add logging
5. Write tests (when test infrastructure ready)
6. Update documentation
7. Create PR

### Testing Webhook Locally

```bash
# Install ngrok
npm install -g ngrok

# Start ngrok
ngrok http 3002

# Copy ngrok URL to LINE Console webhook settings
# Example: https://abc123.ngrok.io/webhook
```

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `LINE_CHANNEL_ACCESS_TOKEN` | Yes | - | LINE channel access token |
| `LINE_CHANNEL_SECRET` | Yes | - | LINE channel secret |
| `OPENAI_API_KEY` | Yes | - | OpenAI API key |
| `OPENAI_MODEL` | No | `gpt-3.5-turbo` | OpenAI model to use |
| `PORT` | No | `3002` | Server port |
| `NODE_ENV` | No | `development` | Environment (development/production) |
| `LOG_LEVEL` | No | `info` | Log level (error/warn/info/debug) |
| `API_SECRET_KEY` | Recommended | - | API key for /notify endpoint |
| `ALLOWED_ORIGINS` | No | `*` | CORS allowed origins |
| `BACKEND_API_URL` | No | - | Backend API URL for system context |

## Related Documentation

- [LINE Messaging API Documentation](https://developers.line.biz/en/docs/messaging-api/)
- [LINE Bot SDK for Node.js](https://github.com/line/line-bot-sdk-nodejs)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [LINE_BOT_ANALYSIS.md](./LINE_BOT_ANALYSIS.md) - Detailed analysis and improvement plan

## Support

For issues or questions:
1. Check logs for error messages
2. Review LINE_BOT_ANALYSIS.md for known issues
3. Consult LINE API documentation
4. Contact development team

## License

Part of NT-POC Battery Management System

---

**Status:** ✅ Operational - Requires security hardening before production use

**Last Updated:** $(date)
