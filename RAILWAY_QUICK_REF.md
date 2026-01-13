# Railway Deployment Quick Reference

## 🚀 Complete Deployment Workflow

### 1. Initial Setup (One Time)
```bash
# Login to Railway
railway login

# Navigate to project
cd /Users/khiwn/nt-poc/nt-poc

# Link to Railway project
railway link --project battery-rul-monitoring
```

### 2. Add Databases (Via Dashboard)
1. Go to https://railway.app/project/battery-rul-monitoring
2. Add PostgreSQL 16
3. Add Redis 7
4. Enable TimescaleDB:
   ```bash
   railway run psql $DATABASE_URL -c "CREATE EXTENSION IF NOT EXISTS timescaledb;"
   ```

### 3. Configure Shared Environment Variables
```bash
# Run automated setup
./setup-shared-env.sh

# Verify all variables are set
./verify-env.sh
```

### 4. Deploy All Services
```bash
# Deploy everything at once
./deploy-all-services.sh
```

### 5. Post-Deployment Configuration

#### Get Service URLs:
```bash
railway status
```

#### Update Frontend API URLs:
```bash
# Set these in Railway Dashboard for 'frontend' service:
VITE_API_BASE_URL=https://<backend-domain>.railway.app/api/v1
VITE_MLOPS_SERVICE_URL=https://<mlops-domain>.railway.app
```

#### Redeploy Frontend:
```bash
cd services/frontend
railway up --service frontend
```

---

## 📝 Manual Environment Variable Commands

### View all variables for a service:
```bash
railway variables --service backend
```

### Set a single variable:
```bash
railway variables --service backend set NODE_ENV=production
```

### Set multiple variables:
```bash
railway variables --service backend set \
  NODE_ENV=production \
  PORT=3000 \
  LOG_LEVEL=info
```

### Generate secure tokens:
```bash
# JWT Secret
openssl rand -base64 32

# Auth tokens
openssl rand -hex 32
```

---

## 🔍 Monitoring & Debugging

### Check deployment status:
```bash
railway status
```

### View logs for a service:
```bash
railway logs --service backend
railway logs --service frontend
railway logs --service mlops
railway logs --service simulator
railway logs --service line-bot
```

### View real-time logs:
```bash
railway logs --service backend --follow
```

### Restart a service:
```bash
railway restart --service backend
```

### Redeploy a service:
```bash
railway redeploy --service backend
```

---

## 🔗 Service URLs

### Internal (Private) URLs:
```
backend.railway.internal:3000
mlops.railway.internal:8001
simulator.railway.internal:8002
line-bot.railway.internal:3001
postgres.railway.internal:5432
redis.railway.internal:6379
```

### Public URLs (Get from Dashboard):
```
Frontend:  https://<frontend-xxx>.railway.app
Backend:   https://<backend-xxx>.railway.app
MLOps:     https://<mlops-xxx>.railway.app
```

---

## ✅ Verification Checklist

- [ ] Logged in to Railway CLI
- [ ] Project linked
- [ ] PostgreSQL database created
- [ ] Redis cache created
- [ ] TimescaleDB extension enabled
- [ ] PostgreSQL linked to: backend, mlops
- [ ] Redis linked to: backend, mlops
- [ ] All environment variables set (run `./verify-env.sh`)
- [ ] Backend deployed successfully
- [ ] Frontend deployed successfully
- [ ] MLOps deployed successfully
- [ ] Simulator deployed successfully
- [ ] Line Bot deployed successfully
- [ ] Frontend API URLs updated with actual domains
- [ ] Frontend redeployed after URL updates
- [ ] All services healthy (check Railway Dashboard)

---

## 🆘 Troubleshooting

### Issue: "Service not found"
**Solution:** Run `railway add --service <name>` to create the service first

### Issue: "Unauthorized. Please login"
**Solution:** Run `railway login` to re-authenticate

### Issue: Database connection failed
**Solution:** 
1. Verify PostgreSQL plugin is added
2. Check if service is linked to PostgreSQL in Dashboard
3. Redeploy the service

### Issue: Frontend can't reach backend
**Solution:**
1. Get backend public URL from Railway Dashboard
2. Set `VITE_API_BASE_URL` in frontend service
3. Redeploy frontend

### Issue: Services can't communicate
**Solution:** Use internal URLs (e.g., `http://backend.railway.internal:3000`)

### Issue: Build failed
**Solution:**
1. Check logs: `railway logs --service <name>`
2. Verify all required files exist (package.json, requirements.txt, etc.)
3. Check for syntax errors in code

---

## 📚 Documentation Files

- `RAILWAY_ENV_GUIDE.md` - Complete environment variables guide
- `ARCHITECTURE.md` - Visual architecture diagram
- `railway.toml` - Railway configuration file
- `setup-shared-env.sh` - Automated environment setup
- `verify-env.sh` - Verify all variables are set
- `deploy-all-services.sh` - Deploy all services

---

## 🔄 Update Workflow

When you make code changes:

```bash
# 1. Commit your changes
git add .
git commit -m "Your changes"

# 2. Deploy updated service
cd services/<service-name>
railway up --service <service-name>

# Or deploy from root
cd /Users/khiwn/nt-poc/nt-poc
railway up --service <service-name>
```

---

## 💡 Pro Tips

1. **Use internal networking** for service-to-service communication (faster & free)
2. **Link databases** instead of manually setting connection strings
3. **Use Railway Dashboard** for easier visual management
4. **Check logs immediately** after deployment to catch errors early
5. **Set environment variables before deploying** to avoid redeploys
6. **Use .railway.internal URLs** for backend → mlops communication

---

## 📞 Support

- Railway Documentation: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Project Dashboard: https://railway.app/project/battery-rul-monitoring
