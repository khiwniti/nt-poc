#!/bin/bash

###############################################################################
# Renew SSL/TLS Certificates Script
# Battery Management System
###############################################################################

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SSL_DIR="$PROJECT_ROOT/infrastructure/ssl"
CERTBOT_CONF_DIR="$SSL_DIR/certbot/conf"
CERTBOT_WWW_DIR="$SSL_DIR/certbot/www"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=========================================="
echo "SSL/TLS Certificate Renewal"
echo "=========================================="
echo ""

# Check if Docker is running
if ! docker ps &> /dev/null; then
    echo -e "${RED}Error: Docker is not running${NC}"
    exit 1
fi

echo -e "${YELLOW}Renewing SSL certificates...${NC}"

# Renew certificates
docker run --rm \
    -v "$CERTBOT_CONF_DIR:/etc/letsencrypt" \
    -v "$CERTBOT_WWW_DIR:/var/www/certbot" \
    certbot/certbot renew

echo ""
echo -e "${GREEN}Certificate renewal complete${NC}"
echo ""

# Reload nginx to use new certificates
if docker ps | grep -q "bms-nginx"; then
    echo -e "${YELLOW}Reloading nginx...${NC}"
    docker exec bms-nginx nginx -s reload
    echo -e "${GREEN}✓ Nginx reloaded${NC}"
fi

echo ""
echo -e "${GREEN}Certificate renewal completed successfully!${NC}"
echo ""
