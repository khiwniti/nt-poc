# T231: SSL/TLS and Domain Configuration - Quick Reference

⚡ **Quick reference for SSL/TLS setup and management**

---

## 🚀 Quick Start (3 commands)

```bash
# 1. Configure domain
./infrastructure/scripts/configure-domain.sh yourdomain.com

# 2. Setup SSL
./infrastructure/scripts/setup-ssl.sh yourdomain.com admin@email.com

# 3. Start services
cd infrastructure && docker-compose up -d
```

---

## 📁 File Structure

```
infrastructure/
├── nginx/
│   ├── nginx.conf          # Main nginx config
│   └── site.conf           # Site/SSL config
├── ssl/
│   ├── certbot/            # Let's Encrypt certs (auto-generated)
│   ├── custom/             # Custom certificates (optional)
│   └── README.md           # Custom cert guide
├── scripts/
│   ├── setup-ssl.sh        # SSL certificate setup
│   ├── renew-ssl.sh        # Manual renewal
│   ├── configure-domain.sh # Domain configuration
│   └── test-ssl.sh         # SSL testing
├── docker-compose.yml      # Container orchestration
├── .env.example            # Environment template
└── README.md               # Complete guide
```

---

## 🔧 Common Commands

### SSL Setup
```bash
# Production certificate
./scripts/setup-ssl.sh yourdomain.com admin@email.com

# Staging certificate (testing)
./scripts/setup-ssl.sh yourdomain.com admin@email.com 1
```

### Certificate Management
```bash
# Renew certificate
./scripts/renew-ssl.sh

# Check certificate info
docker run --rm -v $(pwd)/ssl/certbot/conf:/etc/letsencrypt \
  certbot/certbot certificates

# Check expiration
openssl x509 -in ssl/certbot/conf/live/yourdomain.com/fullchain.pem \
  -noout -enddate
```

### Service Management
```bash
# Start all services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# Restart nginx
docker restart bms-nginx

# Reload nginx config
docker exec bms-nginx nginx -s reload
```

### Testing
```bash
# Run all SSL tests
./scripts/test-ssl.sh yourdomain.com

# Test nginx config
docker run --rm -v $(pwd)/nginx:/etc/nginx:ro nginx:alpine nginx -t

# Test HTTPS
curl -I https://yourdomain.com

# Test redirect
curl -I http://yourdomain.com

# Check headers
curl -I https://yourdomain.com | grep -i strict-transport
```

---

## 🔐 Security Features

### Implemented
✅ TLS 1.2/1.3 only  
✅ Strong cipher suites  
✅ Perfect Forward Secrecy  
✅ OCSP stapling  
✅ HTTP to HTTPS redirect  
✅ HSTS (1 year)  
✅ Security headers (7 types)  
✅ Auto-renewal  

### Headers Configured
- Strict-Transport-Security (HSTS)
- X-Frame-Options (Clickjacking)
- X-Content-Type-Options (MIME sniffing)
- X-XSS-Protection
- Referrer-Policy
- Content-Security-Policy
- Permissions-Policy

---

## 🏗️ Architecture

```
Internet (443) → Nginx (SSL) → Backend (3000)
                             → Frontend (static)
                             → MLOps (8001)
```

### Ports
- **80**: HTTP (redirect to HTTPS)
- **443**: HTTPS (public)
- **3000**: Backend (internal)
- **3001**: Frontend build (internal)
- **8001**: MLOps (internal)

---

## 📝 Configuration Files

### Main Domain
Edit: `infrastructure/nginx/site.conf`
- Replace `yourdomain.com` with actual domain
- Update SSL certificate paths if using custom certs

### API Subdomain (Optional)
Already configured in `site.conf`:
- api.yourdomain.com → Backend (port 3000)

### Environment
Copy: `infrastructure/.env.example` → `.env`
- Set DOMAIN
- Set API_DOMAIN  
- Set ADMIN_EMAIL
- Set database credentials
- Set JWT_SECRET

---

## 🔄 Certificate Renewal

### Automatic (Default)
Certbot container renews every 12 hours automatically.

### Manual
```bash
./infrastructure/scripts/renew-ssl.sh
```

### Cron (Backup)
```bash
# Add to crontab: weekly renewal
0 3 * * 0 /path/to/infrastructure/scripts/renew-ssl.sh
```

### Monitoring
Set calendar reminder 30 days before expiration:
```bash
# Check expiration
docker run --rm -v $(pwd)/ssl/certbot/conf:/etc/letsencrypt \
  certbot/certbot certificates
```

---

## 🐛 Troubleshooting

### Certificate Request Failed
```bash
# Check DNS
dig +short yourdomain.com

# Check port 80
sudo lsof -i :80

# Use staging mode
./scripts/setup-ssl.sh yourdomain.com email@test.com 1
```

### Nginx Won't Start
```bash
# Test config
docker run --rm -v $(pwd)/nginx:/etc/nginx:ro nginx:alpine nginx -t

# Check logs
docker logs bms-nginx

# Check port conflicts
sudo lsof -i :443
```

### HTTPS Not Working
```bash
# Check nginx running
docker ps | grep nginx

# Check certificate exists
ls ssl/certbot/conf/live/yourdomain.com/

# Test curl
curl -v https://yourdomain.com
```

### Mixed Content
Update frontend API URL:
```bash
# services/frontend/.env.production
VITE_API_BASE_URL=https://yourdomain.com/api
```

---

## ✅ Pre-Production Checklist

Before deploying to production:

- [ ] DNS A record points to server
- [ ] Port 80 and 443 open in firewall
- [ ] Domain verified: `dig +short yourdomain.com`
- [ ] SSL certificate obtained
- [ ] Nginx config tested: `nginx -t`
- [ ] All services start: `docker-compose up -d`
- [ ] HTTP redirects to HTTPS
- [ ] HTTPS loads successfully
- [ ] API accessible: `/api/health`
- [ ] MLOps accessible: `/mlops/health`
- [ ] Security headers present
- [ ] SSL Labs grade A/A+
- [ ] Certificate auto-renewal working
- [ ] Monitoring configured

---

## 📊 Testing & Validation

### Quick Test
```bash
./infrastructure/scripts/test-ssl.sh yourdomain.com
```

### Online Tools
- **SSL Labs**: https://www.ssllabs.com/ssltest/
  - Expected: A or A+
- **Security Headers**: https://securityheaders.com/
  - Expected: A or A+
- **Certificate**: https://www.sslshopper.com/ssl-checker.html

### Manual Tests
```bash
# Frontend
curl -I https://yourdomain.com

# Backend API
curl https://yourdomain.com/api/health

# MLOps
curl https://yourdomain.com/mlops/health

# Redirect
curl -I http://yourdomain.com

# Headers
curl -I https://yourdomain.com | grep -i strict
```

---

## 📚 Documentation

- **Full Guide**: `infrastructure/README.md`
- **Custom Certs**: `infrastructure/ssl/README.md`
- **Deployment**: `DEPLOYMENT_RUNBOOK.md`
- **Acceptance**: `T231_ACCEPTANCE_CHECKLIST.md`

---

## 🎯 Key Features

| Feature | Status | Location |
|---------|--------|----------|
| Let's Encrypt Setup | ✅ | scripts/setup-ssl.sh |
| Auto-renewal | ✅ | docker-compose.yml (certbot) |
| HTTP→HTTPS Redirect | ✅ | nginx/site.conf |
| Security Headers | ✅ | nginx/site.conf |
| TLS 1.2/1.3 | ✅ | nginx/nginx.conf |
| OCSP Stapling | ✅ | nginx/nginx.conf |
| HTTP/2 | ✅ | nginx/site.conf |
| Gzip Compression | ✅ | nginx/nginx.conf |
| Custom Certs | ✅ | ssl/README.md |
| Testing Script | ✅ | scripts/test-ssl.sh |

---

## 🔗 Service Endpoints

### Production URLs
- **Frontend**: https://yourdomain.com
- **Backend API**: https://yourdomain.com/api
- **MLOps**: https://yourdomain.com/mlops
- **Health**: https://yourdomain.com/health

### Alternative (API Subdomain)
- **API**: https://api.yourdomain.com
  - Already configured in nginx/site.conf

---

## ⚡ Performance

### Optimizations Applied
- HTTP/2 (multiplexing)
- Gzip compression
- Static asset caching (1 year)
- OCSP stapling (faster handshake)
- Session resumption (10 min)
- Connection keepalive

### Expected Metrics
- TLS Handshake: <100ms
- First Byte Time: <200ms
- Page Load: <2s

---

## 🆘 Support Resources

1. **Troubleshooting**: See `infrastructure/README.md` → Troubleshooting
2. **Logs**: `docker-compose logs -f`
3. **Test Script**: `./scripts/test-ssl.sh`
4. **Nginx Docs**: https://nginx.org/en/docs/
5. **Let's Encrypt**: https://letsencrypt.org/docs/

---

**Last Updated**: January 9, 2026  
**Version**: 1.0.0  
**Status**: Production Ready ✅
