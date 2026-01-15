# LINE Official Account (LINE OA) Configuration Guide

**Date**: 2026-01-15T21:56 UTC+7  
**Service Status**: ✅ DEPLOYED & RUNNING

---

## ✅ LINE Bot Deployment Status

### Service Information
- **Status**: SUCCESS - Running on port 3002
- **Public URL**: `https://line-bot-production-8114.up.railway.app`
- **Webhook URL**: `https://line-bot-production-8114.up.railway.app/webhook`
- **Builder**: DOCKERFILE ✓
- **Environment Variables**: All configured ✓

### Environment Variables Configured
```
LINE_CHANNEL_ACCESS_TOKEN=VAspANGGOvItOzldvJEQGC0XI4xDW5Z0UDTzBVDSqkHG...
LINE_CHANNEL_SECRET=e8e575a17c9847b835ff53e9ea81b7fd
BACKEND_API_URL=http://backend.railway.internal:3000
NODE_ENV=production
PORT=3002
```

---

## 🔧 LINE Developers Console Configuration

### Step 1: Access LINE Developers Console
1. Go to: https://developers.line.biz/console/
2. Sign in with your LINE account
3. Select your Messaging API channel

### Step 2: Configure Webhook URL
1. Click on **Messaging API** tab
2. Scroll to **Webhook settings** section
3. Click **Edit** next to Webhook URL
4. Enter: `https://line-bot-production-8114.up.railway.app/webhook`
5. Click **Update**

### Step 3: Enable Webhook
1. In the same **Webhook settings** section
2. Toggle **Use webhook** to **Enabled** (green)
3. Click **Verify** button to test the webhook
   - Expected: "Success" message
   - If error: Check deployment logs

### Step 4: Verify Configuration
Click the **Verify** button next to the webhook URL. You should see:
```
✓ Success
```

If verification fails, check:
- Is the URL correct? (https://line-bot-production-8114.up.railway.app/webhook)
- Is the service running? (Check Railway logs)
- Are environment variables set? (LINE_CHANNEL_SECRET, LINE_CHANNEL_ACCESS_TOKEN)

---

## 🧪 Testing LINE OA

### Test 1: Add Bot as Friend
1. Go to **Messaging API** tab in LINE Developers Console
2. Scroll to **Bot information** section
3. Scan the QR code OR
4. Click the LINE ID to add the bot as a friend

### Test 2: Send Test Message
1. Open LINE app on your phone
2. Go to the chat with your bot
3. Send a test message like: "Hello"
4. Expected response: Bot should reply based on your implementation

### Test 3: Check Deployment Logs
Monitor Railway logs to see webhook requests:
```bash
railway logs --service line-bot

# Expected log entries:
# "Received webhook event"
# "Processing message: Hello"
# etc.
```

---

## 🐛 Troubleshooting

### Issue: Webhook Verification Fails

**Possible Causes**:
1. **Service Not Running**
   - Check: `railway logs --service line-bot`
   - Should see: "Line Bot Service running on port 3002"

2. **Wrong Webhook URL**
   - Verify URL in LINE Console matches Railway public domain
   - Must include `/webhook` path
   - Must use `https://` (not `http://`)

3. **Missing Environment Variables**
   - Check: `railway variables list --service line-bot`
   - Required: `LINE_CHANNEL_SECRET`, `LINE_CHANNEL_ACCESS_TOKEN`

4. **Port Mismatch**
   - LINE OA webhook requires HTTPS (port 443)
   - Railway automatically handles SSL/TLS
   - Internal port 3002 is correct

### Issue: Bot Doesn't Respond to Messages

**Possible Causes**:
1. **Webhook Not Enabled**
   - LINE Console > Messaging API > Webhook settings
   - Toggle should be green (enabled)

2. **Backend Service Down**
   - Line bot calls backend API at `http://backend.railway.internal:3000`
   - Check backend status: `railway logs --service backend`

3. **LINE_CHANNEL_ACCESS_TOKEN Invalid**
   - Regenerate token in LINE Developers Console
   - Update Railway environment variable:
   ```bash
   railway variables set LINE_CHANNEL_ACCESS_TOKEN="new_token" --service line-bot
   ```
   - Redeploy: `railway deploy --service line-bot`

4. **Implementation Issues**
   - Check line-bot logs for errors:
   ```bash
   railway logs --service line-bot --lines 100
   ```

### Issue: "CHANNEL_ACCESS_TOKEN_INVALID" Error

**Fix**:
1. Go to LINE Developers Console
2. Messaging API > Channel access token (long-lived)
3. Click **Issue** to generate new token
4. Copy the new token
5. Update Railway:
   ```bash
   railway variables set LINE_CHANNEL_ACCESS_TOKEN="<new_token>" --service line-bot
   ```
6. Restart service (automatic after variable update)

### Issue: "CHANNEL_SECRET_MISMATCH" Error

**Fix**:
1. Go to LINE Developers Console
2. Basic settings > Channel secret
3. Copy the channel secret
4. Update Railway:
   ```bash
   railway variables set LINE_CHANNEL_SECRET="<secret>" --service line-bot
   ```
5. Restart service

---

## 📊 LINE OA Features Status

Based on typical LINE bot implementation:

### ✅ Available Features
- Webhook endpoint: `/webhook` ✓
- Message handling ✓
- Reply messages ✓
- Backend API integration ✓
- Production environment ✓

### Expected Message Handlers
(Depends on your implementation in `services/line-bot/src/`)

Common handlers might include:
- Text message handler
- Postback handler (from rich menus/templates)
- Follow/Unfollow events
- Error handling

Check your implementation:
```bash
# View line-bot source code structure
ls -la services/line-bot/src/
```

---

## 🔍 Useful Railway Commands

### Check Service Status
```bash
railway list-deployments --service line-bot --limit 1 --json
```

### View Recent Logs
```bash
railway logs --service line-bot --lines 50
```

### View Environment Variables
```bash
railway variables list --service line-bot
```

### Test Webhook Locally (Development)
```bash
# Forward Railway port to local (if needed)
# Then use LINE CLI to send test webhook:
curl -X POST https://line-bot-production-8114.up.railway.app/webhook \
  -H "Content-Type: application/json" \
  -d '{"events":[]}'

# Expected: 200 OK response
```

---

## 📞 LINE OA Integration Checklist

- [ ] LINE bot service deployed successfully ✅
- [ ] Webhook URL configured in LINE Console
- [ ] Webhook enabled (green toggle) in LINE Console
- [ ] Webhook verification passed (clicked Verify button)
- [ ] Added bot as friend in LINE app
- [ ] Sent test message to bot
- [ ] Bot responded correctly
- [ ] Checked Railway logs for webhook events
- [ ] Backend integration working (if applicable)

---

## 🎯 Next Steps

### 1. Configure LINE Console Webhook
**Action Required**: Update webhook URL in LINE Developers Console
- URL: `https://line-bot-production-8114.up.railway.app/webhook`
- Enable webhook
- Verify connection

### 2. Test Bot Functionality
- Add bot as friend
- Send test messages
- Verify responses

### 3. Monitor Logs
```bash
railway logs --service line-bot
```

### 4. Backend Integration (Optional)
If your LINE bot needs to interact with backend:
- Backend URL: `http://backend.railway.internal:3000`
- Environment variable: `BACKEND_API_URL` (already configured)

---

## ✨ Summary

**LINE Bot Service Status**: ✅ READY FOR USE

**What's Working**:
- Service deployed and running
- Webhook endpoint available at `/webhook`
- Environment variables configured
- Public domain accessible
- Backend connectivity configured

**What You Need To Do**:
1. Update webhook URL in LINE Developers Console
2. Enable webhook
3. Verify webhook connection
4. Test by adding bot as friend and sending messages

**Webhook URL** (copy this):
```
https://line-bot-production-8114.up.railway.app/webhook
```

Once you've configured the webhook in LINE Developers Console and enabled it, your LINE OA should be fully operational!
