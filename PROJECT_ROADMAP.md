# Enterprise Facility Manager - Project Roadmap

**Branch**: 001-enterprise-facility-manager  
**Date Started**: 2026-01-12  
**Last Updated**: 2026-01-12  
**Status**: Phase 2 - Initial Integration Complete ✅

## Project Overview

Transform the NT-POC Battery Management System into a production-ready, enterprise-grade microservices-based 3D facility management system with:
- **5 Microservices**: Frontend, Backend, MLOps, Database, Simulator
- **100+ Facilities**: Real-time monitoring with 2-second latency
- **AI-Powered**: Gemini chat, RUL prediction, intelligent alerts
- **ISO Compliant**: 27001/22301/50001 reporting
- **LINE Integration**: Notifications and chatbot
- **3D Visualization**: 30+ FPS interactive zones

## Current Progress: 15/235 Tasks (6.4%)

### ✅ Completed (3/15 major phases)
1. **New UI Analysis** - Analyzed AI Studio generated UI
2. **UI Integration** - Copied 28 components to frontend
3. **Monorepo Setup** - Services directory structure exists

### 🔄 In Progress (1/15 major phases)
4. **Database Infrastructure** - PostgreSQL + TimescaleDB setup

### 📋 Upcoming (11/15 major phases)
5-15. Authentication, Monitoring, Foundational Services, 6 User Stories, Testing

---

## Phase Breakdown (235 Tasks Total)

### Phase 1: Setup & Infrastructure (25 tasks)
**Status**: 40% complete

#### Completed ✅
- [x] T001 Monorepo structure (`services/` exists)
- [x] T002 Frontend service (React 18 + Vite initialized)
- [x] T003 Backend service (Node.js + Express initialized)
- [x] T004 MLOps service (Python + FastAPI initialized)
- [x] T005 Simulator service (Python initialized)
- [x] New UI components integrated (28 components)
- [x] Dependencies installed (@google/genai, maath, leaflet)

#### In Progress 🔄
- [ ] T006 Docker Compose for local development
- [ ] T007 Railway configuration (railway.toml)
- [ ] T008 PostgreSQL + TimescaleDB setup
- [ ] T009-T017 Database migrations (7 migrations)
- [ ] T018-T021 Authentication & security
- [ ] T022-T025 Monitoring & health checks

**Blockers**: None  
**ETA**: 3-4 days

---

### Phase 2: Foundational Services (20 tasks)
**Status**: 0% complete

#### Backend Core (T026-T034)
- [ ] Database connection pool
- [ ] Models: Facility, Zone, Sensor, Region, User
- [ ] Services: FacilityService, ZoneService, SensorService

#### Frontend Core (T035-T041)
- [ ] React Router setup
- [ ] Zustand stores: facility, sensor, ui, auth
- [ ] NEW: report, chat, maintenance, asset stores
- [ ] API client with Axios

#### Simulator Core (T042-T045)
- [ ] Sensor data generation
- [ ] SSE stream endpoint
- [ ] Normal baseline scenario
- [ ] Backend ↔ Simulator integration

**Blockers**: Phase 1 completion  
**ETA**: 4-5 days

---

### Phase 3: US1 - Real-Time Monitoring (35 tasks)
**Status**: 10% prepared (GlobalOverview component ready)

#### Backend API (T046-T053)
- [ ] GET /facilities, POST /facilities
- [ ] GET /facilities/:id, PATCH /facilities/:id
- [ ] GET /facilities/:facilityId/zones
- [ ] GET /sensors with filtering
- [ ] GET /sensors/:id/readings (TimescaleDB)
- [ ] Aggregation queries (hourly, daily)

#### Real-Time Streaming (T054-T058)
- [ ] SensorReading model
- [ ] SSE endpoint /facilities/:id/stream
- [ ] Redis pub/sub for SSE
- [ ] Event publishing

#### Frontend Dashboard (T059-T070)
**Component Status**:
- ✅ GlobalOverview.tsx (NEW - ready to integrate)
- ✅ FacilityPanel.tsx (NEW - ready to integrate)
- ✅ IntelligenceHub.tsx (NEW - ready to integrate)
- [ ] Connect to backend API
- [ ] Add SSE client
- [ ] Implement facilityStore
- [ ] Add loading states

**Blockers**: Backend API + SSE implementation  
**ETA**: 7-8 days

---

### Phase 4: US2 - 3D Visualization (20 tasks)
**Status**: 50% prepared (Battery3DView, Mall3DView components ready)

#### Frontend 3D (T083-T098)
**Component Status**:
- ✅ Battery3DView.tsx (NEW - needs performance optimization)
- ✅ Mall3DView.tsx (NEW - needs performance optimization)
- ⚠️ OLD Battery3DView exists (need to merge/replace)
- [ ] Add React.memo optimization
- [ ] Implement InstancedMesh geometry
- [ ] Add progressive loading
- [ ] Performance monitoring

**Blockers**: Phase 3 completion  
**ETA**: 5 days

---

### Phase 5: US3 - Alert Management (25 tasks)
**Status**: 30% prepared (AlertSystem component ready)

#### Backend Alerts (T107-T112)
- [ ] Alert model with notifications
- [ ] GET /alerts, POST /alerts
- [ ] PATCH /alerts/:id/status
- [ ] Notification service
- [ ] SSE alert events

#### LINE Integration (T113-T123)
- [ ] LINE OA setup
- [ ] Webhook endpoint
- [ ] Message handlers
- [ ] Rate limiting

#### Frontend Alerts (T124-T130)
**Component Status**:
- ✅ AlertSystem.tsx (NEW - ready to integrate)
- [ ] Connect to alertStore
- [ ] Add real-time updates
- [ ] Sound notifications

**Blockers**: Phase 3 completion  
**ETA**: 6-7 days

---

### Phase 6: US4 - AI Integration (20 tasks)
**Status**: 40% prepared (AIChatWidget, geminiService ready)

#### Backend Chat (T131-T140)
- [ ] ChatSession, ChatMessage models
- [ ] POST /chat/sessions, POST /chat/sessions/:id/messages
- [ ] Gemini API proxy
- [ ] Conversation persistence

#### Frontend Chat (T141-T150)
**Component Status**:
- ✅ AIChatWidget.tsx (NEW - ready to integrate)
- ✅ GenerativeComponents.tsx (NEW)
- ✅ geminiService.ts (NEW)
- [ ] Connect to chatStore
- [ ] Add conversation history
- [ ] Markdown rendering

**Blockers**: Backend chat API  
**ETA**: 5 days

---

### Phase 7: US4 - MLOps Pipeline (30 tasks)
**Status**: 0% complete

#### ML Model (T151-T170)
- [ ] Data preprocessing
- [ ] LSTM RUL model
- [ ] Model training pipeline
- [ ] MLflow tracking
- [ ] Model evaluation

#### MLOps Service (T171-T182)
- [ ] POST /predict/rul endpoint
- [ ] Model registry
- [ ] Model serving
- [ ] Monitoring

**Component Status**:
- ✅ PredictiveMaintenance.tsx (NEW - ready for RUL integration)

**Blockers**: Database + sensor data ready  
**ETA**: 10-12 days

---

### Phase 8: US5 - Reporting (20 tasks)
**Status**: 50% prepared (ReportManager, ReportEditor ready)

#### Backend Reports (T183-T193)
- [ ] Report, ReportBlock models
- [ ] GET /reports, POST /reports
- [ ] PATCH /reports/:id
- [ ] ISO standards (27001/22301/50001)
- [ ] Version control
- [ ] PDF export
- [ ] Audit logging

#### Frontend Reports (T194-T202)
**Component Status**:
- ✅ ReportManager.tsx (NEW - ready to integrate)
- ✅ ReportEditor.tsx (NEW - block-based editor ready)
- [ ] Create reportStore
- [ ] Connect to backend API
- [ ] Auto-save functionality
- [ ] Version history viewer

**Blockers**: Backend report API  
**ETA**: 5-6 days

---

### Phase 9: US6 - Geospatial View (15 tasks)
**Status**: 60% prepared (ThailandMap component ready)

#### Backend Map (T203-T204)
- [ ] Add GPS coordinates to Facility
- [ ] GET /facilities/map aggregation

#### Frontend Map (T205-T215)
**Component Status**:
- ✅ ThailandMap.tsx (NEW - Leaflet-based)
- ✅ MapMarker.tsx (NEW)
- ⚠️ FacilityMap.tsx (OLD - Mapbox-based, need to decide)
- [ ] Facility markers with color-coding
- [ ] Marker clustering
- [ ] Region filtering
- [ ] Real-time updates

**Blockers**: Backend facility API  
**ETA**: 4 days

---

### Phase 10: Testing & Polish (25 tasks)
**Status**: 0% complete

#### Testing (T216-T226)
- [ ] Backend unit tests (Vitest)
- [ ] Backend integration tests
- [ ] Frontend component tests (RTL)
- [ ] SSE connection tests
- [ ] Contract tests (Pact)
- [ ] E2E tests (Playwright): dashboard, 3D, alerts, chat, reports, map

#### Performance (T227-T230)
- [ ] Bundle size optimization (<500KB)
- [ ] Code splitting
- [ ] Lazy loading (3D, Map)
- [ ] Web Vitals monitoring

#### Deployment (T231-T235)
- [ ] Deploy to Railway
- [ ] Database migrations on Railway
- [ ] Environment variables
- [ ] Sentry distributed tracing
- [ ] Create RUNBOOK.md

**Blockers**: All phases complete  
**ETA**: 7-8 days

---

## New UI Components Integrated (28 total)

### Priority 1: Core Features ✅ Ready
- **Dashboard**: GlobalOverview, FacilityPanel, IntelligenceHub
- **3D Views**: Battery3DView, Mall3DView
- **Map**: ThailandMap, MapMarker
- **Chat**: AIChatWidget, GenerativeComponents
- **Reports**: ReportManager, ReportEditor
- **UI**: CommandPalette, Card, Modal, AlertSystem

### Priority 2: Business Features ✅ Ready
- **Maintenance**: WorkOrderManager, PredictiveMaintenance
- **Assets**: AssetLifecycleManager
- **Inventory**: SparePartsManager
- **Leases**: LeaseManager
- **Utility**: UtilityCenter

### Priority 3: Infrastructure ✅ Ready
- **Auth**: LoginPage
- **Settings**: SettingsPage
- **Services**: geminiService, weatherService

---

## Immediate Next Steps (This Week)

### Today (Day 1)
1. ✅ ~~UI component integration~~ **COMPLETE**
2. **Database Setup** (T008-T017)
   - Set up PostgreSQL + TimescaleDB locally
   - Write 7 database migrations
   - Test migrations

3. **Type System Merge**
   - Merge `types/facility-new.ts` with existing types
   - Update imports in new components
   - Fix TypeScript errors

### Tomorrow (Day 2)
4. **Create New Zustand Stores**
   - `stores/reportStore.ts`
   - `stores/chatStore.ts`
   - `stores/maintenanceStore.ts`
   - `stores/assetStore.ts`

5. **Update App.tsx Routing**
   - Add routes for new views
   - Integrate CommandPalette
   - Add global AIChatWidget

### Day 3
6. **Backend API - Facilities**
   - Implement GET /facilities
   - Implement GET /facilities/:id
   - Implement GET /facilities/:id/zones

7. **Connect Dashboard to API**
   - Update GlobalOverview to use facilityStore
   - Add loading states
   - Test real-time updates

### Day 4-5
8. **SSE Implementation**
   - Backend: SSE endpoint
   - Frontend: SSE client hook
   - Test real-time sensor updates

9. **Authentication & Security**
   - JWT middleware
   - API key authentication
   - CORS policy

### Weekend
10. **Review & Test**
    - Run all tests
    - Fix bugs
    - Update documentation

---

## Dependencies Graph

```
Phase 1 (Setup) ──┬──> Phase 2 (Foundational) ──┬──> Phase 3 (US1) ──> Phase 5 (US3)
                  │                              │
                  │                              └──> Phase 4 (US2)
                  │
                  └──> Phase 6 (US4-Chat) ──┬──> Phase 8 (US5)
                                             │
                                             └──> Phase 9 (US6)
                  
Phase 7 (US4-MLOps) ─────────────────> (parallel with all)

All phases ──────────────────> Phase 10 (Testing & Polish)
```

---

## Technology Stack

### Frontend ✅ Setup Complete
- React 18.3.1
- TypeScript 5.8.2
- Vite 6.2+
- Three.js 0.165.0 + @react-three/fiber + @react-three/drei
- Zustand 4.5+ (state management)
- Dexie.js (IndexedDB)
- Leaflet 1.9.4 (maps)
- Lucide React (icons)
- @google/genai 1.34.0 (AI)

### Backend ⏳ Partially Setup
- Node.js 20+ with Express
- TypeScript
- PostgreSQL 15+ with TimescaleDB
- Redis (for SSE pub/sub)
- Knex.js (migrations)
- JWT authentication

### MLOps ⏳ Initialized
- Python 3.11+
- FastAPI
- MLflow 2.10+
- TensorFlow/PyTorch
- scikit-learn

### Simulator ⏳ Initialized
- Python 3.11+
- FastAPI
- NumPy/pandas

### Deployment 📋 Planned
- Railway (5 services)
- Docker (containerization)
- Sentry (error tracking)
- GitHub Actions (CI/CD)

---

## Risk Management

### High Risk 🔴
1. **3D Performance**: Battery3DView performance may degrade with many zones
   - **Mitigation**: React.memo, InstancedMesh, progressive loading
   
2. **Bundle Size**: Adding 28 components increases size
   - **Mitigation**: Code splitting, lazy loading, tree-shaking
   
3. **API Integration Complexity**: Mock data → Real API
   - **Mitigation**: Incremental migration, feature flags

### Medium Risk 🟡
1. **Type System Conflicts**: Merging type definitions
   - **Mitigation**: Careful review, type aliases
   
2. **Map Library Dual Usage**: Both Leaflet and Mapbox
   - **Mitigation**: Choose one, migrate components
   
3. **State Management**: Large Zustand store graph
   - **Mitigation**: Modular stores, clear boundaries

### Low Risk 🟢
1. **Component Integration**: Already completed successfully ✅
2. **Dependency Installation**: No conflicts found ✅
3. **Git Management**: Backup branch created ✅

---

## Success Metrics

### Functional ✅ / ⏳
- [ ] All 28 new components render
- [ ] All existing features work
- [ ] Real-time updates < 2s latency
- [ ] 3D rendering at 30+ FPS
- [ ] AI chat response < 5s
- [ ] ISO-compliant reports generate

### Performance 📊
- [ ] Bundle size < 500KB gzipped
- [ ] Initial load < 3s (3G)
- [ ] LCP < 2.5s
- [ ] INP < 200ms
- [ ] CLS < 0.1

### Quality ✅
- [ ] TypeScript strict mode passes
- [ ] Test coverage > 80%
- [ ] ESLint passes
- [ ] Accessibility score > 95
- [ ] No console errors

### Scale 📈
- [ ] 100 facilities monitored
- [ ] 1000 concurrent users
- [ ] 10,000 alerts/day
- [ ] 99.9% uptime

---

## Timeline Estimate

### Sprint 1 (Week 1-2): MVP Foundation
- Phase 1: Setup & Infrastructure
- Phase 2: Foundational Services
- Phase 3: US1 Real-Time Monitoring (partial)
- **Deliverable**: Working dashboard with real data

### Sprint 2 (Week 3-4): Core Features
- Phase 3: US1 Complete
- Phase 4: US2 3D Visualization
- Phase 5: US3 Alert Management (partial)
- **Deliverable**: 3D views + basic alerts

### Sprint 3 (Week 5-6): Intelligence Layer
- Phase 5: US3 Complete
- Phase 6: US4 AI Chat
- Phase 7: US4 MLOps (partial)
- **Deliverable**: AI chat + LINE integration

### Sprint 4 (Week 7-8): ML & Reporting
- Phase 7: US4 MLOps Complete
- Phase 8: US5 Reporting
- Phase 9: US6 Geospatial
- **Deliverable**: RUL prediction + ISO reports

### Sprint 5 (Week 9-10): Polish & Launch
- Phase 10: Testing & Polish
- Bug fixes
- Performance optimization
- Deployment to Railway
- **Deliverable**: Production-ready system

**Total Estimate**: 10 weeks (50 business days)

---

## Resources & Documentation

### Created Documents
- ✅ `INTEGRATION_PLAN.md` - Detailed integration strategy
- ✅ `UI_INTEGRATION_STATUS.md` - Current status and next steps
- ✅ `001-enterprise-facility-manager/plan.md` - Original project plan
- ✅ `001-enterprise-facility-manager/tasks.md` - 235 detailed tasks
- ✅ `001-enterprise-facility-manager/spec.md` - Technical specification
- ✅ `001-enterprise-facility-manager/data-model.md` - Database schema
- ✅ `001-enterprise-facility-manager/contracts/` - API contracts

### Key References
- Original UI: `Facility 3D Manager New UI (3)/`
- Frontend: `services/frontend/`
- Backend: `services/backend/`
- MLOps: `services/mlops/`
- Simulator: `services/simulator/`

---

## Team Notes

### For Frontend Developers
- New components in `services/frontend/src/components/`
- Need to update import paths from relative to absolute
- Create Zustand stores for: reports, chat, maintenance, assets
- Update App.tsx with new routes
- Test components with Vitest + RTL

### For Backend Developers
- Implement API contracts in `001-enterprise-facility-manager/contracts/`
- Write 7 database migrations (T009-T017)
- Set up SSE streaming for real-time updates
- Implement JWT authentication
- Add Gemini API proxy for chat

### For ML Engineers
- Set up MLflow server
- Implement RUL prediction LSTM model
- Create training pipeline
- Expose prediction API endpoint
- Monitor model drift

### For DevOps
- Configure Railway deployment (5 services)
- Set up PostgreSQL + TimescaleDB
- Configure Redis for SSE
- Set up Sentry monitoring
- Create CI/CD pipeline

---

## Contact & Support

**Branch**: `001-enterprise-facility-manager`  
**Backup Branch**: `backup-before-new-ui-integration`  
**Last Commit**: feat: Integrate new Facility 3D Manager UI  

**Questions?** Check:
1. `INTEGRATION_PLAN.md` - Integration details
2. `UI_INTEGRATION_STATUS.md` - Current status
3. `001-enterprise-facility-manager/tasks.md` - Task list

---

**Status**: Ready for Phase 4 - Database Setup  
**Next Session**: Set up PostgreSQL + TimescaleDB and write migrations  
**Blockers**: None  
**Progress**: 15/235 tasks (6.4%) - On track for 10-week delivery
