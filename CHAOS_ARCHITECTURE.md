# Chaos Testing Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Client Application                          │
└────────────────────────────┬────────────────────────────────────┘
                             │
                    HTTP Requests
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Express Application                           │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Chaos Middleware                            │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │  1. Inject Service Failures (random 5xx)          │  │   │
│  │  │  2. Inject Network Latency (100-3000ms)           │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                             │                                    │
│                             ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Application Routes                          │   │
│  │  • /api/v1/facilities                                    │   │
│  │  • /api/v1/alerts                                        │   │
│  │  • /api/v1/predictions                                   │   │
│  │  • /api/v1/chaos (control endpoints)                     │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
              ▼                             ▼
┌──────────────────────────┐   ┌──────────────────────────┐
│  ChaosAwareDatabase      │   │  ChaosAwareRedis         │
│  ┌────────────────────┐  │   │  ┌────────────────────┐  │
│  │ Check chaos flag   │  │   │  │ Check chaos flag   │  │
│  └─────────┬──────────┘  │   │  └─────────┬──────────┘  │
│            │              │   │            │              │
│     ┌──────▼──────┐       │   │     ┌──────▼──────┐      │
│     │ Inject DB   │       │   │     │ Inject Redis│      │
│     │ Failures?   │       │   │     │ Failures?   │      │
│     └──────┬──────┘       │   │     └──────┬──────┘      │
│            │              │   │            │              │
│            ▼              │   │            ▼              │
│  ┌────────────────────┐  │   │  ┌────────────────────┐  │
│  │   PostgreSQL       │  │   │  │   Redis Cache      │  │
│  └────────────────────┘  │   │  └────────────────────┘  │
└──────────────────────────┘   └──────────────────────────┘
```

## Component Interaction Flow

### 1. Normal Request Flow (Chaos Disabled)
```
Client → Middleware → Route → Service → Database/Redis → Response
  ✓        ✓          ✓        ✓           ✓              ✓
```

### 2. Service Failure Scenario (Chaos Enabled)
```
Client → Middleware → X (throws error)
  ✓        FAIL       
                    → Error Handler → 500 Response
```

### 3. Network Latency Scenario (Chaos Enabled)
```
Client → Middleware (delay 1234ms) → Route → Service → Response
  ✓        💤��💤                      ✓        ✓          ✓
```

### 4. Database Failure Scenario (Chaos Enabled)
```
Client → Route → Service → ChaosAwareDB → X (throws error)
  ✓       ✓        ✓           FAIL
                                         → Error Handler → 500
```

### 5. Redis Failure Scenario (Chaos Enabled)
```
Client → Route → Service → ChaosAwareRedis → X (throws error)
  ✓       ✓        ✓              FAIL
                                           → Fallback to DB → Response
```

## Chaos Monkey Control Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Chaos Monkey Engine                      │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Configuration                                        │  │
│  │  • enabled: true/false                                │  │
│  │  • failureRate: 0.0 - 1.0                             │  │
│  │  • scenarios: {service, network, db, redis}           │  │
│  │  • networkLatencyMs: {min, max}                       │  │
│  └───────────────────────────────────────────────────────┘  │
│                            │                                 │
│                            ▼                                 │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Decision Logic                                       │  │
│  │  if (enabled && random() < failureRate)               │  │
│  │    → Inject Failure                                   │  │
│  │  else                                                  │  │
│  │    → Continue Normally                                │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## API Control Endpoints

```
POST /api/v1/chaos/enable
  │
  ├─→ Updates: enabled = true
  └─→ Returns: {success: true, enabled: true}

POST /api/v1/chaos/disable
  │
  ├─→ Updates: enabled = false
  └─→ Returns: {success: true, enabled: false}

POST /api/v1/chaos/config
  │
  ├─→ Updates: failureRate, scenarios, etc.
  └─→ Returns: {success: true, config: {...}}

GET /api/v1/chaos/config
  │
  └─→ Returns: Current configuration

POST /api/v1/chaos/test/:scenario
  │
  ├─→ service-failure  → Attempts to inject failure
  ├─→ network-latency  → Measures injected delay
  ├─→ database-failure → Tests DB failure injection
  └─→ redis-failure    → Tests Redis failure injection
```

## State Management

```
┌────────────────────────────────────────────────────┐
│         Chaos Monkey Singleton Instance            │
│  ┌──────────────────────────────────────────────┐  │
│  │  State (in-memory)                           │  │
│  │  • enabled: boolean                          │  │
│  │  • failureRate: number                       │  │
│  │  • scenarios: object                         │  │
│  │  • networkLatencyMs: {min, max}              │  │
│  └──────────────────────────────────────────────┘  │
│                      │                              │
│        ┌─────────────┴─────────────┐                │
│        │                           │                │
│        ▼                           ▼                │
│  ┌──────────┐              ┌──────────┐            │
│  │ Read by  │              │ Modified │            │
│  │ All      │              │ via API  │            │
│  │ Wrappers │              │ or ENV   │            │
│  └──────────┘              └──────────┘            │
└────────────────────────────────────────────────────┘
```

## Failure Injection Timing

```
Request Timeline:
│
├─ 0ms    : Request arrives
│           └─→ Logging Middleware
│
├─ 1ms    : Chaos Middleware
│           ├─→ Check: Service Failure? (instant)
│           └─→ Check: Network Latency? (0-3000ms)
│
├─ ?ms    : Route Handler
│           └─→ Business Logic
│
├─ ?ms    : Database/Redis Access
│           ├─→ ChaosAwareDatabase: Check DB failure? (instant)
│           └─→ ChaosAwareRedis: Check Redis failure? (instant)
│
└─ ?ms    : Response sent
```

## Recovery Flow

```
┌────────────────────────────────────────────┐
│  Chaos Disabled (enable = false)           │
│                                            │
│  1. POST /api/v1/chaos/disable             │
│     └─→ chaosMonkey.enabled = false        │
│                                            │
│  2. All checks return false                │
│     ├─→ shouldInjectFailure() → false      │
│     ├─→ shouldInjectDatabaseFailure() → f  │
│     └─→ shouldInjectRedisFailure() → false │
│                                            │
│  3. System operates normally               │
│     ├─→ No failures injected               │
│     ├─→ No latency added                   │
│     └─→ All requests succeed               │
│                                            │
│  4. Verify recovery                        │
│     ├─→ Health check: OK                   │
│     ├─→ Database: Connected                │
│     └─→ Redis: Available                   │
└────────────────────────────────────────────┘
```

## Logging Flow

```
Chaos Event
    │
    ▼
┌─────────────────────────┐
│  Winston Logger         │
│  level: warn            │
│  message: chaos_*       │
│  metadata: {...}        │
└───────────┬─────────────┘
            │
      ┌─────┴─────┐
      ▼           ▼
┌─────────┐  ┌─────────┐
│  File   │  │ Console │
│  Logs   │  │  Output │
└─────────┘  └─────────┘
      │           │
      └─────┬─────┘
            ▼
    ┌───────────────┐
    │  Monitoring   │
    │  & Alerting   │
    └───────────────┘
```

## Test Architecture

```
┌────────────────────────────────────────────────────────┐
│                    Test Suites                         │
│                                                        │
│  ┌──────────────────────────────────────────────────┐ │
│  │  chaosMonkey.test.ts (15 tests)                  │ │
│  │  • Configuration management                      │ │
│  │  • Failure rate behavior                         │ │
│  │  • All scenario types                            │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  ┌──────────────────────────────────────────────────┐ │
│  │  chaosAwareDatabase.test.ts (3 tests)            │ │
│  │  • Query interception                            │ │
│  │  • Failure injection                             │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  ┌──────────────────────────────────────────────────┐ │
│  │  chaosAwareRedis.test.ts (8 tests)               │ │
│  │  • All operations (get/set/del/exists)           │ │
│  │  • Failure injection                             │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  ┌──────────────────────────────────────────────────┐ │
│  │  chaos.test.ts (10 tests)                        │ │
│  │  • API endpoint behavior                         │ │
│  │  • Configuration updates                         │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  ┌──────────────────────────────────────────────────┐ │
│  │  systemRecovery.test.ts (8 tests)                │ │
│  │  • Recovery validation                           │ │
│  │  • Resilience testing                            │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  Total: 44 tests                                      │
└────────────────────────────────────────────────────────┘
```

## Security Considerations

```
┌─────────────────────────────────────────────────────┐
│  Safety Mechanisms                                  │
│                                                     │
│  1. Disabled by Default                             │
│     CHAOS_ENABLED=false (in .env)                   │
│                                                     │
│  2. API Access Control                              │
│     • Could add authentication                      │
│     • Currently open (non-production)               │
│                                                     │
│  3. No Persistent State                             │
│     • All in-memory                                 │
│     • Clean recovery on restart                     │
│                                                     │
│  4. Observable                                      │
│     • All events logged                             │
│     • Audit trail maintained                        │
│                                                     │
│  5. Gradual Control                                 │
│     • Adjustable failure rates                      │
│     • Per-scenario enable/disable                   │
└─────────────────────────────────────────────────────┘
```

## Performance Impact

```
When Disabled (Default):
┌────────────────────────────┐
│  Overhead: ~0%             │
│  • No checks performed     │
│  • No delays added         │
│  • Production-safe         │
└────────────────────────────┘

When Enabled (failureRate=0.1):
┌────────────────────────────┐
│  Overhead: ~1-2%           │
│  • Simple random checks    │
│  • Minimal CPU impact      │
│  • 10% requests affected   │
└────────────────────────────┘

When Enabled (failureRate=0.5):
┌────────────────────────────┐
│  Overhead: ~5-10%          │
│  • More failures           │
│  • More latency            │
│  • 50% requests affected   │
└────────────────────────────┘
```
