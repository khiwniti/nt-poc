# Security Testing

This directory contains security testing infrastructure using OWASP ZAP for the Predictive Maintenance PoC.

## Overview

Security tests cover:
- **SQL Injection**: Tests for SQL injection vulnerabilities in API endpoints
- **XSS (Cross-Site Scripting)**: Tests for reflected and stored XSS
- **CSRF (Cross-Site Request Forgery)**: Tests for CSRF protection
- **Authentication**: Tests for authentication bypass and token vulnerabilities
- **Input Validation**: Tests for malformed input handling
- **Security Headers**: Validation of security HTTP headers

## Components

### OWASP ZAP Integration
- **docker-compose.zap.yml**: Docker Compose configuration for ZAP scanner
- **zap-config.yaml**: ZAP automation framework configuration
- **scripts/run-zap-scan.sh**: Full automated security scan
- **scripts/quick-scan.sh**: Quick CI/CD security scan
- **scripts/analyze-zap-results.sh**: Parse and summarize ZAP results

### Python Security Tests
- **test_security_vulnerabilities.py**: Pytest-based security tests
- Tests run against live API to validate security controls

## Running Tests

### Full Security Scan (Local)

```bash
cd tests/security
bash scripts/run-zap-scan.sh
```

This will:
1. Start backend and database in Docker
2. Start OWASP ZAP scanner
3. Run baseline scan
4. Run full active scan with SQL injection, XSS, CSRF tests
5. Run API-specific security tests
6. Generate HTML, JSON, and XML reports
7. Generate summary report

Reports are saved to `tests/security/reports/`

### Quick Security Scan (CI/CD)

```bash
cd tests/security
bash scripts/quick-scan.sh
```

Runs a lightweight baseline scan suitable for CI/CD pipelines.

### Python Security Tests

```bash
# Install dependencies
pip install pytest requests pyjwt

# Run security tests
cd tests/security
pytest test_security_vulnerabilities.py -v

# Run specific test class
pytest test_security_vulnerabilities.py::TestSQLInjection -v
```

**Prerequisites**: Backend must be running on localhost:3000

```bash
cd services/backend
npm install
npm run dev
```

## Test Coverage

### SQL Injection Tests
- ✅ SQL injection in URL path parameters
- ✅ SQL injection in query parameters
- ✅ SQL injection in POST/PUT request bodies
- ✅ Validation that SQL errors are not exposed
- ✅ PostgreSQL-specific injection patterns

### XSS Tests
- ✅ Reflected XSS in URL parameters
- ✅ Stored XSS in database fields
- ✅ XSS in various payload formats (script tags, event handlers, etc.)
- ✅ Output encoding validation

### CSRF Tests
- ✅ Unauthenticated state-changing requests blocked
- ✅ Origin header validation
- ✅ Token-based authentication required

### Authentication Tests
- ✅ Missing authentication rejected
- ✅ Invalid JWT tokens rejected
- ✅ Expired JWT tokens rejected
- ✅ Tokens with invalid signatures rejected
- ✅ Bearer token format validation

### Input Validation Tests
- ✅ Excessively long input rejected
- ✅ Invalid data types rejected
- ✅ Null byte injection prevented
- ✅ Special characters handled safely

### Security Headers Tests
- ✅ X-Content-Type-Options: nosniff
- ✅ X-Frame-Options
- ✅ X-XSS-Protection
- ⚠️ Content-Security-Policy (recommended)

## Report Formats

### HTML Reports
Interactive HTML reports with detailed vulnerability information:
- `baseline-report-{timestamp}.html` - Baseline scan
- `api-report-{timestamp}.html` - API security scan

### JSON Reports
Machine-readable JSON for automation:
- `baseline-report-{timestamp}.json`
- `api-report-{timestamp}.json`

### XML Reports
XML format for integration with other tools:
- `baseline-report-{timestamp}.xml`

### Summary Reports
Human-readable summary:
- `summary-{timestamp}.txt`

Example summary:
```
OWASP ZAP Security Scan Summary
================================
Scan Date: 2026-01-11
Timestamp: 20260111_083700

Processing: baseline-report-20260111_083700.json
  High Risk: 0
  Medium Risk: 2
  Low Risk: 5
  Informational: 12

Overall Assessment
==================
Total High Risk Issues: 0
Total Medium Risk Issues: 2
Total Low Risk Issues: 5

✅ PASSED: No critical security issues found
```

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: Security Scan

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 2 * * 0'  # Weekly on Sunday

jobs:
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Run Security Tests
        run: |
          cd tests/security
          bash scripts/quick-scan.sh
      
      - name: Upload Reports
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: security-reports
          path: tests/security/reports/
```

## Security Best Practices Validated

1. **Parameterized Queries**: All database queries use parameterized statements
2. **Input Validation**: All user input is validated and sanitized
3. **Output Encoding**: All output is properly encoded to prevent XSS
4. **Authentication**: JWT-based authentication required for all endpoints
5. **Authorization**: Role-based access control enforced
6. **HTTPS**: Production uses HTTPS (validated in deployment)
7. **Security Headers**: Appropriate security headers set
8. **Error Handling**: Detailed error messages not exposed to clients

## Vulnerability Severity Levels

- **High**: Critical vulnerabilities requiring immediate attention
- **Medium**: Significant vulnerabilities to be addressed soon
- **Low**: Minor issues to be fixed when convenient
- **Informational**: Best practice recommendations

## Continuous Security

### Daily
- ✅ Automated security tests in CI/CD pipeline
- ✅ Input validation tests

### Weekly
- ✅ Full OWASP ZAP scan
- ✅ Dependency vulnerability scan

### Monthly
- ⚠️ Manual penetration testing review
- ⚠️ Security audit of new features

## Troubleshooting

### ZAP container fails to start
```bash
# Check Docker is running
docker ps

# Check port 8080 is not in use
lsof -i :8080

# View ZAP logs
docker logs owasp-zap
```

### Backend not accessible from ZAP
```bash
# Verify backend is running
docker-compose -f docker-compose.zap.yml ps

# Check backend health
curl http://localhost:3000/api/v1/health

# Check network connectivity
docker network inspect security-test_security-test
```

### Python tests fail
```bash
# Verify backend is running
curl http://localhost:3000/api/v1/health

# Check JWT_SECRET matches
echo $JWT_SECRET

# Install missing dependencies
pip install -r requirements.txt
```

## References

- [OWASP ZAP Documentation](https://www.zaproxy.org/docs/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [JWT Security Best Practices](https://tools.ietf.org/html/rfc8725)
- [SQL Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)
- [XSS Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
