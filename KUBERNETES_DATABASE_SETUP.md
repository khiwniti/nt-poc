# Kubernetes PostgreSQL Database Setup for Railway Integration

## Overview

This guide documents the setup of PostgreSQL in Kubernetes with external access for Railway backend services.

## Architecture

- **Database**: PostgreSQL 15 running in Kubernetes StatefulSet
- **Backend Services**: Deployed on Railway (frontend, backend, mlops, line-bot, simulator)
- **Database Access**: LoadBalancer service exposes PostgreSQL for external access

## Components Deployed

### 1. Namespace
- **Name**: `facility-manager`
- **Purpose**: Isolated environment for all BMS resources

### 2. PostgreSQL StatefulSet
- **Image**: `postgres:15-alpine`
- **Replicas**: 1 (can be scaled for HA)
- **Storage**: 10Gi persistent volume
- **Resources**:
  - Requests: 256Mi RAM, 250m CPU
  - Limits: 512Mi RAM, 500m CPU

### 3. Services
- **postgres** (LoadBalancer): External access on port 5432
- **postgres-headless** (ClusterIP): Internal cluster DNS

### 4. Secrets
- **database-credentials**: PostgreSQL username and password
- **jwt-secret**: JWT signing key for backend
- **line-credentials**: LINE bot tokens
- **gemini-key**: Gemini API key

## Deployment Steps

### Initial Deployment

```bash
# Create namespace
kubectl apply -f k8s/base/namespace.yaml

# Deploy secrets
kubectl apply -f k8s/base/secrets/secrets.yaml

# Deploy PostgreSQL
kubectl apply -f k8s/base/statefulsets/postgres-statefulset.yaml
```

### Verify Deployment

```bash
# Check pod status
kubectl get pods -n facility-manager

# Check services
kubectl get svc -n facility-manager

# Check logs
kubectl logs -f postgres-0 -n facility-manager
```

### Get External Access Details

```bash
# Get LoadBalancer external IP
kubectl get svc postgres -n facility-manager -o jsonpath='{.status.loadBalancer.ingress[0].ip}'

# For localhost/kind clusters
kubectl get svc postgres -n facility-manager
# Look for EXTERNAL-IP: localhost and NODE-PORT
```

## Railway Backend Configuration

### Required Environment Variables

For Railway backend service, configure these variables:

```bash
# Database connection
DB_HOST=<kubernetes-cluster-external-ip-or-tunnel>
DB_PORT=5432
DB_NAME=battery_db
DB_USER=postgres
DB_PASSWORD=postgres
DB_SSL=false

# Application
NODE_ENV=production
PORT=3000
JWT_SECRET=<your-jwt-secret>

# Optional
SENTRY_DSN=<your-sentry-dsn>
```

### Database Connection Options

#### Option 1: Public Cloud Kubernetes (Recommended for Production)
If using GKE, EKS, or AKS, the LoadBalancer will get a public IP automatically.

```bash
# Get external IP
kubectl get svc postgres -n facility-manager
# Use this IP in Railway DB_HOST
```

#### Option 2: Local Kubernetes with Tunnel (Development)
For local Kind/Docker Desktop, use ngrok or similar:

```bash
# Forward PostgreSQL port
kubectl port-forward svc/postgres 5432:5432 -n facility-manager

# In another terminal, expose with ngrok
ngrok tcp 5432
# Use ngrok URL in Railway DB_HOST
```

#### Option 3: VPN/Private Network
Configure VPN between Railway and your Kubernetes cluster network.

## Database Migrations

### From Railway Backend

Once Railway backend is configured with correct DB connection:

```bash
# Migrations run automatically on startup via start-production.sh
# Or manually trigger via Railway service logs
```

### Manual Migration (if needed)

```bash
# Port forward to local
kubectl port-forward svc/postgres 5432:5432 -n facility-manager

# Run migrations from local backend
cd services/backend
npm run migrate
```

## Security Considerations

### Production Hardening

1. **Change Default Credentials**
   ```bash
   # Update secret with strong password
   kubectl edit secret database-credentials -n facility-manager
   ```

2. **Enable SSL/TLS**
   - Configure PostgreSQL with SSL certificates
   - Update StatefulSet to mount certs
   - Set `DB_SSL=true` in Railway

3. **Network Policies**
   ```yaml
   # Restrict database access to specific IPs
   apiVersion: networking.k8s.io/v1
   kind: NetworkPolicy
   metadata:
     name: postgres-access
     namespace: facility-manager
   spec:
     podSelector:
       matchLabels:
         app: postgres
     policyTypes:
     - Ingress
     ingress:
     - from:
       - ipBlock:
           cidr: <railway-ip-range>/32
       ports:
       - protocol: TCP
         port: 5432
   ```

4. **Backup Strategy**
   ```bash
   # Create CronJob for daily backups
   kubectl apply -f k8s/jobs/postgres-backup-cronjob.yaml
   ```

## Monitoring

### Check Database Health

```bash
# Connect to PostgreSQL
kubectl exec -it postgres-0 -n facility-manager -- psql -U postgres -d battery_db

# Check running queries
SELECT * FROM pg_stat_activity;

# Check database size
SELECT pg_size_pretty(pg_database_size('battery_db'));
```

### Logs

```bash
# Stream logs
kubectl logs -f postgres-0 -n facility-manager

# Get recent logs
kubectl logs --tail=100 postgres-0 -n facility-manager
```

## Troubleshooting

### Pod Not Starting

```bash
# Describe pod for events
kubectl describe pod postgres-0 -n facility-manager

# Check PVC status
kubectl get pvc -n facility-manager

# Check if storage provisioner is available
kubectl get storageclass
```

### Connection Issues

```bash
# Test from within cluster
kubectl run -it --rm psql-test --image=postgres:15-alpine -n facility-manager -- psql -h postgres -U postgres -d battery_db

# Test external access
psql -h <external-ip> -p 5432 -U postgres -d battery_db
```

### Performance Issues

```bash
# Check resource usage
kubectl top pod postgres-0 -n facility-manager

# Scale up resources if needed
kubectl edit statefulset postgres -n facility-manager
# Update resource limits
```

## Scaling

### Vertical Scaling (More Resources)

```bash
# Edit StatefulSet
kubectl edit statefulset postgres -n facility-manager
# Update resources.requests and resources.limits
```

### Horizontal Scaling (Replication)

For production HA, consider:
- PostgreSQL with replication (primary-replica setup)
- Use tools like Patroni, Stolon, or CloudNativePG operator
- Configure separate services for read/write operations

## Backup and Restore

### Manual Backup

```bash
# Create backup
kubectl exec postgres-0 -n facility-manager -- pg_dump -U postgres battery_db > backup.sql

# Restore backup
kubectl exec -i postgres-0 -n facility-manager -- psql -U postgres battery_db < backup.sql
```

### Automated Backups

Consider using:
- Velero for full cluster backups
- PostgreSQL WAL archiving
- Cloud provider backup solutions (if on managed K8s)

## Migration from Development to Production

1. **Backup Development Data**
2. **Update Secrets** with production credentials
3. **Deploy to Production K8s**
4. **Configure Railway** with production DB connection
5. **Run Migrations**
6. **Verify Connectivity**
7. **Import Data** (if needed)

## Related Documentation

- [Railway Deployment Guide](RAILWAY_ALL_SERVICES_DEPLOYED.md)
- [Database Migration Guide](DATABASE_MIGRATION_GUIDE.md)
- [Backend Configuration](services/backend/README.md)

## Support

For issues or questions:
1. Check logs: `kubectl logs postgres-0 -n facility-manager`
2. Review events: `kubectl get events -n facility-manager`
3. Consult [Kubernetes Troubleshooting](https://kubernetes.io/docs/tasks/debug/)
