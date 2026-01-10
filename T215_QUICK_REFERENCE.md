# T215: Security Testing Quick Reference

## Quick Commands

```bash
# Run unit security tests only
npm run test:security

# Start OWASP ZAP
npm run security:zap:start

# Run ZAP integration tests (ZAP must be running)
npm run test:security:zap

# Run full security suite (auto-starts/stops ZAP)
npm run test:security:full

# Stop ZAP
npm run security:zap:stop
```

## Test Coverage

| Test Suite | File | Tests |
|------------|------|-------|
| SQL Injection | `sqlInjection.test.ts` | 15+ payloads |
| XSS Prevention | `xss.test.ts` | 12+ payloads |
| CSRF Protection | `csrf.test.ts` | 10+ scenarios |
| Auth Bypass | `authBypass.test.ts` | 20+ cases |
| ZAP Integration | `zapIntegration.test.ts` | Full scan |

## Environment Variables

```bash
ZAP_TARGET_URL="http://localhost:3001"
ZAP_API_KEY="changeme"
ZAP_PORT="8080"
ZAP_HOST="localhost"
```

## Reports Location

`./security-reports/security-scan-{timestamp}.{html,json,md}`

## Key Features

✅ Automated vulnerability scanning
✅ SQL injection prevention testing
✅ XSS prevention testing
✅ CSRF protection validation
✅ Authentication bypass testing
✅ HTML/JSON/Markdown reports
✅ CI/CD ready

## Scan Types

- **Passive**: Safe, continuous scanning
- **Spider**: Application crawling
- **Active**: Aggressive vulnerability testing

## Status: ✅ COMPLETE

All acceptance criteria met. See T215_IMPLEMENTATION_COMPLETE.md for details.
