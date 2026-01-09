# SSL/TLS Configuration - Custom Certificates Guide

This guide explains how to use custom SSL certificates (not Let's Encrypt).

## Directory Structure

```
infrastructure/ssl/
├── custom/
│   ├── certificate.crt      # Your SSL certificate
│   ├── private.key          # Your private key
│   ├── ca_bundle.crt        # Certificate Authority bundle (optional)
│   └── README.md            # This file
└── certbot/                 # Let's Encrypt certificates (alternative)
```

## Using Custom Certificates

### 1. Obtain Your Certificates

Purchase or generate SSL certificates from a Certificate Authority (CA):
- Namecheap
- DigiCert
- Sectigo
- GoDaddy
- CloudFlare

### 2. Place Certificate Files

Copy your certificate files to `infrastructure/ssl/custom/`:

```bash
cp /path/to/your/certificate.crt infrastructure/ssl/custom/
cp /path/to/your/private.key infrastructure/ssl/custom/
cp /path/to/your/ca_bundle.crt infrastructure/ssl/custom/
```

### 3. Set Correct Permissions

```bash
chmod 644 infrastructure/ssl/custom/certificate.crt
chmod 600 infrastructure/ssl/custom/private.key
chmod 644 infrastructure/ssl/custom/ca_bundle.crt
```

### 4. Update Nginx Configuration

Edit `infrastructure/nginx/site.conf` and update the SSL certificate paths:

```nginx
# Replace these lines:
ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
ssl_trusted_certificate /etc/letsencrypt/live/yourdomain.com/chain.pem;

# With:
ssl_certificate /etc/nginx/ssl/certificate.crt;
ssl_certificate_key /etc/nginx/ssl/private.key;
ssl_trusted_certificate /etc/nginx/ssl/ca_bundle.crt;
```

### 5. Update Docker Compose

Edit `infrastructure/docker-compose.yml` to mount custom certificates:

```yaml
nginx:
  volumes:
    # Add this line:
    - ./ssl/custom:/etc/nginx/ssl:ro
    # Remove or comment out certbot volumes:
    # - ./ssl/certbot/conf:/etc/letsencrypt:ro
```

### 6. Remove Certbot Service

Comment out or remove the certbot service in `docker-compose.yml` since you're not using Let's Encrypt.

### 7. Test Configuration

```bash
# Test nginx config
docker run --rm -v $(pwd)/infrastructure/nginx:/etc/nginx:ro \
  -v $(pwd)/infrastructure/ssl/custom:/etc/nginx/ssl:ro \
  nginx:alpine nginx -t

# Start services
cd infrastructure
docker-compose up -d
```

## Self-Signed Certificates (Development Only)

For development/testing, you can generate self-signed certificates:

```bash
cd infrastructure/ssl/custom

# Generate private key
openssl genrsa -out private.key 2048

# Generate certificate (valid for 365 days)
openssl req -new -x509 -key private.key -out certificate.crt -days 365 \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=yourdomain.com"

# Generate CA bundle (copy of certificate for self-signed)
cp certificate.crt ca_bundle.crt
```

**⚠️ Warning**: Self-signed certificates will show security warnings in browsers and should NEVER be used in production.

## Certificate Renewal

Custom certificates don't auto-renew. Set a calendar reminder to renew before expiration:

1. Check expiration date:
   ```bash
   openssl x509 -in infrastructure/ssl/custom/certificate.crt -noout -enddate
   ```

2. Renew with your CA provider before expiration

3. Replace certificate files and restart nginx:
   ```bash
   docker exec bms-nginx nginx -s reload
   ```

## Wildcard Certificates

If using a wildcard certificate (*.yourdomain.com):

1. Ensure your certificate CN or SAN includes:
   - `*.yourdomain.com`
   - `yourdomain.com` (optional, for root domain)

2. No changes needed in nginx config - wildcard covers all subdomains

## Troubleshooting

### Error: Certificate Verification Failed

Check certificate chain:
```bash
openssl verify -CAfile infrastructure/ssl/custom/ca_bundle.crt \
  infrastructure/ssl/custom/certificate.crt
```

### Error: Private Key Doesn't Match Certificate

Verify they match:
```bash
# Compare modulus (should be identical)
openssl x509 -noout -modulus -in infrastructure/ssl/custom/certificate.crt | openssl md5
openssl rsa -noout -modulus -in infrastructure/ssl/custom/private.key | openssl md5
```

### Browser Shows Certificate Warning

- Verify domain matches certificate CN/SAN
- Check certificate is not expired
- Ensure CA bundle is complete
- Clear browser cache

## Security Best Practices

1. **Never commit private keys to version control**
   - Add `infrastructure/ssl/custom/*.key` to `.gitignore`

2. **Set restrictive permissions**
   - Private key: `chmod 600`
   - Certificates: `chmod 644`

3. **Use strong key sizes**
   - Minimum 2048-bit RSA
   - Prefer 4096-bit for production

4. **Monitor expiration**
   - Set alerts 30 days before expiration
   - Have renewal process documented

5. **Keep backups**
   - Store copies in secure location
   - Document where to retrieve renewals
