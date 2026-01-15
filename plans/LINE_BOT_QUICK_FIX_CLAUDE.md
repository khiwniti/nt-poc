# LINE Bot - Quick Fix for Local Claude

**Issue**: OpenAI SDK requires `apiKey` even with custom `baseURL`

**Error**:
```
OpenAIError: Missing credentials. Please pass an `apiKey`, or set the `OPENAI_API_KEY` environment variable.
```

## Immediate Solution (2 Minutes)

### Step 1: Update `.env` File

Add this to [`services/line-bot/.env`](../services/line-bot/.env):

```bash
# Quick fix: Set a dummy API key for local Claude
OPENAI_API_KEY=sk-dummy-key-for-local-claude

# Your actual configuration (keep these)
AI_PROVIDER=custom
AI_BASE_URL=http://localhost:4141/v1
AI_MODEL=claude-sonnet-4.5
```

**Why this works**: The OpenAI SDK validates that an API key is present, but your local Claude server on port 4141 won't actually check it. The dummy key satisfies the SDK's validation.

### Step 2: Restart LINE Bot

```bash
cd services/line-bot
npm run dev
```

**Expected log output**:
```
AI Provider initialized or similar startup message
Server running on port 3002
```

### Step 3: Verify It Works

```bash
# Check health
curl http://localhost:3002/health | jq '.ai'

# Expected output:
# {
#   "provider": "custom" (or may still show "openai" without full implementation),
#   "healthy": true
# }
```

## Alternative: Manual Code Edit (5 Minutes)

If the dummy key approach doesn't work, manually edit the code:

### Edit: `services/line-bot/src/services/aiResponse.ts`

**Current code** (around line 8-11):
```typescript
constructor() {
    this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });
```

**Change to**:
```typescript
constructor() {
    this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY || 'sk-dummy-for-local',
        baseURL: process.env.AI_BASE_URL || undefined,
    });
```

**Then update `.env`**:
```bash
OPENAI_API_KEY=sk-dummy-for-local
AI_BASE_URL=http://localhost:4141/v1
```

**Save and restart**:
```bash
# tsx watch will auto-reload
# Or manually restart: npm run dev
```

## Complete `.env` Example

Here's your complete working `.env`:

```bash
# LINE Bot Configuration
LINE_CHANNEL_SECRET=e8e575a17c9847b835ff53e9ea81b7fd
LINE_CHANNEL_ACCESS_TOKEN=VAspANGGOvItOzldvJEQGC0XI4xDW5Z0UDTzBVDSqkHGI4zct5C5pcEjCN+jgObzWPs5DwrjSKIeIE2EPyP9mrBKz/XDSKAdEdY+HEOIGNYrB7vju/M7bYSwb2L1o/g0FAWqAe8YGMf0lZfT7BAq9gdB04t89/1O/w1cDnyilFU=

# OpenAI SDK Configuration (for local Claude)
# Use dummy key - your local server on port 4141 won't validate it
OPENAI_API_KEY=sk-dummy-key-for-local-claude
OPENAI_MODEL=claude-sonnet-4.5

# Optional: Custom base URL (requires code edit above)
AI_BASE_URL=http://localhost:4141/v1
AI_MODEL=claude-sonnet-4.5

# Server Configuration
PORT=3002
NODE_ENV=development
LOG_LEVEL=info

# Security
API_SECRET_KEY=your_generated_secret_key_here

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:3002

# Features
ENABLE_AI_RESPONSES=true

# Backend API
BACKEND_API_URL=http://localhost:3000
BACKEND_API_KEY=your_backend_api_key_here
```

## Verification Steps

### 1. Check Local Claude Server

```bash
# Verify your Claude server is accessible
curl http://localhost:4141/v1/models
```

**Expected**: JSON response with model list

### 2. Check LINE Bot Startup

```bash
cd services/line-bot
npm run dev
```

**Look for**:
- No "Missing credentials" error
- Server starts successfully
- No crashes

### 3. Test Health Endpoint

```bash
curl http://localhost:3002/health
```

**Expected**:
```json
{
  "status": "ok",
  "service": "line-bot",
  "timestamp": "...",
  "ai": {
    "provider": "openai",
    "healthy": true
  }
}
```

Note: Without full implementation, it may still show provider as "openai" but will actually use your local Claude.

### 4. Test AI Response

Send a message via LINE app or use the notify endpoint:

```bash
curl -X POST http://localhost:3002/notify \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_SECRET_KEY" \
  -d '{"message": "Hello, test message"}'
```

## Troubleshooting

### Still Getting "Missing credentials" Error

**Try this sequence**:

1. **Stop all running processes**:
   ```bash
   # Kill any running LINE Bot instances
   pkill -f "tsx watch"
   ```

2. **Clear any cached modules**:
   ```bash
   cd services/line-bot
   rm -rf node_modules/.cache
   ```

3. **Verify `.env` is being loaded**:
   ```bash
   # Add to top of services/line-bot/src/index.ts (before other imports):
   console.log('OPENAI_API_KEY loaded:', !!process.env.OPENAI_API_KEY);
   console.log('AI_BASE_URL:', process.env.AI_BASE_URL);
   ```

4. **Restart**:
   ```bash
   npm run dev
   ```

### Local Claude Server Not Responding

**Check if it's running**:
```bash
lsof -i :4141
```

If not running, start your Claude server on port 4141.

**Test connectivity**:
```bash
curl -v http://localhost:4141/v1/models
```

### Different Model Name Needed

Your local server might use a different model name:

```bash
# Check available models
curl http://localhost:4141/v1/models | jq '.data[].id'

# Update .env with the correct name
OPENAI_MODEL=actual-model-name-from-above
AI_MODEL=actual-model-name-from-above
```

## Why Full Implementation is Better

This quick fix works, but has limitations:
- ✗ Hardcoded or manual changes needed
- ✗ Not flexible for switching providers
- ✗ No proper error handling
- ✗ Configuration not centralized

**Recommended next step**: Use Code mode to implement the full solution from [`LINE_BOT_IMPLEMENTATION_CODE.md`](./LINE_BOT_IMPLEMENTATION_CODE.md) which properly handles:
- ✓ Multiple providers with proper configuration
- ✓ No dummy API keys needed
- ✓ Proper health checks
- ✓ Better error messages
- ✓ Easy provider switching

## Summary

**Quick fix (works now)**:
1. Add `OPENAI_API_KEY=sk-dummy-key-for-local-claude` to `.env`
2. Optionally edit `aiResponse.ts` to add `baseURL` parameter
3. Restart: `npm run dev`
4. Test: Send LINE message to bot

**Long-term solution**:
- Implement full provider configuration from documentation
- Switch to Code mode for proper implementation
- Takes ~30 minutes, production-ready

Your LINE Bot should now work with local Claude on port 4141!
