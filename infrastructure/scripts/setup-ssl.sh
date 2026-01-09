#!/bin/bash

###############################################################################
# SSL/TLS Certificate Setup Script - Let's Encrypt with Certbot
# Battery Management System
###############################################################################

set -e

# Configuration
DOMAIN="${1:-yourdomain.com}"
EMAIL="${2:-admin@yourdomain.com}"
STAGING="${3:-0}"  # Use 1 for staging (testing), 0 for production

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SSL_DIR="$PROJECT_ROOT/infrastructure/ssl"
CERTBOT_CONF_DIR="$SSL_DIR/certbot/conf"
CERTBOT_WWW_DIR="$SSL_DIR/certbot/www"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=========================================="
echo "SSL/TLS Certificate Setup"
echo "=========================================="
echo "Domain: $DOMAIN"
echo "Email: $EMAIL"
echo "Mode: $([ "$STAGING" = "1" ] && echo "STAGING" || echo "PRODUCTION")"
echo "=========================================="
echo ""

# Check if domain is placeholder
if [ "$DOMAIN" = "yourdomain.com" ]; then
    echo -e "${RED}Error: Please provide your actual domain name${NC}"
    echo "Usage: $0 <domain> <email> [staging]"
    echo "Example: $0 example.com admin@example.com"
    exit 1
fi

# Check if email is placeholder
if [ "$EMAIL" = "admin@yourdomain.com" ]; then
    echo -e "${RED}Error: Please provide your actual email address${NC}"
    echo "Usage: $0 <domain> <email> [staging]"
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed${NC}"
    echo "Please install Docker first: https://docs.docker.com/get-docker/"
    exit 1
fi

# Create required directories
echo -e "${YELLOW}Creating SSL directories...${NC}"
mkdir -p "$CERTBOT_CONF_DIR"
mkdir -p "$CERTBOT_WWW_DIR"
mkdir -p "$SSL_DIR/backup"

# Check if certificates already exist
if [ -d "$CERTBOT_CONF_DIR/live/$DOMAIN" ]; then
    echo -e "${YELLOW}Warning: Certificates already exist for $DOMAIN${NC}"
    read -p "Do you want to renew/recreate them? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 0
    fi
    
    # Backup existing certificates
    BACKUP_NAME="backup_$(date +%Y%m%d_%H%M%S)"
    echo -e "${YELLOW}Backing up existing certificates to $SSL_DIR/backup/$BACKUP_NAME${NC}"
    cp -r "$CERTBOT_CONF_DIR/live/$DOMAIN" "$SSL_DIR/backup/$BACKUP_NAME"
fi

# Staging flag for certbot
STAGING_FLAG=""
if [ "$STAGING" = "1" ]; then
    STAGING_FLAG="--staging"
    echo -e "${YELLOW}Using Let's Encrypt staging environment (for testing)${NC}"
fi

# Request certificate using certbot standalone mode
echo -e "${GREEN}Requesting SSL certificate from Let's Encrypt...${NC}"
docker run -it --rm \
    -v "$CERTBOT_CONF_DIR:/etc/letsencrypt" \
    -v "$CERTBOT_WWW_DIR:/var/www/certbot" \
    -p 80:80 \
    certbot/certbot certonly \
    --standalone \
    $STAGING_FLAG \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    -d "$DOMAIN" \
    -d "www.$DOMAIN"

# Check if certificate was issued
if [ ! -d "$CERTBOT_CONF_DIR/live/$DOMAIN" ]; then
    echo -e "${RED}Error: Certificate issuance failed${NC}"
    echo "Please check the output above for errors"
    exit 1
fi

echo ""
echo -e "${GREEN}✓ SSL certificate successfully obtained!${NC}"
echo ""
echo "Certificate location: $CERTBOT_CONF_DIR/live/$DOMAIN/"
echo "  - fullchain.pem: Full certificate chain"
echo "  - privkey.pem: Private key"
echo "  - chain.pem: Intermediate certificates"
echo ""

# Check certificate validity
echo -e "${YELLOW}Certificate information:${NC}"
docker run --rm \
    -v "$CERTBOT_CONF_DIR:/etc/letsencrypt" \
    certbot/certbot certificates

echo ""
echo -e "${GREEN}=========================================="
echo "Next Steps:"
echo "==========================================${NC}"
echo ""
echo "1. Update nginx configuration:"
echo "   Edit infrastructure/nginx/site.conf"
echo "   Replace 'yourdomain.com' with '$DOMAIN'"
echo ""
echo "2. Test nginx configuration:"
echo "   docker run --rm -v \$(pwd)/infrastructure/nginx:/etc/nginx:ro nginx:alpine nginx -t"
echo ""
echo "3. Start services with SSL:"
echo "   cd infrastructure && docker-compose up -d"
echo ""
echo "4. Verify HTTPS is working:"
echo "   curl -I https://$DOMAIN"
echo ""
echo "5. Test SSL configuration:"
echo "   https://www.ssllabs.com/ssltest/analyze.html?d=$DOMAIN"
echo ""
echo -e "${YELLOW}Note: Certificates will auto-renew every 12 hours via certbot container${NC}"
echo ""
