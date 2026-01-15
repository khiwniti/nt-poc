# NT Facility 3D Manager - UI Migration Plan

**Date:** 2025-01-14
**Source:** https://github.com/khiwniti/NT-Facility-3D-Manager-New-UI.git
**Target:** NT-POC Battery Management System → Comprehensive Facility Management System

## Executive Summary

This migration transforms the current battery-focused system into a comprehensive facility management platform. The new UI includes lease management, work orders, asset lifecycle, predictive maintenance, and inventory management.

## Architecture Analysis

### Current System
- **Focus:** Battery/Energy Management with ML predictions
- **Backend:** PostgreSQL/TimescaleDB with real-time sensor data
- **Frontend:** React + Vite with 3D battery visualization
- **API:** RESTful endpoints for battery systems, alerts, predictions

### New UI System
- **Focus:** Comprehensive Facility Management
- **Data Storage:** LocalStorage with mock seed data (prototype)
- **Frontend:** React + Vite with Thailand map, 3D facility views
- **Features:** Leases, Work Orders, Assets, Inventory, ISO Reports

## Migration Strategy

### Phase 1: Frontend Integration (Priority: HIGH)
**Duration:** 4-6 hours
**Tasks:**
1. Backup current frontend
2. Copy new UI components to `services/frontend/src`
3. Merge dependencies (package.json)
4. Create API abstraction layer (replace localStorage)
5. Update routing and navigation
6. Test UI with mock data

**Deliverables:**
- New UI running locally
- API client stubs ready
- Documentation of required endpoints

### Phase 2: Database Schema Migration (Priority: HIGH)
**Duration:** 4-6 hours
**Tasks:**
1. Design new database tables
2. Create Knex migrations
3. Preserve existing battery/sensor tables
4. Add facility management tables

**New Tables:**
```sql
-- Facilities (enhanced from existing)
facilities (id, name, region, lat, lng, metrics_json, status)

-- Lease Management
lease_contracts (id, facility_id, tenant_name, unit_number, ...)

-- Work Orders
work_orders (id, facility_id, asset_id, priority, status, type, ...)

-- Asset Lifecycle
assets (id, facility_id, name, category, install_date, condition, ...)
predictive_assets (id, asset_id, health_score, telemetry_json, ...)

-- Inventory
spare_parts (id, sku, category, stock_levels, supplier_id, ...)
suppliers (id, name, contact_info, rating, ...)
purchase_orders (id, supplier_id, items_json, total_amount, status, ...)

-- Reports
reports (id, title, standard, classification, author, blocks_json, ...)

-- Settings
user_settings (user_id, theme, notifications_json, ...)
```

### Phase 3: Core Backend APIs (Priority: HIGH)
**Duration:** 2-3 days
**Implementation Order:**

#### 3.1 Facilities API (replaces/enhances existing)
```
GET    /api/v1/facilities          - List all facilities
GET    /api/v1/facilities/:id      - Get facility details
POST   /api/v1/facilities          - Create facility
PUT    /api/v1/facilities/:id      - Update facility
DELETE /api/v1/facilities/:id      - Delete facility
PATCH  /api/v1/facilities/:id/metrics - Update real-time metrics
```

#### 3.2 Enhanced Alerts API
```
GET    /api/v1/alerts              - List alerts (with filters)
POST   /api/v1/alerts              - Create alert
PATCH  /api/v1/alerts/:id/read     - Mark as read
DELETE /api/v1/alerts              - Clear all read alerts
GET    /api/v1/alerts/summary      - Alert statistics
```

#### 3.3 Settings API
```
GET    /api/v1/settings            - Get user settings
PUT    /api/v1/settings            - Update settings
```

### Phase 4: Document Management (Priority: MEDIUM)
**Duration:** 1-2 days

#### 4.1 Reports API
```
GET    /api/v1/reports             - List reports
GET    /api/v1/reports/:id         - Get report
POST   /api/v1/reports             - Create report
PUT    /api/v1/reports/:id         - Update report
DELETE /api/v1/reports/:id         - Delete report
POST   /api/v1/reports/generate    - AI-generate report from alert
```

**Integration:** Connect to existing Gemini service for report generation

### Phase 5: Operational Management (Priority: MEDIUM)
**Duration:** 2-3 days

#### 5.1 Lease Management API
```
GET    /api/v1/leases              - List leases
GET    /api/v1/leases/:id          - Get lease
POST   /api/v1/leases              - Create lease
PUT    /api/v1/leases/:id          - Update lease
DELETE /api/v1/leases/:id          - Delete lease
GET    /api/v1/leases/expiring     - Get expiring leases
```

#### 5.2 Work Orders API
```
GET    /api/v1/work-orders         - List work orders
GET    /api/v1/work-orders/:id     - Get work order
POST   /api/v1/work-orders         - Create work order
PUT    /api/v1/work-orders/:id     - Update work order
PATCH  /api/v1/work-orders/:id/status - Update status
DELETE /api/v1/work-orders/:id     - Delete work order
```

#### 5.3 Asset Lifecycle API
```
GET    /api/v1/assets              - List assets
GET    /api/v1/assets/:id          - Get asset
POST   /api/v1/assets              - Create asset
PUT    /api/v1/assets/:id          - Update asset
DELETE /api/v1/assets/:id          - Delete asset
GET    /api/v1/assets/risk-report  - Risk assessment report
```

#### 5.4 Predictive Maintenance API (integrate existing ML)
```
GET    /api/v1/predictive-assets   - List predictive assets
GET    /api/v1/predictive-assets/:id - Get asset with predictions
POST   /api/v1/predictive-assets/:id/analyze - Trigger ML analysis
```

**Integration:** Connect to existing MLOps service (already running)

### Phase 6: Inventory Management (Priority: LOW)
**Duration:** 1-2 days

#### 6.1 Spare Parts API
```
GET    /api/v1/spare-parts         - List parts
GET    /api/v1/spare-parts/:id     - Get part
POST   /api/v1/spare-parts         - Create part
PUT    /api/v1/spare-parts/:id     - Update part
DELETE /api/v1/spare-parts/:id     - Delete part
GET    /api/v1/spare-parts/low-stock - Low stock alerts
```

#### 6.2 Suppliers API
```
GET    /api/v1/suppliers           - List suppliers
GET    /api/v1/suppliers/:id       - Get supplier
POST   /api/v1/suppliers           - Create supplier
PUT    /api/v1/suppliers/:id       - Update supplier
DELETE /api/v1/suppliers/:id       - Delete supplier
```

#### 6.3 Purchase Orders API
```
GET    /api/v1/purchase-orders     - List POs
GET    /api/v1/purchase-orders/:id - Get PO
POST   /api/v1/purchase-orders     - Create PO
PUT    /api/v1/purchase-orders/:id - Update PO
PATCH  /api/v1/purchase-orders/:id/status - Update status
```

## Technical Decisions

### 1. Data Migration Strategy
- Keep existing `battery_systems` and `sensor_readings` tables
- Add new facility management tables
- Create views to present unified facility data
- Gradual migration of battery systems to asset tracking

### 2. API Compatibility
- Maintain existing battery/sensor endpoints
- Add new facility management endpoints under `/api/v1/`
- Use same authentication middleware
- Consistent error handling and response formats

### 3. Frontend Architecture
- Preserve existing 3D battery visualization
- Integrate as "Battery Systems" module in new UI
- Use React Router for view management
- Shared component library (lucide-react icons)

### 4. ML Integration
- Connect predictive maintenance to existing RUL model
- Adapt asset health scoring to use LSTM predictions
- Maintain MLOps service as prediction engine
- Add asset-specific feature engineering

## Dependencies Update

### New Dependencies to Add
```json
{
  "lucide-react": "^0.294.0",
  "leaflet": "^1.9.4",
  "@google/genai": "^1.34.0"
}
```

### Potential Conflicts
- Current: Mapbox GL → New: Leaflet (keep both, use context-appropriate)
- Icons: Need to migrate from current icon library to lucide-react

## Risk Assessment

### High Risk
1. **Database Schema Changes** - Requires careful migration
   - Mitigation: Comprehensive backup, rollback plan

2. **Breaking Current Functionality** - Battery management disruption
   - Mitigation: Parallel development, feature flags

### Medium Risk
1. **Performance Impact** - Larger dataset with facility management
   - Mitigation: Proper indexing, query optimization

2. **API Complexity** - Many new endpoints
   - Mitigation: Systematic testing, API documentation

### Low Risk
1. **UI Integration** - Well-structured component architecture
2. **Dependency Conflicts** - Minor version differences

## Testing Strategy

### Phase-wise Testing
1. **Phase 1:** UI rendering, navigation, mock data
2. **Phase 2:** Database migrations, data integrity
3. **Phase 3:** API endpoints, authentication, validation
4. **Phase 4:** Report generation, Gemini integration
5. **Phase 5:** CRUD operations, business logic
6. **Phase 6:** Inventory workflows, PO lifecycle

### Test Coverage Goals
- Unit Tests: >80% for new backend services
- Integration Tests: All API endpoints
- E2E Tests: Critical user journeys
- Performance Tests: API response times <200ms

## Rollout Plan

### Stage 1: Development (Current)
- Implement on local development environment
- Test all features thoroughly
- Performance optimization

### Stage 2: Staging
- Deploy to staging environment
- User acceptance testing
- Load testing

### Stage 3: Production
- Feature flag deployment
- Gradual rollout (10%, 50%, 100%)
- Monitor metrics and errors
- Rollback plan ready

## Timeline Summary

| Phase | Duration | Priority | Status |
|-------|----------|----------|--------|
| Phase 1: Frontend Integration | 4-6 hours | HIGH | Pending |
| Phase 2: Database Migration | 4-6 hours | HIGH | Pending |
| Phase 3: Core APIs | 2-3 days | HIGH | Pending |
| Phase 4: Document Mgmt | 1-2 days | MEDIUM | Pending |
| Phase 5: Operations | 2-3 days | MEDIUM | Pending |
| Phase 6: Inventory | 1-2 days | LOW | Pending |

**Total Estimated Time:** 7-10 working days

## Success Criteria

✅ New UI fully functional with all views
✅ All localStorage replaced with backend APIs
✅ Existing battery management preserved
✅ Database migrations successful
✅ All new APIs tested and documented
✅ Performance meets SLAs (<200ms response)
✅ User acceptance testing passed
✅ Production deployment successful

## Next Actions

1. ✅ Analysis complete
2. ⏳ **START HERE:** Begin Phase 1 - Frontend Integration
3. Create API client abstraction layer
4. Copy UI components
5. Update dependencies
6. Test UI with mock data

---

**Document Owner:** Claude AI Assistant
**Last Updated:** 2025-01-14 21:15 ICT
**Status:** Ready for Implementation
