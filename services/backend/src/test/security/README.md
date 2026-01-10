# Security Testing

This directory contains security testing infrastructure using OWASP ZAP for vulnerability scanning.

## Quick Start

```bash
# Run unit security tests (no external dependencies)
npm run test:security

# Run full security scan with OWASP ZAP
npm run test:security:full
```

## Test Files

- `__tests__/sqlInjection.test.ts` - SQL injection prevention tests
- `__tests__/xss.test.ts` - XSS prevention tests
- `__tests__/csrf.test.ts` - CSRF protection tests
- `__tests__/authBypass.test.ts` - Authentication bypass tests
- `__tests__/zapIntegration.test.ts` - OWASP ZAP integration tests

## Infrastructure

- `zap-config.ts` - OWASP ZAP configuration
- `zapClient.ts` - ZAP API client wrapper
- `securityTestRunner.ts` - Test orchestration

## Documentation

See `../../../T215_IMPLEMENTATION_COMPLETE.md` for full documentation.
