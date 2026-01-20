# Vercel Deployment Guide for NT-POC

This guide covers deploying the NT-POC Battery Management System to Vercel.

## 📋 Prerequisites

1. **Vercel Account**: Sign up at https://vercel.com
2. **GitHub Repository**: Push your code to GitHub
3. **Environment Variables**: Prepare all required environment variables
4. **External Services**:
   - PostgreSQL/TimescaleDB database (recommend Railway, Supabase, or Neon)
   - OpenAI API key (for RAG chatbot)
   - Optional: Pinecone API key (for production RAG)
   - Optional: Redis instance
   - Optional: Sentry DSN (for error tracking)

---

## 🚀 Deployment Steps

### Step 1: Deploy Frontend to Vercel

#### Via Vercel Dashboard

1. Go to https://vercel.com/new
2. Import your GitHub repository
3. Configure project:
   - **Framework Preset**: Vite
   - **Root Directory**: `services/frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

4. Add Environment Variables (see below)
5. Click "Deploy"

#### Via Vercel CLI

```bash
cd services/frontend

# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

### Step 2: Deploy Backend to Vercel

**⚠️ Important Note**: Vercel serverless functions have limitations:
- Maximum execution time: 60 seconds (Pro plan) / 10 seconds (Hobby)
- Cold starts can be slow
- Background jobs won't work in serverless

**Recommendation**: For the backend, consider using:
- **Railway** (https://railway.app) - Better for long-running Node.js apps
- **Render** (https://render.com) - Good alternative
- **AWS App Runner** or **Google Cloud Run** - More control

If you still want to use Vercel for the backend:

```bash
cd services/backend

# Ensure build works
npm run build

# Deploy
vercel --prod
```

**Important**: Background jobs (sensor ingestion, scheduled predictions, alert escalation) will NOT work on Vercel serverless. You'll need to:
- Disable background jobs: Set `SENSOR_INGESTION_ENABLED=false`
- Use external cron services (like Vercel Cron or cron-job.org) to trigger endpoints
- Or deploy backend to Railway/Render

### Step 3: Deploy MLOps Service

Vercel is not suitable for MLOps service due to:
- Large model files
- Long inference times
- GPU requirements

**Recommended platforms**:
- **Railway**: Easiest deployment
- **Render**: Good for Python apps
- **AWS SageMaker** or **GCP AI Platform**: Production-scale ML

### Step 4: Deploy Simulator

Same as MLOps - better suited for Railway or Render.

---

## 🔐 Environment Variables

### Frontend Environment Variables (Vercel)

Set these in Vercel Dashboard → Settings → Environment Variables:

```bash
# API Backend URL (will be your backend Vercel URL or Railway URL)
VITE_API_URL=https://your-backend.vercel.app

# Maps & Geospatial
VITE_MAPBOX_TOKEN=pk.your-mapbox-token

# AI Services
VITE_GEMINI_API_KEY=AIzaSy...your-gemini-api-key

# Monitoring
VITE_SENTRY_DSN=https://your-frontend-dsn@sentry.io/project-id
VITE_SENTRY_RELEASE=production-v1.0.0
```

### Backend Environment Variables (Vercel or Railway)

```bash
# Database (Use external managed PostgreSQL)
DB_HOST=your-postgres-host.railway.app
DB_PORT=5432
DB_NAME=railway
DB_USER=postgres
DB_PASSWORD=your-secure-password
DB_SSL=true

# Server
PORT=3000
NODE_ENV=production

# OpenAI (Required for RAG Chatbot)
OPENAI_API_KEY=sk-proj-...your-openai-key

# Pinecone (Optional - For Production RAG)
# PINECONE_API_KEY=your-pinecone-key
# PINECONE_INDEX_NAME=battery-management-rag

# MLOps Service URL (Will be Railway/Render URL)
MLOPS_BASE_URL=https://your-mlops.railway.app

# Simulator Service URL (Will be Railway/Render URL)
SIMULATOR_URL=https://your-simulator.railway.app

# Background Jobs (DISABLE for Vercel serverless)
SENSOR_INGESTION_ENABLED=false
PREDICTION_JOB_INTERVAL_MINUTES=60
ESCALATION_JOB_INTERVAL_MINUTES=5

# Monitoring
METRICS_AUTH_TOKEN=your-secret-token
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
SENTRY_RELEASE=production-v1.0.0

# Security
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRY=24h

# CORS (Your frontend Vercel URL)
CORS_ORIGINS=https://your-frontend.vercel.app
```

---

## 🎯 Recommended Architecture

For best results, use this hybrid approach:

```
Frontend (Vercel)
    ↓
Backend (Railway/Render) ← Recommended over Vercel
    ↓
┌───────┴────────┐
↓                ↓
MLOps (Railway)  Simulator (Railway)
```

**Why this architecture?**
- ✅ Frontend on Vercel: Fast CDN, automatic HTTPS, great for static sites
- ✅ Backend on Railway: Supports background jobs, WebSocket, long-running processes
- ✅ ML services on Railway: Better for Python apps, model files, GPU support
- ✅ All services get automatic HTTPS and monitoring

---

## 📦 Alternative: All Services on Railway

If you prefer a simpler setup, deploy everything to Railway:

### Railway Deployment (Recommended)

1. **Create Railway Account**: https://railway.app
2. **Create New Project**
3. **Deploy Services**:

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link project
railway link

# Deploy backend
cd services/backend
railway up

# Deploy frontend
cd services/frontend
railway up

# Deploy MLOps
cd services/mlops
railway up

# Deploy simulator
cd services/simulator
railway up
```

4. **Set Environment Variables** in Railway Dashboard
5. **Configure Domains** for each service

---

## 🔍 Vercel-Specific Considerations

### 1. Serverless Function Limitations

Vercel Functions have these limits:
- **Hobby Plan**: 10s execution, 1024MB memory
- **Pro Plan**: 60s execution, 3008MB memory

This affects:
- ML predictions (may timeout)
- Large data queries (may timeout)
- Background jobs (won't work)

### 2. Cold Starts

First request after inactivity will be slow (3-5 seconds). Solutions:
- Use Vercel Cron to keep functions warm
- Add loading indicators in frontend
- Consider using Railway for backend

### 3. File System

Vercel functions have read-only file system except `/tmp`. This affects:
- Model file caching
- Log file writing
- Temporary file storage

Use environment variables or external storage (S3, Redis) for persistence.

### 4. WebSocket Support

Vercel doesn't support WebSockets. If you need:
- Real-time sensor streaming
- Live dashboards
- WebSocket connections

Use Railway, Render, or add a separate WebSocket server.

---

## ✅ Post-Deployment Checklist

### Frontend (Vercel)

- [ ] Deployment successful
- [ ] Custom domain configured (optional)
- [ ] HTTPS working
- [ ] Environment variables set
- [ ] API calls working (check browser console)
- [ ] No CORS errors
- [ ] Sentry receiving errors
- [ ] All pages load correctly

### Backend (Vercel or Railway)

- [ ] Deployment successful
- [ ] Health check endpoint working: `GET /api/v1/health`
- [ ] Database connection working
- [ ] MLOps service reachable
- [ ] Simulator service reachable
- [ ] CORS configured correctly
- [ ] Rate limiting working
- [ ] Sentry receiving errors
- [ ] Metrics endpoint accessible: `GET /metrics`

### Integration Test

Test the complete data flow:

```bash
# 1. Check frontend loads
curl https://your-frontend.vercel.app

# 2. Check backend health
curl https://your-backend.vercel.app/api/v1/health

# 3. Test API endpoint (with auth token)
curl https://your-backend.vercel.app/api/v1/facilities \
  -H "Authorization: Bearer YOUR_TOKEN"

# 4. Test RAG chatbot
curl -X POST https://your-backend.vercel.app/api/v1/chatbot/chat \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "What is the system status?"}'
```

---

## 🐛 Common Deployment Issues

### Issue: "Function exceeded maximum execution time"

**Cause**: Serverless function timeout (10s Hobby, 60s Pro)

**Solutions**:
1. Optimize database queries
2. Upgrade to Pro plan
3. Move to Railway/Render

### Issue: "CORS error when calling API"

**Cause**: CORS misconfiguration

**Solution**:
```bash
# In backend .env
CORS_ORIGINS=https://your-frontend.vercel.app,https://your-domain.com
```

### Issue: "Database connection failed"

**Cause**: SSL certificate issues or connection limits

**Solutions**:
1. Ensure `DB_SSL=true`
2. Use connection pooling
3. Check database allows external connections

### Issue: "Background jobs not running"

**Cause**: Vercel serverless doesn't support long-running processes

**Solutions**:
1. Set `SENSOR_INGESTION_ENABLED=false`
2. Use Vercel Cron to trigger endpoints:

Create `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/v1/jobs/trigger-prediction",
    "schedule": "0 * * * *"
  }]
}
```

3. Or move backend to Railway

### Issue: "OpenAI/Pinecone API calls timing out"

**Cause**: Slow external API calls

**Solutions**:
1. Increase timeout in axios config
2. Use streaming responses
3. Cache frequently used results

---

## 📊 Monitoring Your Deployment

### Vercel Analytics

Enable in Vercel Dashboard:
- Web Analytics (page views, performance)
- Speed Insights (Core Web Vitals)
- Audience Insights (demographics)

### Sentry Error Tracking

Monitor errors in real-time:
1. Check Sentry dashboard
2. Set up alerts for critical errors
3. Monitor error rate trends

### Health Checks

Set up external monitoring:
- **UptimeRobot**: https://uptimerobot.com
- **Pingdom**: https://pingdom.com
- **Better Uptime**: https://betteruptime.com

Monitor these endpoints:
- `https://your-frontend.vercel.app` (200 OK)
- `https://your-backend.vercel.app/api/v1/health` (200 OK, all services "up")

---

## 🚀 Performance Optimization

### Frontend

1. **Enable Vercel Edge Network**:
   - Automatic with Vercel
   - 99.99% uptime SLA

2. **Optimize Bundle Size**:
   ```bash
   # Analyze bundle
   npm run analyze

   # Check for large dependencies
   npx vite-bundle-visualizer
   ```

3. **Add Preloading**:
   ```html
   <!-- In index.html -->
   <link rel="preconnect" href="https://your-backend.vercel.app">
   <link rel="dns-prefetch" href="https://your-backend.vercel.app">
   ```

### Backend

1. **Database Connection Pooling**:
   ```typescript
   // knexfile.ts
   pool: {
     min: 2,
     max: 10
   }
   ```

2. **Response Caching**:
   ```typescript
   // Use Redis for caching
   const cachedData = await redis.get(cacheKey);
   if (cachedData) return cachedData;
   ```

3. **API Response Compression**:
   ```typescript
   // Already enabled in app.ts
   app.use(compression());
   ```

---

## 💰 Cost Estimates

### Vercel Pricing

**Hobby Plan** (Free):
- 100GB bandwidth
- Unlimited websites
- Automatic HTTPS
- Good for: Frontend only

**Pro Plan** ($20/month per user):
- 1TB bandwidth
- 60s function timeout
- Advanced analytics
- Good for: Frontend + simple backend

### Recommended Setup

**Cost-Effective** (~$30/month):
- Frontend: Vercel Hobby (Free)
- Backend: Railway Starter ($5/month)
- Database: Neon Postgres Free Tier (Free)
- MLOps: Railway Starter ($5/month)
- Simulator: Railway Starter ($5/month)
- OpenAI API: Pay-as-you-go (~$10-20/month for RAG)

**Production-Scale** (~$100/month):
- Frontend: Vercel Pro ($20/month)
- Backend: Railway Pro ($20/month)
- Database: Railway PostgreSQL ($10-30/month)
- MLOps: Railway Pro ($20/month)
- Simulator: Railway Starter ($5/month)
- OpenAI API: ~$50/month
- Pinecone: Free tier or Pro ($70/month)

---

## 📚 Additional Resources

- **Vercel Documentation**: https://vercel.com/docs
- **Railway Documentation**: https://docs.railway.app
- **Render Documentation**: https://render.com/docs
- **Supabase (Database)**: https://supabase.com
- **Neon (Database)**: https://neon.tech

---

## 🎉 Next Steps After Deployment

1. **Set up monitoring**:
   - Configure Sentry alerts
   - Set up uptime monitoring
   - Enable Vercel Analytics

2. **Configure custom domain**:
   - Add domain in Vercel
   - Update DNS records
   - Enable SSL

3. **Test thoroughly**:
   - Run integration tests
   - Test RAG chatbot
   - Verify all endpoints

4. **Document for team**:
   - Share deployment URLs
   - Document environment variables
   - Create runbook for common issues

5. **Monitor performance**:
   - Check error rates in Sentry
   - Monitor API response times
   - Track Core Web Vitals

---

## ❓ Need Help?

- Check existing issues: https://github.com/your-repo/nt-poc/issues
- Vercel Support: support@vercel.com
- Railway Discord: https://discord.gg/railway

For production deployment questions or issues, refer to:
- [PRODUCTION_READY_GUIDE.md](./PRODUCTION_READY_GUIDE.md)
- [DEPLOYMENT_SUMMARY.md](./DEPLOYMENT_SUMMARY.md)
