# LINE Bot Service - Quick Start Guide

## ⚡ Quick Setup (5 minutes)

### Step 1: Install Dependencies
```bash
cd services/line-bot
npm install
```

### Step 2: Configure Environment
```bash
# Copy example environment file
cp .env.example .env

# Edit with your credentials
nano .env
```

**Minimum required:**
```env
LINE_CHANNEL_ACCESS_TOKEN=your_token_here
LINE_CHANNEL_SECRET=your_secret_here
OPENAI_API_KEY=your_key_here
API_SECRET_KEY=generate_random_string_here
```

### Step 3: Get LINE Credentials

1. Visit [LINE Developers Console](https://developers.line.biz/console/)
2. Create a Messaging API Channel
3. Copy Channel Access Token → `.env`
4. Copy Channel Secret → `.env`

### Step 4: Get OpenAI API Key

1. Visit [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create new API key
3. Copy to `.env`

### Step 5: Generate API Secret
```bash
# Generate random string
openssl rand -hex 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Copy to .env
```

### Step 6: Start Service
```bash
# Development mode (with hot reload)
npm run dev

# Production mode
npm run build
npm start
```

## ✅ Verify It's Working

### 1. Check Health
```bash
curl http://localhost:3002/health
```

Expected response:
```json
{"status":"ok","service":"line-bot"}
```

### 2. Test Broadcast (with authentication)
```bash
curl -X POST http://localhost:3002/notify \
  -H "Content-Type: application/json" \
  -H "x-api-key: your_api_secret_key_here" \
  -d '{"message": "Test notification from LINE bot"}'
```

Expected response:
```json
{"status":"success","message":"Broadcast sent successfully"}
```

### 3. Test Webhook (LINE will call this)

Set up ngrok for local testing:
```bash
# Install ngrok
npm install -g ngrok

# Start ngrok
ngrok http 3002

# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
# Set as webhook URL in LINE Console: https://abc123.ngrok.io/webhook
```

## 🐳 Docker Quick Start

### Build Docker Image
```bash
docker build -t line-bot:latest .
```

### Run with Docker
```bash
docker run -p 3002:3002 \
  -e LINE_CHANNEL_ACCESS_TOKEN="your_token" \
  -e LINE_CHANNEL_SECRET="your_secret" \
  -e OPENAI_API_KEY="your_key" \
  -e API_SECRET_KEY="your_api_key" \
  line-bot:latest
```

### Run with Docker Compose

Add to `docker-compose.yml`:
```yaml
services:
  line-bot:
    build: ./services/line-bot
    ports:
      - "3002:3002"
    environment:
      - LINE_CHANNEL_ACCESS_TOKEN=${LINE_CHANNEL_ACCESS_TOKEN}
      - LINE_CHANNEL_SECRET=${LINE_CHANNEL_SECRET}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - API_SECRET_KEY=${API_SECRET_KEY}
      - NODE_ENV=production
    restart: unless-stopped
```

Then:
```bash
docker-compose up line-bot
```

## 🔧 Common Issues

### Issue: "API key required" when calling /notify
**Solution:** Add `x-api-key` header with your API_SECRET_KEY value

### Issue: Webhook not receiving messages
**Solution:** 
1. Check webhook URL in LINE Console
2. Ensure webhook is enabled
3. Verify SSL certificate if using HTTPS
4. Check service logs

### Issue: AI responses not working
**Solution:**
1. Verify OPENAI_API_KEY is valid
2. Check OpenAI account has credits
3. Review logs for OpenAI errors

### Issue: "LINE Channel Access Token missing"
**Solution:** Check .env file has correct LINE_CHANNEL_ACCESS_TOKEN

## 📊 Monitoring

### View Logs
```bash
# Development
npm run dev

# Production (if using PM2)
pm2 logs line-bot

# Docker
docker logs -f <container_id>
```

### Check Service Status
```bash
# Health check
curl http://localhost:3002/health

# With watch
watch -n 5 'curl -s http://localhost:3002/health'
```

## 🔗 Integration with Backend

Call from backend service:
```typescript
import axios from 'axios';

async function sendLineNotification(message: string) {
    try {
        await axios.post('http://line-bot:3002/notify', 
            { message },
            { 
                headers: {
                    'x-api-key': process.env.LINE_BOT_API_KEY,
                    'Content-Type': 'application/json'
                }
            }
        );
    } catch (error) {
        console.error('Failed to send LINE notification:', error);
    }
}

// Usage
await sendLineNotification('Critical alert: Temperature exceeded threshold');
```

## 📚 Next Steps

1. ✅ Service is running
2. Set webhook URL in LINE Console
3. Test with LINE app
4. Integrate with backend for alerts
5. Monitor logs for issues
6. Review `LINE_BOT_ANALYSIS.md` for improvements
7. Add tests (optional)
8. Set up production deployment

## 🆘 Need Help?

- Check `README.md` for detailed documentation
- Review `LINE_BOT_ANALYSIS.md` for troubleshooting
- Check LINE API documentation
- Review service logs

## 🎯 Production Checklist

Before deploying to production:

- [ ] All environment variables configured
- [ ] API_SECRET_KEY set to secure random string
- [ ] HTTPS enabled (required by LINE)
- [ ] Webhook URL configured in LINE Console
- [ ] Health check endpoint accessible
- [ ] Logging configured properly
- [ ] Error monitoring set up
- [ ] Backup credentials stored securely
- [ ] Rate limiting considered
- [ ] Firewall rules configured
- [ ] SSL certificate valid

---

**Service Status:** ✅ Ready for Development
**Production Ready:** ⚠️ Requires additional hardening (see LINE_BOT_ANALYSIS.md)
