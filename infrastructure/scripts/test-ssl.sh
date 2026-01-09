#!/bin/bash

###############################################################################
# Test SSL/TLS Configuration
# Validates SSL certificate, nginx config, and HTTPS functionality
###############################################################################

set -e

DOMAIN="${1:-}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "=========================================="
echo "SSL/TLS Configuration Test"
echo "=========================================="
echo ""

if [ -z "$DOMAIN" ]; then
    echo -e "${RED}Error: Domain name is required${NC}"
    echo "Usage: $0 <domain>"
    echo "Example: $0 battery.example.com"
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SSL_DIR="$PROJECT_ROOT/infrastructure/ssl"
CERTBOT_CONF_DIR="$SSL_DIR/certbot/conf"

echo -e "${BLUE}Testing domain: $DOMAIN${NC}"
echo ""

# Test 1: Check if certificate exists
echo -e "${YELLOW}[1/7] Checking certificate existence...${NC}"
if [ -d "$CERTBOT_CONF_DIR/live/$DOMAIN" ]; then
    echo -e "${GREEN}✓ Certificate directory exists${NC}"
else
    echo -e "${RED}✗ Certificate not found for $DOMAIN${NC}"
    echo "Run: ./infrastructure/scripts/setup-ssl.sh $DOMAIN your@email.com"
    exit 1
fi

# Test 2: Validate certificate files
echo -e "${YELLOW}[2/7] Validating certificate files...${NC}"
REQUIRED_FILES=("fullchain.pem" "privkey.pem" "chain.pem" "cert.pem")
for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$CERTBOT_CONF_DIR/live/$DOMAIN/$file" ]; then
        echo -e "${GREEN}✓ $file exists${NC}"
    else
        echo -e "${RED}✗ $file missing${NC}"
        exit 1
    fi
done

# Test 3: Check certificate expiration
echo -e "${YELLOW}[3/7] Checking certificate expiration...${NC}"
docker run --rm \
    -v "$CERTBOT_CONF_DIR:/etc/letsencrypt" \
    certbot/certbot certificates | grep -A 10 "$DOMAIN"

# Test 4: Test nginx configuration syntax
echo -e "${YELLOW}[4/7] Testing nginx configuration...${NC}"
if docker run --rm \
    -v "$PROJECT_ROOT/infrastructure/nginx:/etc/nginx:ro" \
    nginx:alpine nginx -t 2>&1; then
    echo -e "${GREEN}✓ Nginx configuration is valid${NC}"
else
    echo -e "${RED}✗ Nginx configuration has errors${NC}"
    exit 1
fi

# Test 5: Check if nginx is running
echo -e "${YELLOW}[5/7] Checking nginx service...${NC}"
if docker ps | grep -q "bms-nginx"; then
    echo -e "${GREEN}✓ Nginx container is running${NC}"
else
    echo -e "${YELLOW}⚠ Nginx container is not running${NC}"
    echo "Start with: cd infrastructure && docker-compose up -d nginx"
fi

# Test 6: Test HTTP to HTTPS redirect
echo -e "${YELLOW}[6/7] Testing HTTP to HTTPS redirect...${NC}"
if HTTP_RESPONSE=$(curl -sI -m 5 "http://$DOMAIN" 2>&1); then
    if echo "$HTTP_RESPONSE" | grep -q "301\|302"; then
        LOCATION=$(echo "$HTTP_RESPONSE" | grep -i "location:" | cut -d' ' -f2)
        if [[ "$LOCATION" == https://* ]]; then
            echo -e "${GREEN}✓ HTTP redirects to HTTPS${NC}"
        else
            echo -e "${RED}✗ HTTP does not redirect to HTTPS${NC}"
        fi
    else
        echo -e "${YELLOW}⚠ Could not verify redirect (server may not be accessible)${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Could not connect to HTTP (server may not be accessible)${NC}"
fi

# Test 7: Test HTTPS connection
echo -e "${YELLOW}[7/7] Testing HTTPS connection...${NC}"
if HTTPS_RESPONSE=$(curl -sI -m 5 "https://$DOMAIN" 2>&1); then
    if echo "$HTTPS_RESPONSE" | grep -q "200\|301\|302"; then
        echo -e "${GREEN}✓ HTTPS connection successful${NC}"
        
        # Check security headers
        echo ""
        echo -e "${BLUE}Security Headers:${NC}"
        echo "$HTTPS_RESPONSE" | grep -i "strict-transport-security" && echo -e "${GREEN}✓ HSTS enabled${NC}" || echo -e "${YELLOW}⚠ HSTS not found${NC}"
        echo "$HTTPS_RESPONSE" | grep -i "x-content-type-options" && echo -e "${GREEN}✓ X-Content-Type-Options set${NC}" || echo -e "${YELLOW}⚠ X-Content-Type-Options not found${NC}"
        echo "$HTTPS_RESPONSE" | grep -i "x-frame-options" && echo -e "${GREEN}✓ X-Frame-Options set${NC}" || echo -e "${YELLOW}⚠ X-Frame-Options not found${NC}"
    else
        echo -e "${YELLOW}⚠ Unexpected HTTP status${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Could not connect to HTTPS (server may not be accessible)${NC}"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}SSL/TLS Configuration Test Complete${NC}"
echo "=========================================="
echo ""
echo "For comprehensive SSL testing, visit:"
echo "  https://www.ssllabs.com/ssltest/analyze.html?d=$DOMAIN"
echo ""
echo "For security header testing, visit:"
echo "  https://securityheaders.com/?q=$DOMAIN"
echo ""
