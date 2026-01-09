#!/bin/bash

###############################################################################
# Configure Domain Script
# Replaces placeholder domain with actual domain in all configuration files
###############################################################################

set -e

DOMAIN="${1:-}"
API_DOMAIN="${2:-api.$DOMAIN}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=========================================="
echo "Domain Configuration"
echo "=========================================="
echo ""

if [ -z "$DOMAIN" ]; then
    echo -e "${RED}Error: Domain name is required${NC}"
    echo "Usage: $0 <domain> [api-domain]"
    echo "Example: $0 battery.example.com api.example.com"
    exit 1
fi

echo "Main Domain: $DOMAIN"
echo "API Domain: $API_DOMAIN"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

read -p "Continue with domain configuration? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
fi

echo ""
echo -e "${YELLOW}Updating configuration files...${NC}"

# Nginx site configuration
if [ -f "$PROJECT_ROOT/infrastructure/nginx/site.conf" ]; then
    echo "  - Updating nginx/site.conf"
    sed -i.bak "s/yourdomain\.com/$DOMAIN/g" "$PROJECT_ROOT/infrastructure/nginx/site.conf"
    sed -i.bak "s/api\.yourdomain\.com/$API_DOMAIN/g" "$PROJECT_ROOT/infrastructure/nginx/site.conf"
fi

# Docker Compose
if [ -f "$PROJECT_ROOT/infrastructure/docker-compose.yml" ]; then
    echo "  - Updating docker-compose.yml"
    sed -i.bak "s/yourdomain\.com/$DOMAIN/g" "$PROJECT_ROOT/infrastructure/docker-compose.yml"
fi

# Backend environment example
if [ -f "$PROJECT_ROOT/services/backend/.env.example" ]; then
    echo "  - Updating backend/.env.example"
    sed -i.bak "s/yourdomain\.com/$DOMAIN/g" "$PROJECT_ROOT/services/backend/.env.example"
fi

# Deployment runbook
if [ -f "$PROJECT_ROOT/DEPLOYMENT_RUNBOOK.md" ]; then
    echo "  - Updating DEPLOYMENT_RUNBOOK.md"
    sed -i.bak "s/yourdomain\.com/$DOMAIN/g" "$PROJECT_ROOT/DEPLOYMENT_RUNBOOK.md"
fi

echo ""
echo -e "${GREEN}✓ Domain configuration complete${NC}"
echo ""
echo -e "${YELLOW}Note: Backup files (.bak) have been created${NC}"
echo ""
echo "Next steps:"
echo "1. Review the changes in the configuration files"
echo "2. Run SSL setup: ./infrastructure/scripts/setup-ssl.sh $DOMAIN your@email.com"
echo "3. Update DNS records to point to your server IP"
echo ""
