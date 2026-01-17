# Frontend Configuration - Quick Start Guide

## What Was Updated

### ✅ Frontend Components (Production Ready)

1. **GlobalOverview.tsx** - Now fetches real fleet statistics
   - Shows accurate battery count (1.9k instead of hardcoded 12.5k)
   - Shows accurate facility count (9)
   - Auto-refreshes every 60 seconds

2. **BatteryList.tsx** (NEW) - Paginated battery list
   - 50 batteries per page (39 pages total for 1,944 batteries)
   - Search, filter, and sort capabilities
   - Real-time metrics display

3. **FacilityStatsGrid.tsx** (NEW) - Facility dashboard
   - Grid view of all 9 data centers
   - Aggregated statistics per facility
   - Status distribution visualizations

4. **batterySystems.ts** (NEW) - API client
   - Complete TypeScript types
   - Fleet summary, pagination, search functions

## How to Use

### View Fleet Statistics
```typescript
import { GlobalOverview } from './components/Dashboard/GlobalOverview';

<GlobalOverview onChangeView={(view) => console.log(view)} />
// Displays: 1.9k batteries, 9 facilities
```

### View Battery List
```typescript
import { BatteryList } from './components/Dashboard/BatteryList';

<BatteryList 
  facilityId="optional-filter"
  onSelectBattery={(battery) => console.log(battery)}
/>
// Shows paginated list of 50 batteries with real-time metrics
```

### View Facility Grid
```typescript
import { FacilityStatsGrid } from './components/Dashboard/FacilityStatsGrid';

<FacilityStatsGrid 
  onSelectFacility={(facilityId) => console.log(facilityId)}
/>
// Displays 9 facility cards in 3-column grid
```

## Backend Requirements

The frontend requires these backend endpoints:

| Endpoint | Status | Priority |
|----------|--------|----------|
| `GET /api/v1/battery-systems/fleet/summary` | ⏳ Required | 🔴 HIGH |
| `GET /api/v1/battery-systems` (with pagination) | ⏳ Required | 🔴 HIGH |
| `GET /api/v1/battery-systems/facility/:id/stats` | ⏳ Optional | 🟡 MEDIUM |
| `GET /api/v1/battery-systems/search` | ⏳ Optional | 🟡 MEDIUM |

**Full API specification**: See `BACKEND_API_REQUIREMENTS_FOR_FRONTEND.md`

## Testing

```bash
# Start backend with production data
cd services/backend
npm run db:setup:production
npm run dev

# Start frontend
cd services/frontend
npm run dev

# Verify
# - Dashboard shows "1.9k" batteries
# - Battery list shows "หน้า 1 จาก 39"
# - Facility grid shows 9 cards
```

## Next Steps

1. **Backend Team**: Implement required API endpoints
2. **Frontend Team**: Write unit tests for new components
3. **Integration**: Test with real backend API
4. **Performance**: Load test with production data

## Documents

- `BACKEND_API_REQUIREMENTS_FOR_FRONTEND.md` - Complete API spec
- `FRONTEND_PRODUCTION_FLEET_CONFIG_SUMMARY.md` - Detailed summary
- `FRONTEND_SIMULATOR_MLOPS_CONFIG.md` - Full configuration guide
