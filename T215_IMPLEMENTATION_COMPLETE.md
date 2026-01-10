# T215: Security Testing Implementation

## Overview

This document describes the OWASP ZAP security testing implementation for T215. The implementation includes automated security scanning, vulnerability testing for SQL injection, XSS, CSRF, and authentication bypass.

## Files Created

### Security Test Infrastructure
- `src/test/security/zap-config.ts` - OWASP ZAP configuration
- `src/test/security/zapClient.ts` - ZAP API client wrapper
- `src/test/security/securityTestRunner.ts` - Test orchestration

### Security Test Suites
- `src/test/security/__tests__/sqlInjection.test.ts` - SQL injection prevention tests
- `src/test/security/__tests__/xss.test.ts` - XSS prevention tests
- `src/test/security/__tests__/csrf.test.ts` - CSRF protection tests
- `src/test/security/__tests__/authBypass.test.ts` - Authentication bypass tests
- `src/test/security/__tests__/zapIntegration.test.ts` - ZAP integration tests

### Scripts
- `scripts/security/zap-start.sh` - Start OWASP ZAP Docker container
- `scripts/security/zap-stop.sh` - Stop OWASP ZAP container
- `scripts/security/run-security-tests.sh` - Master security test runner

## Quick Start

### 1. Run Unit Security Tests (No ZAP required)

```bash
cd services/backend
npm run test:security
```

This runs all security unit tests:
- SQL injection prevention
- XSS prevention
- CSRF protection
- Authentication bypass prevention

### 2. Run OWASP ZAP Scans

**Start ZAP:**
```bash
npm run security:zap:start
```

**Run ZAP scans (with ZAP already running):**
```bash
# Start your backend first
npm run dev

# In another terminal, run ZAP scans
npm run test:security:zap
```

**Run full security suite (starts/stops ZAP automatically):**
```bash
npm run test:security:full
```

### 3. Stop ZAP

```bash
npm run security:zap:stop
```

## Test Categories

### 1. SQL Injection Prevention

Tests parameterized queries and input validation:
- Query parameter injection
- Filter parameter injection
- Request body injection
- Time-based blind SQL injection
- UNION-based injection
- Error-based injection

**Example payloads tested:**
- `' OR '1'='1`
- `1'; DROP TABLE facilities;--`
- `1' UNION SELECT NULL--`

### 2. XSS Prevention

Tests input sanitization and output encoding:
- Script tag injection
- Event handler injection
- JavaScript protocol handlers
- DOM-based XSS
- Stored XSS
- Encoded payloads

**Example payloads tested:**
- `<script>alert("XSS")</script>`
- `<img src=x onerror=alert("XSS")>`
- `<svg/onload=alert("XSS")>`

### 3. CSRF Protection

Tests cross-site request forgery defenses:
- Origin validation
- Referer checking
- CORS configuration
- Content-Type validation
- SameSite cookie attributes
- Authentication requirements

### 4. Authentication Bypass

Tests authentication and authorization:
- Missing authentication
- Invalid JWT tokens
- Token manipulation
- Algorithm confusion
- Expired tokens
- Role-based access control
- Privilege escalation

## OWASP ZAP Integration

### Configuration

Environment variables (optional):
```bash
export ZAP_TARGET_URL="http://localhost:3001"
export ZAP_API_KEY="changeme"
export ZAP_PORT="8080"
export ZAP_HOST="localhost"
```

### Scan Types

**Passive Scan:**
- Non-intrusive analysis of traffic
- Safe to run continuously
- Detects common misconfigurations

**Spider Scan:**
- Crawls application endpoints
- Discovers hidden paths
- Maps application structure

**Active Scan:**
- Tests for vulnerabilities
- Attempts exploitation
- More aggressive, may affect performance

### Reports

Security scan reports are generated in `./security-reports/`:
- `security-scan-{timestamp}.html` - Human-readable HTML report
- `security-scan-{timestamp}.json` - Machine-readable JSON report
- `security-scan-{timestamp}.md` - Markdown summary

## CI/CD Integration

### GitHub Actions Workflow

Add to `.github/workflows/security-tests.yml`:

```yaml
name: Security Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 2 * * 1' # Weekly on Mondays

jobs:
  security-tests:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      
      zap:
        image: zaproxy/zap-stable
        ports:
          - 8080:8080
        options: >-
          --entrypoint zap.sh
          -- -daemon -host 0.0.0.0 -port 8080 -config api.key=changeme
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        working-directory: services/backend
        run: npm ci
      
      - name: Run database migrations
        working-directory: services/backend
        run: npm run migrate
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test
      
      - name: Start backend
        working-directory: services/backend
        run: npm run dev &
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test
          PORT: 3001
      
      - name: Wait for backend
        run: |
          timeout 30 bash -c 'until curl -f http://localhost:3001/api/v1/monitoring/health; do sleep 1; done'
      
      - name: Run security tests
        working-directory: services/backend
        run: npm run test:security:full
        env:
          ZAP_TARGET_URL: http://localhost:3001
          ZAP_API_KEY: changeme
          ZAP_HOST: localhost
          ZAP_PORT: 8080
      
      - name: Upload security reports
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: security-reports
          path: services/backend/security-reports/
```

## Vulnerability Thresholds

Tests will fail if:
- **High-risk** vulnerabilities are detected (count > 0)
- **Medium-risk** vulnerabilities exceed threshold (count > 5)

Adjust thresholds in `src/test/security/__tests__/zapIntegration.test.ts`.

## Best Practices

### Running Tests

1. **Always test on a separate environment** - Don't run active scans on production
2. **Start with passive scans** - Less intrusive, safe for continuous testing
3. **Schedule full scans regularly** - Weekly or on-demand for major releases
4. **Review reports carefully** - Not all findings are true positives

### Maintaining Tests

1. **Update payloads regularly** - Add new attack vectors as they emerge
2. **Tune false positives** - Exclude known safe patterns in ZAP config
3. **Keep ZAP updated** - Docker image updates include new vulnerability checks
4. **Document exceptions** - If certain alerts are acceptable, document why

## Troubleshooting

### ZAP won't start

```bash
# Check Docker is running
docker ps

# Check port 8080 is available
lsof -i :8080

# View ZAP logs
docker logs owasp-zap-scanner
```

### Tests timeout

```bash
# Increase timeout in test files
# Default: 120000ms for passive, 600000ms for active

# Or reduce scan scope in zap-config.ts
```

### Backend not responding

```bash
# Ensure backend is running
curl http://localhost:3001/api/v1/monitoring/health

# Check logs
npm run dev
```

## Acceptance Criteria Status

- ✅ OWASP ZAP integration - Docker-based ZAP with API client
- ✅ Automated security scans - Passive, spider, and active scans
- ✅ Test SQL injection prevention - Comprehensive payload testing
- ✅ Test XSS prevention - Script injection and encoding tests
- ✅ Test CSRF protection - Origin, referer, and CORS validation
- ✅ Vulnerability report generation - HTML, JSON, and Markdown reports

## Next Steps

1. Run initial security scan: `npm run test:security:full`
2. Review generated reports in `./security-reports/`
3. Fix any high-risk vulnerabilities identified
4. Add security tests to CI/CD pipeline
5. Schedule regular security scans (weekly recommended)

## Resources

- [OWASP ZAP Documentation](https://www.zaproxy.org/docs/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Security Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
