# Railway Services Architecture & Shared Properties

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        RAILWAY PROJECT                                   │
│                   battery-rul-monitoring                                 │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                    MANAGED SERVICES (Plugins)                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────────┐          ┌──────────────────────┐            │
│  │   PostgreSQL 16      │          │      Redis 7         │            │
│  │   + TimescaleDB      │          │                      │            │
│  │                      │          │                      │            │
│  │  Provides:           │          │  Provides:           │            │
│  │  • DATABASE_URL      │          │  • REDIS_URL         │            │
│  │  • DB_HOST           │          │  • REDIS_HOST        │            │
│  │  • DB_PORT           │          │  • REDIS_PORT        │            │
│  │  • DB_NAME           │          │  • REDIS_PASSWORD    │            │
│  │  • DB_USER           │          │                      │            │
│  │  • DB_PASSWORD       │          │                      │            │
│  └──────────────────────┘          └──────────────────────┘            │
│           │  │                              │  │                        │
└───────────┼──┼──────────────────────────────┼──┼────────────────────────┘
            │  │                              │  │
            │  └──────────┬───────────────────┘  │
            │             │                      │
┌───────────▼─────────────▼──────────────────────▼───────────────────────┐
│                    APPLICATION SERVICES                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────┐      │
│  │                    BACKEND (Node.js/Express)                  │      │
│  │                backend.railway.internal:3000                  │      │
│  ├──────────────────────────────────────────────────────────────┤      │
│  │  Shared from PostgreSQL:                                      │      │
│  │  ✓ DATABASE_URL, DB_HOST, DB_PORT, DB_NAME, DB_USER, etc.   │      │
│  │                                                               │      │
│  │  Shared from Redis:                                           │      │
│  │  ✓ REDIS_URL                                                  │      │
│  │                                                               │      │
│  │  Custom Environment:                                          │      │
│  │  • NODE_ENV=production                                        │      │
│  │  • PORT=3000                                                  │      │
│  │  • JWT_SECRET=<shared-secret>                                 │      │
│  │  • MLOPS_SERVICE_URL=http://mlops.railway.internal:8001      │      │
│  │  • LOG_LEVEL=info                                             │      │
│  └──────────────────────────────────────────────────────────────┘      │
│                                │                                         │
│                                │ Internal Network                        │
│                                ▼                                         │
│  ┌──────────────────────────────────────────────────────────────┐      │
│  │                    MLOPS (Python/FastAPI)                     │      │
│  │                 mlops.railway.internal:8001                   │      │
│  ├──────────────────────────────────────────────────────────────┤      │
│  │  Shared from PostgreSQL (Optional):                           │      │
│  │  ✓ DATABASE_URL                                               │      │
│  │                                                               │      │
│  │  Shared from Redis (Optional):                                │      │
│  │  ✓ REDIS_URL                                                  │      │
│  │                                                               │      │
│  │  Custom Environment:                                          │      │
│  │  • APP_NAME=MLOps Service                                     │      │
│  │  • ENVIRONMENT=production                                     │      │
│  │  • PORT=8001                                                  │      │
│  │  • LOG_LEVEL=INFO                                             │      │
│  └──────────────────────────────────────────────────────────────┘      │
│                                ▲                                         │
│                                │ API Calls                               │
│                                │                                         │
│  ┌──────────────────────────────────────────────────────────────┐      │
│  │                  SIMULATOR (Python/FastAPI)                   │      │
│  │               simulator.railway.internal:8002                 │      │
│  ├──────────────────────────────────────────────────────────────┤      │
│  │  Custom Environment:                                          │      │
│  │  • APP_NAME=Sensor Simulator                                  │      │
│  │  • PORT=8002                                                  │      │
│  │  • BACKEND_API_URL=http://backend.railway.internal:3000      │      │
│  │  • SIMULATION_INTERVAL=5                                      │      │
│  └──────────────────────────────────────────────────────────────┘      │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────┐      │
│  │                   LINE BOT (Node.js/Express)                  │      │
│  │                line-bot.railway.internal:3001                 │      │
│  ├──────────────────────────────────────────────────────────────┤      │
│  │  Custom Environment:                                          │      │
│  │  • NODE_ENV=production                                        │      │
│  │  • PORT=3001                                                  │      │
│  │  • BACKEND_API_URL=http://backend.railway.internal:3000      │      │
│  │  • LINE_CHANNEL_ACCESS_TOKEN=<your-token>                    │      │
│  │  • LINE_CHANNEL_SECRET=<your-secret>                         │      │
│  └──────────────────────────────────────────────────────────────┘      │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────┐      │
│  │                    FRONTEND (React/Vite)                      │      │
│  │                 <public-domain>.railway.app                   │      │
│  ├──────────────────────────────────────────────────────────────┤      │
│  │  Custom Environment:                                          │      │
│  │  • NODE_ENV=production                                        │      │
│  │  • VITE_APP_NAME=Battery Management System                    │      │
│  │  • VITE_API_BASE_URL=https://backend-xxx.railway.app/api/v1  │      │
│  │  • VITE_MLOPS_SERVICE_URL=https://mlops-xxx.railway.app      │      │
│  │  • VITE_ENVIRONMENT=production                                │      │
│  └──────────────────────────────────────────────────────────────┘      │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════
                          SHARED PROPERTIES SUMMARY
═══════════════════════════════════════════════════════════════════════════

┌────────────────────┬──────────────────────────────────────────────────┐
│  Property          │  Shared By                                       │
├────────────────────┼──────────────────────────────────────────────────┤
│  DATABASE_URL      │  Backend, MLOps (from PostgreSQL plugin)        │
│  REDIS_URL         │  Backend, MLOps (from Redis plugin)             │
│  NODE_ENV          │  Backend, Frontend, Line Bot                    │
│  LOG_LEVEL         │  Backend, MLOps                                  │
│  BACKEND_API_URL   │  Simulator, Line Bot (internal networking)      │
│  JWT_SECRET        │  Backend (generated once, reused)               │
│  PORT              │  All services (unique per service)              │
└────────────────────┴──────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════
                          INTERNAL NETWORKING
═══════════════════════════════════════════════════════════════════════════

Services communicate privately using .railway.internal domains:

  Frontend (Browser) ──[HTTPS]──> Backend (public URL)
                                      │
                                      ├──[Internal]──> MLOps
                                      ├──[Internal]──> PostgreSQL
                                      └──[Internal]──> Redis

  Simulator ──[Internal]──> Backend ──[Internal]──> PostgreSQL

  Line Bot ──[Internal]──> Backend ──[Internal]──> PostgreSQL

═══════════════════════════════════════════════════════════════════════════
