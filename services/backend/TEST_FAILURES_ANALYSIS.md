# Jest/Vitest Test Failures - Fix Plan

**Generated:** $(date)
**Test Runner:** Vitest
**Total Tests:** 522 tests
**Failing:** 100 tests (19%)
**Passing:** 278 tests (53%)
**Skipped:** 4 tests

## Summary of Issues

### 📊 Test Results Overview
- ✅ **278 tests passing** (53%)
- ❌ **100 tests failing** (19%)
- ⏭️ **4 tests skipped**
- 📁 **21 test files failing** out of 40

### 🔴 Critical Issues

#### 1. Database Connection Failures (Most Common)
**Affected Tests:** ~60+ tests
**Error:** `AggregateError` from `pg-pool`
**Root Cause:** Tests trying to connect to PostgreSQL database that doesn't exist or isn't running

**Files Affected:**
- `src/routes/__tests__/alerts.test.ts`
- `src/routes/__tests__/batteryHealth.test.ts`
- `src/routes/__tests__/comparativeAnalysis.test.ts`
- `src/services/__tests__/alertEscalationService.test.ts`
- `src/services/__tests__/reportAnalyticsService.test.ts`
- `src/routes/__tests__/reportAnalytics.test.ts`
- And many more...

**Solution Options:**
1. **Set up test database** (recommended for integration tests)
2. **Mock database layer** (for unit tests)
3. **Use in-memory SQLite** (lightweight alternative)

#### 2. Missing Dependencies
**Affected Tests:** `src/routes/__tests__/auth.test.ts`
**Error:** `Failed to load url bcrypt`
**Root Cause:** `bcrypt` not installed in devDependencies

**Solution:**
```bash
cd services/backend
npm install bcrypt --save-dev
```

#### 3. Invalid Module Paths
**Affected Tests:** `src/test/factories.example.test.ts`
**Error:** `Failed to load url ../../app`
**Root Cause:** Incorrect import path

**Solution:** Fix import path or remove example test file

#### 4. Redis Mocking Issues  
**Affected Tests:** `src/services/__tests__/reportCache.test.ts` (24 failures)
**Error:** Spy functions not being called
**Root Cause:** Redis client mocking not working correctly

**Solution:** Fix Redis mock setup in tests

#### 5. Route Registration Issues
**Affected Tests:** `src/routes/__tests__/health.test.ts` (6 failures)
**Error:** 404 Not Found
**Root Cause:** Health endpoint not registered in test app

**Solution:** Ensure routes are registered in test setup

#### 6. Weather Service Issues
**Affected Tests:** `src/services/__tests__/weatherService.test.ts` (5 failures)
**Error:** `expected undefined to be...`
**Root Cause:** Mock data not being returned properly

**Solution:** Fix mock setup for weather API calls

#### 7. Alert Escalation Job Issues
**Affected Tests:** `src/services/__tests__/alertEscalationJob.test.ts` (7 failures)
**Error:** `Cannot read properties of undefined (reading 'stop')`
**Root Cause:** Job instance not being created properly

**Solution:** Fix job initialization in tests

#### 8. Pact Contract Verification
**Affected Tests:** `src/test/pact/provider.verification.spec.ts`
**Error:** `Verification failed`
**Root Cause:** Provider doesn't match consumer contract

**Solution:** Update provider implementation or regenerate contracts

## 🎯 Fix Strategy

### Phase 1: Quick Wins (Fix 20+ tests)

#### 1.1 Install Missing Dependency (Fixes 1 file)
```bash
cd services/backend
npm install bcrypt --save-dev
```

#### 1.2 Remove/Fix Example Test (Fixes 1 file)
```bash
# Option A: Remove example test
rm src/test/factories.example.test.ts

# Option B: Fix import path
# Edit src/test/factories.example.test.ts
```

#### 1.3 Fix Health Route Test (Fixes 6 tests)
Update `src/routes/__tests__/health.test.ts` to properly register routes

### Phase 2: Database Tests (Fixes 60+ tests)

#### Option A: Set Up Test Database (Recommended)
```bash
# 1. Create test database configuration
# services/backend/.env.test
DATABASE_URL=postgresql://postgres:password@localhost:5432/bms_test
NODE_ENV=test

# 2. Create test database
createdb bms_test

# 3. Run migrations
npm run migrate

# 4. Update test setup to use test database
```

#### Option B: Mock Database Layer
```typescript
// services/backend/src/test/setup.ts
import { vi } from 'vitest';

// Mock knex for all tests
vi.mock('../config/database', () => ({
  default: {
    // Mock database operations
  }
}));
```

### Phase 3: Fix Mock Issues (Fixes 24+ tests)

#### 3.1 Fix Redis Cache Tests
Update `src/services/__tests__/reportCache.test.ts`:
- Fix Redis client mock setup
- Ensure spy functions are properly configured
- Verify mock return values

#### 3.2 Fix Weather Service Tests
Update `src/services/__tests__/weatherService.test.ts`:
- Fix API response mocks
- Ensure mock data structure matches expectations

### Phase 4: Fix Job Tests (Fixes 7 tests)

Update `src/services/__tests__/alertEscalationJob.test.ts`:
- Fix job initialization
- Ensure job instance is created before tests
- Fix cleanup in afterEach

### Phase 5: Contract Tests (Fixes 1 test)

Review and update Pact contracts:
- Regenerate consumer contracts if needed
- Update provider implementation
- Or skip if not critical

## 📝 Detailed Fixes

### Fix 1: Install bcrypt

```bash
cd /Users/khiwn/nt-poc/nt-poc/services/backend
npm install bcrypt --save-dev
```

### Fix 2: Remove Example Test

```bash
rm /Users/khiwn/nt-poc/nt-poc/services/backend/src/test/factories.example.test.ts
```

### Fix 3: Create Test Database Setup

Create `services/backend/vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
    // Separate integration and unit tests
    include: ['src/**/*.{test,spec}.ts'],
    exclude: ['node_modules', 'dist'],
  },
});
```

Create `services/backend/src/test/setup.ts`:
```typescript
import { beforeAll, afterAll, beforeEach } from 'vitest';
import db from '../config/database';

// Set test environment
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 
  'postgresql://postgres:password@localhost:5432/bms_test';

beforeAll(async () => {
  // Run migrations for test database
  await db.migrate.latest();
});

afterAll(async () => {
  // Clean up
  await db.destroy();
});

beforeEach(async () => {
  // Clean database before each test
  // Or use transactions and rollback
});
```

### Fix 4: Health Route Test

Update `src/routes/__tests__/health.test.ts`:
```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import healthRouter from '../health'; // Adjust import path

describe('Health API Integration Tests', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use('/api/health', healthRouter); // Register route
  });

  it('should return health status', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
  });
});
```

### Fix 5: Redis Cache Test Mocking

Update `src/services/__tests__/reportCache.test.ts`:
```typescript
import { vi, describe, it, expect, beforeEach } from 'vitest';

describe('reportCache', () => {
  let mockRedisClient: any;

  beforeEach(() => {
    mockRedisClient = {
      connect: vi.fn().mockResolvedValue(undefined),
      get: vi.fn(),
      set: vi.fn(),
      scan: vi.fn(),
      del: vi.fn(),
    };

    // Mock getRedisClient
    vi.mock('../redis', () => ({
      getRedisClient: vi.fn(() => mockRedisClient),
    }));
  });

  it('should get cached value', async () => {
    mockRedisClient.get.mockResolvedValue('{"data":"test"}');
    // Test logic...
  });
});
```

## 🚀 Execution Plan

### Step 1: Quick Fixes (15 minutes)
```bash
cd /Users/khiwn/nt-poc/nt-poc/services/backend

# Install missing dependency
npm install bcrypt --save-dev

# Remove problematic example test
rm src/test/factories.example.test.ts

# Run tests again
npm test -- --reporter=verbose 2>&1 | tee test-results.txt
```

### Step 2: Database Setup (30 minutes)
```bash
# Create test database
createdb bms_test

# Create test environment file
cat > .env.test << 'EOF'
NODE_ENV=test
DATABASE_URL=postgresql://postgres:password@localhost:5432/bms_test
REDIS_DISABLED=true
EOF

# Run migrations on test database
DATABASE_URL=postgresql://postgres:password@localhost:5432/bms_test npm run migrate
```

### Step 3: Fix Mocking Issues (1-2 hours)
- Update Redis cache tests
- Fix weather service tests
- Fix job initialization tests

### Step 4: Verify (15 minutes)
```bash
npm test
```

## 📊 Expected Results After Fixes

| Phase | Tests Fixed | Success Rate |
|-------|-------------|--------------|
| Before | 278 / 522 | 53% |
| After Phase 1 | ~290 / 522 | ~56% |
| After Phase 2 | ~350 / 522 | ~67% |
| After Phase 3 | ~400 / 522 | ~77% |
| After Phase 4 | ~407 / 522 | ~78% |
| Target | 500+ / 522 | 95%+ |

## 🔧 Alternative: Mock Everything (Faster, Less Reliable)

If you want tests to pass quickly without setting up infrastructure:

```typescript
// services/backend/src/test/mocks.ts
import { vi } from 'vitest';

// Mock database
vi.mock('../config/database', () => ({
  default: {
    select: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    insert: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockResolvedValue(1),
    delete: vi.fn().mockResolvedValue(1),
  }
}));

// Mock Redis
vi.mock('../config/redis', () => ({
  getRedisClient: vi.fn(() => null),
}));
```

## 🎯 Recommendation

**For Production-Quality Tests:**
1. Set up test database (Phase 2)
2. Fix quick wins first (Phase 1)
3. Fix mocking issues (Phase 3)
4. Achieve 95%+ pass rate

**For Quick Pass:**
1. Install bcrypt
2. Remove example test
3. Mock database and Redis globally
4. Achieve ~80% pass rate

## 📞 Next Steps

1. ✅ Review this plan
2. ⏳ Choose approach (production-quality vs quick)
3. ⏳ Execute Phase 1 fixes
4. ⏳ Set up test database OR mock everything
5. ⏳ Run tests and verify improvements
6. ⏳ Iterate on remaining failures

---

**Status:** Analysis Complete
**Immediate Action:** Install bcrypt and remove example test
**Recommended:** Set up test database for reliable tests
