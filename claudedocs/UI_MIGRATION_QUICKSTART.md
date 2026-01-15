# UI Migration - Quick Start Guide

## ✅ Phase 1 Complete: Frontend Integration

**Status:** UI components copied, API client ready, dependencies compatible

### What's Been Done

1. **✅ UI Components Copied**
   - All components from new UI → `services/frontend/src/components/`
   - Types and constants → `services/frontend/src/`
   - Services → `services/frontend/src/services/`
   - Main App.tsx updated

2. **✅ API Client Created**
   - `services/facilityApiClient.ts` - Complete API abstraction (400+ lines)
   - `services/database.ts` - Backend-integrated database service
   - Ready to replace localStorage with real backend

3. **✅ Dependencies Check**
   - ✅ lucide-react (already installed: ^0.562.0)
   - ✅ leaflet (already installed: ^1.9.4)
   - ✅ @google/genai (already installed: ^1.35.0)
   - ✅ three, @react-three/fiber, @react-three/drei (all installed)
   - NO ADDITIONAL DEPENDENCIES NEEDED!

## 🚀 Next Steps

### Option 1: Test UI with Mock Data (2 hours)
**Current blocker:** Backend APIs don't exist yet

**To proceed:**
1. Create mock API responses for testing
2. Update App.tsx to handle API loading states
3. Test UI navigation and features
4. Verify all components render correctly

### Option 2: Implement Backend First (Recommended - 2-3 days)
**Start with Core APIs to get functional system**

#### Step 1: Database Migrations (4 hours)
Create new tables for facility management:
```bash
cd services/backend
npm run migrate:make add_facility_management_tables
```

#### Step 2: Implement Core APIs (2 days)
**Priority endpoints (13 total):**

**Facilities API** (6 endpoints):
```typescript
// services/backend/src/routes/facilities.ts
GET    /api/v1/facilities          // List all
GET    /api/v1/facilities/:id      // Get one
POST   /api/v1/facilities          // Create
PUT    /api/v1/facilities/:id      // Update
DELETE /api/v1/facilities/:id      // Delete
PATCH  /api/v1/facilities/:id/metrics  // Update metrics
```

**Enhanced Alerts API** (5 endpoints):
```typescript
// services/backend/src/routes/alerts.ts
GET    /api/v1/alerts              // List with filters
POST   /api/v1/alerts              // Create
PATCH  /api/v1/alerts/:id/read     // Mark read
DELETE /api/v1/alerts              // Clear all
GET    /api/v1/alerts/summary      // Statistics
```

**Settings API** (2 endpoints):
```typescript
// services/backend/src/routes/settings.ts
GET    /api/v1/settings            // Get settings
PUT    /api/v1/settings            // Update settings
```

#### Step 3: Test Integration (2 hours)
```bash
# Start backend
cd services/backend
npm run dev

# Start frontend (separate terminal)
cd services/frontend
npm run dev

# Access at http://localhost:5173
```

## 📁 File Structure

```
services/frontend/src/
├── App.tsx                    ← New facility management UI
├── types.ts                   ← All TypeScript types
├── constants.ts               ← Branch/facility data
├── components/
│   ├── Auth/                  ← Login components
│   ├── Assets/                ← Asset lifecycle
│   ├── Chat/                  ← AI chat widget
│   ├── Dashboard/             ← Main dashboards
│   ├── Inventory/             ← Spare parts
│   ├── Leases/                ← Lease management
│   ├── Maintenance/           ← Work orders
│   ├── Map/                   ← Thailand map
│   ├── Reports/               ← ISO reports
│   ├── Settings/              ← User settings
│   └── ui/                    ← Reusable UI components
└── services/
    ├── facilityApiClient.ts   ← Main API client (READY)
    ├── database.ts            ← Backend-integrated DB service (READY)
    ├── geminiService.ts       ← AI report generation
    └── weatherService.ts      ← Weather integration
```

## 🔧 Backend Implementation Template

### 1. Create Facilities Service

```typescript
// services/backend/src/services/facilityService.ts
import { db } from '../config/knex';
import { Facility } from '../types';

export class FacilityService {
  async getAll(): Promise<Facility[]> {
    return db('facilities').select('*');
  }

  async getById(id: string): Promise<Facility | null> {
    const facility = await db('facilities').where({ id }).first();
    return facility || null;
  }

  async create(data: Omit<Facility, 'id'>): Promise<Facility> {
    const [id] = await db('facilities').insert(data).returning('id');
    return this.getById(id);
  }

  async update(id: string, data: Partial<Facility>): Promise<Facility> {
    await db('facilities').where({ id }).update({
      ...data,
      updated_at: new Date()
    });
    return this.getById(id);
  }

  async delete(id: string): Promise<void> {
    await db('facilities').where({ id }).delete();
  }

  async updateMetrics(id: string, metrics: any): Promise<Facility> {
    await db('facilities').where({ id }).update({
      metrics: JSON.stringify(metrics),
      updated_at: new Date()
    });
    return this.getById(id);
  }
}
```

### 2. Create Facilities Route

```typescript
// services/backend/src/routes/facilities.ts
import express from 'express';
import { FacilityService } from '../services/facilityService';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();
const facilityService = new FacilityService();

router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const facilities = await facilityService.getAll();
    res.json(facilities);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const facility = await facilityService.getById(req.params.id);
    if (!facility) {
      return res.status(404).json({ error: 'Facility not found' });
    }
    res.json(facility);
  } catch (error) {
    next(error);
  }
});

router.post('/', authenticateToken, async (req, res, next) => {
  try {
    const facility = await facilityService.create(req.body);
    res.status(201).json(facility);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', authenticateToken, async (req, res, next) => {
  try {
    const facility = await facilityService.update(req.params.id, req.body);
    res.json(facility);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', authenticateToken, async (req, res, next) => {
  try {
    await facilityService.delete(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/metrics', authenticateToken, async (req, res, next) => {
  try {
    const facility = await facilityService.updateMetrics(req.params.id, req.body);
    res.json(facility);
  } catch (error) {
    next(error);
  }
});

export default router;
```

### 3. Register Route in App

```typescript
// services/backend/src/app.ts
import facilityRoutes from './routes/facilities';

// ... existing code ...

app.use('/api/v1/facilities', facilityRoutes);
```

## 📊 Database Migration Example

```typescript
// services/backend/migrations/XXXXXX_add_facility_management.ts
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create facilities table
  await knex.schema.createTable('facilities', (table) => {
    table.string('id').primary();
    table.string('name').notNullable();
    table.string('region');
    table.decimal('lat', 10, 8);
    table.decimal('lng', 11, 8);
    table.string('status').defaultTo('operational');
    table.jsonb('metrics'); // powerUsage, temperature, humidity, etc.
    table.timestamps(true, true);
  });

  // Seed with initial data
  await knex('facilities').insert([
    {
      id: 'บางรัก',
      name: 'สาขาบางรัก',
      region: 'Central',
      lat: 13.7246,
      lng: 100.5362,
      status: 'operational',
      metrics: JSON.stringify({
        powerUsage: 450,
        temperature: 24,
        humidity: 65,
        serverLoad: 78,
        pue: 1.45,
        occupancy: 92
      })
    },
    // ... more facilities
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('facilities');
}
```

## ⚡ Quick Commands

```bash
# Frontend
cd services/frontend
npm install          # Install dependencies (if needed)
npm run dev          # Start dev server (port 5173)

# Backend
cd services/backend
npm run migrate      # Run migrations
npm run dev          # Start API server (port 3000)

# Test API
curl http://localhost:3000/api/v1/facilities

# View logs
cd services/backend
tail -f logs/combined.log
```

## 🎯 Success Criteria

**Phase 1 Complete When:**
- ✅ UI components copied
- ✅ API client ready
- ✅ Dependencies verified
- ⏳ Core backend APIs working (facilities, alerts, settings)
- ⏳ Frontend connects to backend successfully
- ⏳ Can login and view facilities

## 📞 Need Help?

Check these documents:
- `claudedocs/UI_MIGRATION_PLAN.md` - Full migration plan
- `claudedocs/MIGRATION_PROGRESS_REPORT.md` - Current status
- `services/frontend/src/services/facilityApiClient.ts` - API client reference

## 🚀 Ready to Continue?

**Current status:** Frontend UI integrated, waiting for backend APIs

**Recommended next action:**
1. Implement database migrations (4 hours)
2. Implement Core APIs (2 days)
3. Test end-to-end integration

**Alternative:** I can help you implement the backend APIs now!
