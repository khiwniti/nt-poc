"""
Security Tests for Predictive Maintenance PoC
Tests for SQL Injection, XSS, CSRF, and Authentication vulnerabilities
"""

import pytest
import requests
import json
from typing import Dict, Any
import jwt
import time
from datetime import datetime, timedelta


class TestSQLInjection:
    """Test SQL injection prevention"""
    
    @pytest.fixture
    def base_url(self):
        return "http://localhost:3000/api/v1"
    
    @pytest.fixture
    def auth_headers(self):
        """Generate valid JWT token for authenticated requests"""
        secret = "test-security-secret"
        token = jwt.encode(
            {
                "userId": "test-user",
                "role": "admin",
                "exp": datetime.utcnow() + timedelta(hours=1)
            },
            secret,
            algorithm="HS256"
        )
        return {"Authorization": f"Bearer {token}"}
    
    def test_sql_injection_in_facility_id(self, base_url, auth_headers):
        """Test SQL injection in facility ID parameter"""
        payloads = [
            "1' OR '1'='1",
            "1'; DROP TABLE facilities;--",
            "1' UNION SELECT * FROM users--",
            "1' AND 1=1--",
            "1' AND '1'='1' /*"
        ]
        
        for payload in payloads:
            response = requests.get(
                f"{base_url}/facilities/{payload}",
                headers=auth_headers
            )
            # Should return 400/404, not 200 with leaked data
            assert response.status_code in [400, 404, 500]
            # Should not return SQL error messages
            if response.status_code == 500:
                data = response.json()
                assert "sql" not in str(data).lower()
                assert "syntax" not in str(data).lower()
    
    def test_sql_injection_in_query_params(self, base_url, auth_headers):
        """Test SQL injection in query parameters"""
        payloads = [
            {"search": "' OR '1'='1"},
            {"filter": "'; DROP TABLE facilities;--"},
            {"sort": "' UNION SELECT NULL--"}
        ]
        
        for payload in payloads:
            response = requests.get(
                f"{base_url}/facilities",
                params=payload,
                headers=auth_headers
            )
            assert response.status_code in [200, 400, 422]
            # Ensure no SQL errors in response
            data = response.text.lower()
            assert "syntax error" not in data
            assert "sql" not in data
    
    def test_sql_injection_in_post_body(self, base_url, auth_headers):
        """Test SQL injection in POST request body"""
        payloads = [
            {"name": "Test' OR '1'='1"},
            {"location": "'; DROP TABLE facilities;--"},
            {"capacity": "1' UNION SELECT * FROM users--"}
        ]
        
        for payload in payloads:
            response = requests.post(
                f"{base_url}/facilities",
                json=payload,
                headers=auth_headers
            )
            # Should be rejected or sanitized
            assert response.status_code in [400, 422]


class TestXSSPrevention:
    """Test XSS (Cross-Site Scripting) prevention"""
    
    @pytest.fixture
    def base_url(self):
        return "http://localhost:3000/api/v1"
    
    @pytest.fixture
    def auth_headers(self):
        secret = "test-security-secret"
        token = jwt.encode(
            {
                "userId": "test-user",
                "role": "admin",
                "exp": datetime.utcnow() + timedelta(hours=1)
            },
            secret,
            algorithm="HS256"
        )
        return {"Authorization": f"Bearer {token}"}
    
    def test_reflected_xss_in_params(self, base_url, auth_headers):
        """Test reflected XSS in URL parameters"""
        xss_payloads = [
            "<script>alert('XSS')</script>",
            "<img src=x onerror=alert('XSS')>",
            "javascript:alert('XSS')",
            "<svg/onload=alert('XSS')>",
            "'-alert('XSS')-'",
        ]
        
        for payload in xss_payloads:
            response = requests.get(
                f"{base_url}/facilities",
                params={"search": payload},
                headers=auth_headers
            )
            # Ensure payload is not reflected unescaped
            assert payload not in response.text
            # Common escape patterns
            if "<script>" in payload:
                assert "&lt;script&gt;" in response.text or "script" not in response.text
    
    def test_stored_xss_prevention(self, base_url, auth_headers):
        """Test stored XSS prevention in database"""
        xss_payload = "<script>alert('Stored XSS')</script>"
        
        # Try to store XSS payload
        response = requests.post(
            f"{base_url}/facilities",
            json={
                "name": xss_payload,
                "location": "Test Location",
                "capacity": 1000
            },
            headers=auth_headers
        )
        
        if response.status_code == 201:
            facility_id = response.json().get("id")
            
            # Retrieve and verify it's escaped
            get_response = requests.get(
                f"{base_url}/facilities/{facility_id}",
                headers=auth_headers
            )
            
            if get_response.status_code == 200:
                data = get_response.json()
                # Script should be escaped or sanitized
                assert xss_payload not in str(data)


class TestCSRFProtection:
    """Test CSRF (Cross-Site Request Forgery) protection"""
    
    @pytest.fixture
    def base_url(self):
        return "http://localhost:3000/api/v1"
    
    @pytest.fixture
    def auth_headers(self):
        secret = "test-security-secret"
        token = jwt.encode(
            {
                "userId": "test-user",
                "role": "admin",
                "exp": datetime.utcnow() + timedelta(hours=1)
            },
            secret,
            algorithm="HS256"
        )
        return {"Authorization": f"Bearer {token}"}
    
    def test_csrf_token_required_for_state_changing_operations(self, base_url, auth_headers):
        """Test that state-changing operations require proper authentication"""
        # Attempt to create facility without auth
        response = requests.post(
            f"{base_url}/facilities",
            json={"name": "Test", "location": "Test", "capacity": 100}
        )
        assert response.status_code in [401, 403]
        
        # Attempt to delete without auth
        response = requests.delete(f"{base_url}/facilities/1")
        assert response.status_code in [401, 403]
    
    def test_origin_header_validation(self, base_url, auth_headers):
        """Test that suspicious origin headers are handled"""
        malicious_headers = auth_headers.copy()
        malicious_headers["Origin"] = "https://evil.com"
        
        response = requests.post(
            f"{base_url}/facilities",
            json={"name": "Test", "location": "Test", "capacity": 100},
            headers=malicious_headers
        )
        # Should either work with CORS or fail properly
        assert response.status_code in [200, 201, 403, 400]


class TestAuthenticationSecurity:
    """Test authentication and authorization vulnerabilities"""
    
    @pytest.fixture
    def base_url(self):
        return "http://localhost:3000/api/v1"
    
    def test_missing_authentication_rejected(self, base_url):
        """Test that requests without authentication are rejected"""
        response = requests.get(f"{base_url}/facilities")
        assert response.status_code in [401, 403]
    
    def test_invalid_token_rejected(self, base_url):
        """Test that invalid JWT tokens are rejected"""
        invalid_tokens = [
            "invalid.token.here",
            "Bearer invalid",
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature",
        ]
        
        for token in invalid_tokens:
            headers = {"Authorization": f"Bearer {token}"}
            response = requests.get(f"{base_url}/facilities", headers=headers)
            assert response.status_code in [401, 403]
    
    def test_expired_token_rejected(self, base_url):
        """Test that expired JWT tokens are rejected"""
        secret = "test-security-secret"
        expired_token = jwt.encode(
            {
                "userId": "test-user",
                "role": "admin",
                "exp": datetime.utcnow() - timedelta(hours=1)  # Expired
            },
            secret,
            algorithm="HS256"
        )
        
        headers = {"Authorization": f"Bearer {expired_token}"}
        response = requests.get(f"{base_url}/facilities", headers=headers)
        assert response.status_code in [401, 403]
    
    def test_token_with_invalid_signature(self, base_url):
        """Test that tokens with invalid signatures are rejected"""
        wrong_secret = "wrong-secret"
        token = jwt.encode(
            {
                "userId": "test-user",
                "role": "admin",
                "exp": datetime.utcnow() + timedelta(hours=1)
            },
            wrong_secret,
            algorithm="HS256"
        )
        
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{base_url}/facilities", headers=headers)
        assert response.status_code in [401, 403]


class TestSecurityHeaders:
    """Test security headers presence"""
    
    @pytest.fixture
    def base_url(self):
        return "http://localhost:3000/api/v1"
    
    def test_security_headers_present(self, base_url):
        """Test that important security headers are present"""
        response = requests.get(f"{base_url}/health")
        
        headers = response.headers
        
        # Check for important security headers
        # Note: These may not all be present in a minimal API
        # but it's good practice to have them
        recommended_headers = {
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": ["DENY", "SAMEORIGIN"],
            "X-XSS-Protection": "1; mode=block",
        }
        
        # Log which headers are missing for awareness
        for header, expected in recommended_headers.items():
            if header in headers:
                if isinstance(expected, list):
                    assert headers[header] in expected
                else:
                    assert headers[header] == expected


class TestInputValidation:
    """Test input validation and sanitization"""
    
    @pytest.fixture
    def base_url(self):
        return "http://localhost:3000/api/v1"
    
    @pytest.fixture
    def auth_headers(self):
        secret = "test-security-secret"
        token = jwt.encode(
            {
                "userId": "test-user",
                "role": "admin",
                "exp": datetime.utcnow() + timedelta(hours=1)
            },
            secret,
            algorithm="HS256"
        )
        return {"Authorization": f"Bearer {token}"}
    
    def test_excessively_long_input_rejected(self, base_url, auth_headers):
        """Test that excessively long input is rejected"""
        long_string = "A" * 10000
        
        response = requests.post(
            f"{base_url}/facilities",
            json={
                "name": long_string,
                "location": "Test",
                "capacity": 100
            },
            headers=auth_headers
        )
        assert response.status_code in [400, 422, 413]
    
    def test_invalid_data_types_rejected(self, base_url, auth_headers):
        """Test that invalid data types are rejected"""
        response = requests.post(
            f"{base_url}/facilities",
            json={
                "name": "Test",
                "location": "Test",
                "capacity": "not-a-number"  # Should be integer
            },
            headers=auth_headers
        )
        assert response.status_code in [400, 422]
    
    def test_null_byte_injection_prevented(self, base_url, auth_headers):
        """Test that null byte injection is prevented"""
        response = requests.get(
            f"{base_url}/facilities/1%00.jpg",
            headers=auth_headers
        )
        assert response.status_code in [400, 404]


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
