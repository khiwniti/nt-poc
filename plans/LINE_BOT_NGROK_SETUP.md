# LINE Bot - ngrok Setup for Local Development

**Purpose**: Expose your local LINE Bot (localhost:3002) to the internet for LINE Platform webhook testing

## ✅ Current Status

Your ngrok is running:
- **Public URL**: `https://unjointured-michael-yolkless.ngrok-free.app`
- **Local Port**: 3002
- **Webhook Endpoint**: `https://unjointured-michael-yolkless.ngrok-free.app/webhook`

## 🔧 Webhook Configuration

### LINE Developer Console Setup

1. **Go to**: https://developers.line.biz/console/
2. **Select your channel**
3. **Navigate to**: Messaging API tab
4. **Webhook Settings**:
   - **Webhook URL**: `https://unjointured-michael-yolkless.ngrok-free.app/webhook`
   - **Use webhook**: Enable (toggle ON)
   - **Verify**: Click "Verify" button - should show success ✅

### Expected Results

**GET Request** (LINE verification):
```json
{
  "status": "ok",
  "message": "LINE Bot webhook endpoint is active",
  "service": "line-bot"
}
```

**POST Request** (actual LINE messages):
- LINE Platform signs requests with `X-Line-Signature` header
- LINE Bot validates signature using `LINE_CHANNEL_SECRET`
- If valid, processes message and sends AI response

## 🧪 Testing

### 1. Test GET Endpoint (Verification)

```bash
curl https://unjointured-michael-yolkless.ngrok-free.app/webhook
```

**Expected**: 200 OK with JSON response

### 2. Test via ngrok Dashboard

Open: http://127.0.0.1:4040

**You'll see**:
- All incoming requests
- Request/response bodies
- Headers (including LINE signature)
- Status codes

### 3. Test with LINE App

1. **Add bot as friend** in LINE mobile app
2. **Send test message**: "Hello"
3. **Check ngrok dashboard**: Should see POST to `/webhook`
4. **Receive response**: From your local Claude instance!

## 🔍 Monitoring

### ngrok Web Interface

Visit: http://127.0.0.1:4040

**Features**:
- Request history
- Request/response inspection
- Replay requests
- Filter by status code

### LINE Bot Logs

Terminal 2 shows live logs:
```bash
# Watch for:
info: Line Bot Service running on port 3002
# When messages arrive:
# - Webhook events received
# - AI responses generated
# - LINE API calls made
```

### Check Webhook Status

```bash
# Health check
curl http://localhost:3002/health

# Webhook verification
curl http://localhost:3002/webhook

# Via ngrok
curl https://unjointured-michael-yolkless.ngrok-free.app/webhook
```

## 🎯 Message Flow

```
LINE User (Mobile App)
    ↓ sends message
LINE Platform
    ↓ POST /webhook (signed)
ngrok (unjointured-michael-yolkless.ngrok-free.app)
    ↓ forwards to localhost:3002
LINE Bot Service (:3002)
    ↓ validates signature
    ↓ extracts message
AI Service (aiResponse.ts)
    ↓ sends to localhost:4141
Local Claude (:4141)
    ↓ generates response
LINE Bot Service
    ↓ sends reply via LINE API
LINE Platform
    ↓ delivers message
LINE User (Mobile App)
    ↓ receives Claude response!
```

## ⚠️ Common Issues

### Issue: "403 Forbidden" in ngrok

**Cause**: ngrok free plan shows warning page
**Solution**: User must click "Visit Site" on first access

### Issue: Webhook verification fails in LINE Console

**Causes**:
1. ngrok not running
2. LINE Bot service not running
3. Wrong webhook URL

**Debug**:
```bash
# Check ngrok is running
curl https://unjointured-michael-yolkless.ngrok-free.app/webhook

# Check local service
curl http://localhost:3002/webhook

# Check logs in Terminal 2
```

### Issue: "SignatureValidationFailed"

**Cause**: Invalid `LINE_CHANNEL_SECRET`
**Fix**: Verify `.env` has correct channel secret from LINE Console

### Issue: No response to LINE messages

**Debug steps**:

1. **Check ngrok dashboard** (http://127.0.0.1:4040):
   - Is POST request received?
   - What's the status code?
   - What's in the response?

2. **Check LINE Bot logs** (Terminal 2):
   - Any errors?
   - Is AI request sent to Claude?

3. **Check Claude is running**:
   ```bash
   curl http://localhost:4141/v1/models
   ```

4. **Test AI service manually**:
   ```bash
   # Send test request
   curl -X POST http://localhost:3002/notify \
     -H "Content-Type: application/json" \
     -H "x-api-key: YOUR_API_SECRET_KEY" \
     -d '{"message": "test"}'
   ```

## 🔄 Restarting ngrok

If you restart ngrok, the URL changes:

1. **Start ngrok**:
   ```bash
   ngrok http 3002
   ```

2. **Copy new URL** (shown in terminal)

3. **Update LINE Console**:
   - New webhook URL: `https://NEW-URL.ngrok-free.app/webhook`
   - Click "Verify" to test

4. **Test**:
   ```bash
   curl https://NEW-URL.ngrok-free.app/webhook
   ```

## 💡 Tips

### Keep ngrok URL Stable

**Free Plan**: URL changes on restart
**Paid Plans**: Get fixed subdomain

### Webhook Security

Your webhook is secured by:
- ✅ LINE signature validation
- ✅ Channel secret verification
- ✅ HTTPS (via ngrok)

### Local Development Workflow

1. **Start services**:
   ```bash
   # Terminal 1: Local Claude on :4141
   # Terminal 2: LINE Bot on :3002
   # Terminal 3: ngrok http 3002
   ```

2. **Configure LINE webhook** (once per ngrok restart)

3. **Test via LINE app**

4. **Monitor**:
   - ngrok dashboard: http://127.0.0.1:4040
   - Terminal 2: LINE Bot logs
   - Terminal 1/Claude logs

## 📊 Current Setup

```
✅ Local Claude: http://localhost:4141/v1
✅ LINE Bot: http://localhost:3002
✅ ngrok: https://unjointured-michael-yolkless.ngrok-free.app
✅ Webhook: /webhook (GET and POST supported)
✅ Health: /health
```

## 🚀 Quick Commands

```bash
# Test webhook (GET)
curl https://unjointured-michael-yolkless.ngrok-free.app/webhook

# Test health
curl http://localhost:3002/health

# Check LINE Bot logs
# (Terminal 2 shows live logs)

# Check ngrok requests
# Open: http://127.0.0.1:4040

# Test Claude
curl http://localhost:4141/v1/models

# Restart LINE Bot if needed
lsof -ti:3002 | xargs kill -9
cd services/line-bot && npm run dev
```

## ✅ Success Checklist

- [ ] ngrok running with public URL
- [ ] LINE Bot running on :3002
- [ ] Local Claude running on :4141
- [ ] Webhook URL configured in LINE Console
- [ ] Webhook verification successful (click "Verify" in LINE Console)
- [ ] GET /webhook returns 200 OK
- [ ] Bot added as friend in LINE app
- [ ] Test message sent
- [ ] AI response received in LINE app
- [ ] ngrok dashboard shows successful requests

---

**Your LINE Bot is now accessible via ngrok and ready to receive messages from the LINE Platform!** 🎉

The GET endpoint ensures LINE's webhook verification succeeds, and POST endpoint handles actual messages with Claude-powered responses.
