# LINE Bot Service - Testing Checklist

## ✅ Manual Testing Checklist

### Pre-Testing Setup
- [ ] Service is running (`npm run dev` or `npm start`)
- [ ] Environment variables configured
- [ ] LINE credentials valid
- [ ] OpenAI API key valid
- [ ] ngrok running (for local webhook testing)

### 1. Health Check Endpoint
```bash
curl http://localhost:3002/health
```
- [ ] Returns HTTP 200
- [ ] Response: `{"status":"ok","service":"line-bot"}`
- [ ] No errors in logs

### 2. Notify Endpoint - Security

#### Test: Without API Key
```bash
curl -X POST http://localhost:3002/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Test"}'
```
- [ ] Returns HTTP 401
- [ ] Response contains "API key required"
- [ ] Warning logged

#### Test: With Invalid API Key
```bash
curl -X POST http://localhost:3002/notify \
  -H "Content-Type: application/json" \
  -H "x-api-key: wrong_key" \
  -d '{"message": "Test"}'
```
- [ ] Returns HTTP 401
- [ ] Response contains "Invalid API key"
- [ ] Warning logged with IP address

#### Test: With Valid API Key
```bash
curl -X POST http://localhost:3002/notify \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_SECRET_KEY" \
  -d '{"message": "Test notification"}'
```
- [ ] Returns HTTP 200
- [ ] Response: `{"status":"success","message":"Broadcast sent successfully"}`
- [ ] Message sent to LINE (check LINE app)
- [ ] Info logged

### 3. Notify Endpoint - Validation

#### Test: Missing Message
```bash
curl -X POST http://localhost:3002/notify \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_SECRET_KEY" \
  -d '{}'
```
- [ ] Returns HTTP 400
- [ ] Response contains "Message is required"

#### Test: Empty Message
```bash
curl -X POST http://localhost:3002/notify \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_SECRET_KEY" \
  -d '{"message": ""}'
```
- [ ] Returns HTTP 400
- [ ] Response contains "Message cannot be empty"

#### Test: Non-String Message
```bash
curl -X POST http://localhost:3002/notify \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_SECRET_KEY" \
  -d '{"message": 123}'
```
- [ ] Returns HTTP 400
- [ ] Response contains "Message must be a string"

#### Test: Message Too Long (>5000 chars)
```bash
curl -X POST http://localhost:3002/notify \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_SECRET_KEY" \
  -d "{\"message\": \"$(python -c 'print("A" * 5001)')\"}"
```
- [ ] Returns HTTP 400
- [ ] Response contains "Message too long"
- [ ] Warning logged

#### Test: Valid Message
```bash
curl -X POST http://localhost:3002/notify \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_SECRET_KEY" \
  -d '{"message": "Hello from LINE bot! 🤖"}'
```
- [ ] Returns HTTP 200
- [ ] Message received in LINE app
- [ ] Contains emoji correctly

### 4. Webhook Endpoint - LINE Integration

#### Test: Webhook Signature Verification

1. Set webhook URL in LINE Console
2. Send test message from LINE app
3. Check logs

- [ ] Webhook request received
- [ ] Signature verified (no errors)
- [ ] Event processed
- [ ] Reply sent to LINE

#### Test: Text Message
Send: "What is the system status?"

- [ ] Message received
- [ ] AI response generated
- [ ] Response sent to LINE
- [ ] Response is relevant
- [ ] Response appears in LINE app

#### Test: Follow Event
Add bot as friend in LINE app

- [ ] Follow event received
- [ ] Event logged
- [ ] No errors

### 5. AI Response Service

#### Test: Simple Query
Send via LINE: "Hello"

- [ ] Response generated
- [ ] Response time < 5 seconds
- [ ] Response is contextual
- [ ] No errors logged

#### Test: System Query
Send via LINE: "Show me battery status"

- [ ] Response mentions battery system
- [ ] Response is helpful
- [ ] Response under 5000 chars

#### Test: Complex Query
Send via LINE: "What are the current alerts and their severity levels?"

- [ ] Response addresses alerts
- [ ] Response is detailed
- [ ] Response is well-formatted

### 6. Error Handling

#### Test: OpenAI API Error
1. Set invalid OPENAI_API_KEY
2. Send message via LINE

- [ ] Error logged
- [ ] Fallback response sent
- [ ] Service continues running

#### Test: LINE API Error
1. Set invalid LINE_CHANNEL_ACCESS_TOKEN
2. Try broadcast

- [ ] Error logged
- [ ] Service logs warning
- [ ] Service continues running

### 7. Logging

#### Test: Log Levels
Check logs contain:

- [ ] INFO: Service startup
- [ ] INFO: Successful broadcasts
- [ ] WARN: Missing API key
- [ ] WARN: Invalid credentials
- [ ] ERROR: Failed API calls

### 8. Performance

#### Test: Response Time
```bash
time curl -X POST http://localhost:3002/notify \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_SECRET_KEY" \
  -d '{"message": "Performance test"}'
```
- [ ] Response time < 1 second (without AI)
- [ ] Response time < 5 seconds (with AI)

#### Test: Concurrent Requests
```bash
for i in {1..10}; do
  curl -X POST http://localhost:3002/notify \
    -H "Content-Type: application/json" \
    -H "x-api-key: YOUR_API_SECRET_KEY" \
    -d "{\"message\": \"Test $i\"}" &
done
wait
```
- [ ] All requests succeed
- [ ] No memory leaks
- [ ] No crashes

### 9. Docker Testing

#### Test: Docker Build
```bash
docker build -t line-bot:test .
```
- [ ] Build succeeds
- [ ] No warnings
- [ ] Image size reasonable (<500MB)

#### Test: Docker Run
```bash
docker run -p 3002:3002 --env-file .env line-bot:test
```
- [ ] Container starts
- [ ] Health check passes
- [ ] Service functional
- [ ] Logs visible

### 10. Security

#### Test: CORS
```bash
curl -X OPTIONS http://localhost:3002/notify \
  -H "Origin: http://evil.com" \
  -H "Access-Control-Request-Method: POST"
```
- [ ] CORS headers present
- [ ] Only allowed origins accepted (if configured)

#### Test: Security Headers
```bash
curl -I http://localhost:3002/health
```
- [ ] X-Content-Type-Options: nosniff
- [ ] X-Frame-Options: DENY
- [ ] X-XSS-Protection: 1; mode=block
- [ ] Other Helmet headers present

## 🧪 Automated Test Plan

### Unit Tests (To Be Implemented)

```typescript
// src/services/__tests__/lineBot.test.ts
describe('LineBotService', () => {
  test('should handle text message events')
  test('should handle follow events')
  test('should broadcast messages')
  test('should handle missing credentials gracefully')
})

// src/services/__tests__/aiResponse.test.ts
describe('AIResponseService', () => {
  test('should generate relevant responses')
  test('should handle OpenAI API errors')
  test('should respect message length limits')
})

// src/middleware/__tests__/auth.test.ts
describe('Authentication Middleware', () => {
  test('should reject requests without API key')
  test('should reject requests with invalid API key')
  test('should allow requests with valid API key')
  test('should warn when API key not configured')
})

// src/middleware/__tests__/validation.test.ts
describe('Validation Middleware', () => {
  test('should reject empty messages')
  test('should reject non-string messages')
  test('should reject messages over 5000 chars')
  test('should accept valid messages')
  test('should sanitize message content')
})
```

### Integration Tests (To Be Implemented)

```typescript
// src/__tests__/integration/notify.test.ts
describe('Notify Endpoint Integration', () => {
  test('should send broadcast with valid authentication')
  test('should reject unauthenticated requests')
  test('should validate message content')
})

// src/__tests__/integration/webhook.test.ts
describe('Webhook Endpoint Integration', () => {
  test('should verify LINE signatures')
  test('should handle message events')
  test('should handle follow events')
  test('should reject invalid signatures')
})
```

## 📊 Test Results Template

```markdown
# LINE Bot Test Results

**Date:** [Date]
**Tester:** [Name]
**Environment:** [Development/Staging/Production]

## Summary
- Total Tests: X
- Passed: X
- Failed: X
- Skipped: X

## Failed Tests
1. [Test Name]
   - Expected: [Expected Result]
   - Actual: [Actual Result]
   - Logs: [Relevant Log Entries]

## Issues Found
1. [Issue Description]
   - Severity: [Critical/High/Medium/Low]
   - Steps to Reproduce: [Steps]

## Recommendations
- [Recommendation 1]
- [Recommendation 2]
```

## 🚀 Pre-Deployment Checklist

### Development Environment
- [ ] All manual tests pass
- [ ] No errors in logs
- [ ] Health check works
- [ ] Webhook tested with ngrok
- [ ] AI responses working

### Staging Environment
- [ ] All manual tests pass
- [ ] HTTPS working
- [ ] Webhook configured
- [ ] API authentication working
- [ ] Load testing completed
- [ ] Security scan completed

### Production Environment
- [ ] All staging tests pass
- [ ] Monitoring configured
- [ ] Alerts set up
- [ ] Backup credentials stored
- [ ] Rollback plan ready
- [ ] Documentation updated

## 📝 Notes

### Known Issues
- [List any known issues]

### Test Data
- Test LINE User ID: [User ID]
- Test API Key: [For testing only, not production]

### Additional Testing Tools
- **Postman Collection:** [Link if available]
- **Test Scripts:** [Link if available]

---

**Last Updated:** $(date)
**Next Review:** [Date]
