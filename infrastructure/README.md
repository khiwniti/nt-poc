# SSL/TLS and Domain Configuration Guide

Complete guide for configuring SSL/TLS certificates and custom domain for the Battery Management System.

## 📋 Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Detailed Setup](#detailed-setup)
- [Certificate Options](#certificate-options)
- [Security Configuration](#security-configuration)
- [Maintenance](#maintenance)
- [Troubleshooting](#troubleshooting)

---

## Overview

This infrastructure provides production-ready SSL/TLS configuration with:

- ✅ **Automated certificate management** with Let's Encrypt
- ✅ **HTTPS for all services** (Frontend, Backend API, MLOps)
- ✅ **HTTP to HTTPS redirect** (automatic)
- ✅ **Auto-renewal** of certificates (every 12 hours)
- ✅ **Security headers** (HSTS, CSP, X-Frame-Options, etc.)
- ✅ **TLS 1.2/1.3** with modern cipher suites
- ✅ **OCSP stapling** for improved performance
- ✅ **Docker-based deployment** for consistency

### Architecture

```
Internet (Port 443)
    ↓
Nginx (SSL Termination)
    ↓
┌─────────────┬─────────────┬─────────────┐
│  Frontend   │   Backend   │   MLOps     │
│  (React)    │  (Node.js)  │  (FastAPI)  │
│  Port 3001  │  Port 3000  │  Port 8001  │
└─────────────┴─────────────┴─────────────┘
```

---

## Prerequisites

### Required

- **Docker** v20.10+ with Docker Compose v2.0+
- **Domain name** pointed to your server's public IP
- **Open ports**: 80 (HTTP), 443 (HTTPS)
- **Email address** for Let's Encrypt notifications

### DNS Configuration

Before proceeding, configure your DNS A records:

```
A    @              → Your-Server-IP
A    www            → Your-Server-IP
A    api            → Your-Server-IP  (optional)
```

Verify DNS propagation:
```bash
dig +short yourdomain.com
# Should return your server IP
```

---

## Quick Start

### Option 1: Automated Setup (Recommended)

```bash
# 1. Clone and navigate to infrastructure
cd infrastructure

# 2. Configure your domain
./scripts/configure-domain.sh battery.example.com

# 3. Set up SSL certificates (requires port 80 free)
./scripts/setup-ssl.sh battery.example.com admin@example.com

# 4. Start all services
docker-compose up -d

# 5. Test SSL configuration
./scripts/test-ssl.sh battery.example.com
```

### Option 2: Manual Setup

See [Detailed Setup](#detailed-setup) section below.

---

## Detailed Setup

### Step 1: Domain Configuration

Update all configuration files with your domain:

```bash
./scripts/configure-domain.sh yourdomain.com api.yourdomain.com
```

This updates:
- `nginx/site.conf` - Nginx server blocks
- `docker-compose.yml` - Environment variables
- `services/backend/.env.example` - Backend configuration

**Manual alternative:**
Search and replace `yourdomain.com` with your actual domain in:
- `infrastructure/nginx/site.conf`
- `infrastructure/docker-compose.yml`

### Step 2: SSL Certificate Setup

#### Option A: Let's Encrypt (Recommended)

**Production certificates:**
```bash
./scripts/setup-ssl.sh yourdomain.com your@email.com
```

**Staging certificates (testing):**
```bash
./scripts/setup-ssl.sh yourdomain.com your@email.com 1
```

#### Option B: Custom Certificates

If you have purchased SSL certificates:

1. Place files in `ssl/custom/`:
   ```bash
   cp your-certificate.crt infrastructure/ssl/custom/certificate.crt
   cp your-private-key.key infrastructure/ssl/custom/private.key
   cp ca-bundle.crt infrastructure/ssl/custom/ca_bundle.crt
   ```

2. Update nginx configuration (see `ssl/README.md`)

3. Set permissions:
   ```bash
   chmod 600 infrastructure/ssl/custom/private.key
   chmod 644 infrastructure/ssl/custom/*.crt
   ```

### Step 3: Environment Configuration

Create environment file:

```bash
cp infrastructure/.env.example infrastructure/.env
```

Edit `.env` with your values:
```bash
DOMAIN=yourdomain.com
API_DOMAIN=api.yourdomain.com
ADMIN_EMAIL=admin@yourdomain.com
# ... (see .env.example for all options)
```

### Step 4: Deploy Services

```bash
cd infrastructure

# Start services
docker-compose up -d

# Check logs
docker-compose logs -f

# Verify all containers are running
docker-compose ps
```

### Step 5: Verification

**Test SSL configuration:**
```bash
./scripts/test-ssl.sh yourdomain.com
```

**Manual verification:**
```bash
# Test HTTP to HTTPS redirect
curl -I http://yourdomain.com
# Should return 301 redirect to https://

# Test HTTPS
curl -I https://yourdomain.com
# Should return 200 OK

# Test backend API
curl https://yourdomain.com/api/health

# Test MLOps service
curl https://yourdomain.com/mlops/health
```

**Online tools:**
- SSL Labs: https://www.ssllabs.com/ssltest/analyze.html?d=yourdomain.com
- Security Headers: https://securityheaders.com/?q=yourdomain.com

Expected SSL Labs Grade: **A or A+**

---

## Certificate Options

### Let's Encrypt (Recommended)

**Advantages:**
- ✅ Free
- ✅ Automated renewal
- ✅ Trusted by all browsers
- ✅ Easy setup

**Limitations:**
- Rate limits: 50 certificates per domain per week
- Requires port 80 accessible during initial setup
- 90-day validity (auto-renews)

### Custom Certificates

**Use when:**
- You need EV (Extended Validation) certificates
- Company policy requires specific CA
- Wildcard certificates already purchased

**See:** `infrastructure/ssl/README.md` for custom certificate setup

### Self-Signed (Development Only)

**⚠️ Never use in production**

```bash
cd infrastructure/ssl/custom
openssl req -x509 -newkey rsa:4096 -nodes \
  -keyout private.key -out certificate.crt -days 365 \
  -subj "/CN=yourdomain.com"
```

---

## Security Configuration

### Security Headers

Already configured in `nginx/site.conf`:

| Header | Value | Purpose |
|--------|-------|---------|
| Strict-Transport-Security | max-age=31536000 | Force HTTPS (HSTS) |
| X-Frame-Options | SAMEORIGIN | Prevent clickjacking |
| X-Content-Type-Options | nosniff | Prevent MIME sniffing |
| X-XSS-Protection | 1; mode=block | XSS protection |
| Referrer-Policy | strict-origin-when-cross-origin | Privacy |
| Content-Security-Policy | (configured) | Script/style control |
| Permissions-Policy | (configured) | Browser API permissions |

### TLS Configuration

**Protocols:** TLSv1.2, TLSv1.3 (TLS 1.0/1.1 disabled)

**Cipher Suites:** Modern, secure ciphers only
- ECDHE-based (perfect forward secrecy)
- AES-128-GCM, AES-256-GCM
- ChaCha20-Poly1305

**Features:**
- OCSP stapling enabled
- Session resumption (10min cache)
- Prefer server cipher order

### Firewall Configuration

Recommended firewall rules:

```bash
# Allow HTTPS
sudo ufw allow 443/tcp

# Allow HTTP (for Let's Encrypt validation and redirect)
sudo ufw allow 80/tcp

# Allow SSH (admin only)
sudo ufw allow from YOUR_IP to any port 22

# Block direct access to application ports
sudo ufw deny 3000/tcp
sudo ufw deny 3001/tcp
sudo ufw deny 8001/tcp

# Enable firewall
sudo ufw enable
```

---

## Maintenance

### Certificate Renewal

**Automatic (Recommended):**

Certificates auto-renew via the certbot container (runs every 12 hours).

Check renewal logs:
```bash
docker logs bms-certbot
```

**Manual Renewal:**

```bash
./scripts/renew-ssl.sh
```

Or via cron:
```bash
# Add to crontab: renew weekly
0 3 * * 0 /path/to/infrastructure/scripts/renew-ssl.sh
```

### Certificate Monitoring

Set up monitoring alerts 30 days before expiration:

```bash
# Check expiration date
docker run --rm \
  -v $(pwd)/infrastructure/ssl/certbot/conf:/etc/letsencrypt \
  certbot/certbot certificates

# Or use external monitoring:
# - UptimeRobot
# - StatusCake  
# - Pingdom
```

### Nginx Reload

After configuration changes:

```bash
# Test config first
docker exec bms-nginx nginx -t

# Reload
docker exec bms-nginx nginx -s reload
```

### Log Management

View nginx logs:
```bash
docker logs bms-nginx
docker logs -f bms-nginx  # follow
```

Rotate logs (add to cron):
```bash
0 0 * * * docker exec bms-nginx logrotate /etc/logrotate.d/nginx
```

---

## Troubleshooting

### Certificate Request Failed

**Error:** "Challenge failed" or "Connection timeout"

**Solutions:**
1. Ensure port 80 is open and accessible:
   ```bash
   sudo ufw allow 80/tcp
   telnet yourserver-ip 80
   ```

2. Check DNS points to your server:
   ```bash
   dig +short yourdomain.com
   ```

3. Verify domain ownership

4. Check rate limits (use staging mode for testing):
   ```bash
   ./scripts/setup-ssl.sh yourdomain.com email@example.com 1
   ```

### Nginx Won't Start

**Check configuration:**
```bash
docker run --rm \
  -v $(pwd)/infrastructure/nginx:/etc/nginx:ro \
  nginx:alpine nginx -t
```

**Common issues:**
- Domain placeholder not replaced: Update `site.conf`
- Certificate path incorrect: Check paths in `site.conf`
- Port already in use: `lsof -i :80` and `lsof -i :443`

### HTTPS Not Working

**Test connectivity:**
```bash
curl -v https://yourdomain.com
```

**Check:**
1. Firewall allows port 443
2. Nginx container is running: `docker ps | grep nginx`
3. Certificate files exist: `ls infrastructure/ssl/certbot/conf/live/`
4. DNS correctly configured

### Mixed Content Warnings

**Issue:** Some resources load over HTTP

**Solution:** Update API base URL in frontend:
```bash
# services/frontend/.env.production
VITE_API_BASE_URL=https://yourdomain.com/api
```

Rebuild frontend:
```bash
cd services/frontend
npm run build
```

### Security Headers Missing

Verify headers:
```bash
curl -I https://yourdomain.com | grep -i "strict-transport\|x-frame\|x-content"
```

If missing, check nginx config and reload.

### Certificate Expired

**Emergency renewal:**
```bash
# Stop nginx (to free port 80)
docker stop bms-nginx

# Force renewal
docker run --rm \
  -v $(pwd)/infrastructure/ssl/certbot/conf:/etc/letsencrypt \
  -v $(pwd)/infrastructure/ssl/certbot/www:/var/www/certbot \
  -p 80:80 \
  certbot/certbot renew --force-renewal

# Restart nginx
docker start bms-nginx
```

---

## Performance Optimization

### HTTP/2 Enabled

Already configured in nginx for better performance:
- Multiplexing
- Server push
- Header compression

### Gzip Compression

Configured for:
- HTML, CSS, JavaScript
- JSON, XML
- Fonts (TTF, WOFF)

### Caching

Static assets cached for 1 year:
- Images
- Fonts
- CSS/JS bundles

### OCSP Stapling

Reduces TLS handshake time by caching OCSP responses.

---

## Advanced Configuration

### Multiple Domains

Add to `nginx/site.conf`:

```nginx
server {
    listen 443 ssl http2;
    server_name another-domain.com;
    
    ssl_certificate /etc/letsencrypt/live/another-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/another-domain.com/privkey.pem;
    
    # ... rest of config
}
```

Issue certificate:
```bash
./scripts/setup-ssl.sh another-domain.com admin@another-domain.com
```

### Load Balancing

For high availability, add upstream blocks:

```nginx
upstream backend {
    server backend-1:3000;
    server backend-2:3000;
    server backend-3:3000;
}
```

### Rate Limiting

Add to nginx config:

```nginx
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

location /api/ {
    limit_req zone=api_limit burst=20;
    # ... proxy config
}
```

---

## Production Checklist

Before going live:

- [ ] Domain DNS configured and propagated
- [ ] SSL certificates obtained (Let's Encrypt or custom)
- [ ] All services start successfully
- [ ] HTTP redirects to HTTPS
- [ ] Security headers verified
- [ ] SSL Labs grade A/A+
- [ ] Backend API accessible via HTTPS
- [ ] MLOps service accessible via HTTPS
- [ ] Frontend loads over HTTPS
- [ ] No mixed content warnings
- [ ] Certificate auto-renewal configured
- [ ] Monitoring alerts set up
- [ ] Firewall rules applied
- [ ] Logs properly configured
- [ ] Backup/restore procedure tested

---

## References

- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Mozilla SSL Configuration Generator](https://ssl-config.mozilla.org/)
- [OWASP Security Headers](https://owasp.org/www-project-secure-headers/)
- [Nginx Documentation](https://nginx.org/en/docs/)

---

## Support

For issues or questions:
1. Check [Troubleshooting](#troubleshooting) section
2. Review logs: `docker-compose logs`
3. Test configuration: `./scripts/test-ssl.sh`
4. Refer to DEPLOYMENT_RUNBOOK.md

---

**Last Updated:** January 9, 2026  
**Version:** 1.0.0
