# Frontend Migration Plan

**Source**: Facility 3D Manager New UI (3)  
**Target**: services/frontend/src/  
**Date**: 2026-01-12

---

## Migration Strategy

### Phase 1: Backup Current State ✅
- Already created backup branch: `backup-before-new-ui-integration`

### Phase 2: Copy New Files
1. **App.tsx**: Replace main App component with new routing
2. **Components**: Merge new components with existing ones
3. **Types**: Merge type definitions
4. **Constants**: Merge constants
5. **Services**: Add new services (Gemini, Weather)
6. **Stores**: Create new Zustand stores

### Phase 3: Update Configuration
1. **package.json**: Merge dependencies
2. **vite.config.ts**: Update Vite config
3. **tsconfig.json**: Update TypeScript config
4. **index.html**: Update HTML template

### Phase 4: Integration
1. Update routing in App.tsx
2. Connect stores to components
3. Update API endpoints
4. Test all components

---

## Files to Migrate

### Core Files (Replace)
- [ ] App.tsx (new routing structure)
- [ ] index.html (updated meta tags)
- [ ] vite.config.ts (updated config)

### Type Definitions (Merge)
- [ ] types.ts → types/
- [ ] constants.ts (merge with existing)

### Components (Add New)
From components/ directory:
- [ ] Dashboard/
- [ ] Chat/
- [ ] Reports/
- [ ] Map/ (Leaflet-based)
- [ ] Maintenance/
- [ ] Assets/
- [ ] Inventory/
- [ ] Leases/
- [ ] Settings/
- [ ] Auth/
- [ ] ui/ (CommandPalette, Card, Modal, etc.)

### Services (Add New)
- [ ] services/geminiService.ts
- [ ] services/weatherService.ts

### Stores (Create New)
- [ ] stores/assetStore.ts
- [ ] stores/leaseStore.ts
- [ ] stores/inventoryStore.ts
- [ ] stores/maintenanceStore.ts

---

## Dependencies to Add

Already added:
- ✅ @google/genai
- ✅ maath
- ✅ leaflet
- ✅ react-leaflet

Still needed:
- [ ] @types/leaflet
- [ ] Check for other missing deps

---

## Migration Steps

### Step 1: Update App.tsx with New Routing
- Replace old routing with new structure
- Add new routes for all features
- Maintain existing 3D scene routes

### Step 2: Merge Type Definitions
- Copy types.ts content to types/index.ts
- Resolve any conflicts
- Export all types properly

### Step 3: Update Constants
- Merge constants.ts with existing
- Keep both old and new constants
- Remove duplicates

### Step 4: Copy All Components
- Already done in previous integration
- Verify all components are present

### Step 5: Create Zustand Stores
- Asset management store
- Lease management store
- Inventory management store
- Maintenance scheduling store

### Step 6: Update index.html
- Copy meta tags
- Update title
- Add any new scripts

### Step 7: Update Vite Config
- Merge configurations
- Ensure all plugins are included

### Step 8: Test Everything
- Build project
- Test routing
- Test all components
- Fix any TypeScript errors

---

## Expected Issues

1. **Type Conflicts**: Old and new types may conflict
2. **Component Name Collisions**: Some components may have same names
3. **State Management**: Need to connect Zustand stores properly
4. **API Endpoints**: Need to update API calls
5. **Styling**: May need to merge CSS/Tailwind configs

---

## Rollback Plan

If anything goes wrong:
```bash
git checkout backup-before-new-ui-integration
```

---

## Progress Tracking

- [ ] Phase 1: Backup (Already done ✅)
- [ ] Phase 2: Copy files
- [ ] Phase 3: Update configuration
- [ ] Phase 4: Integration & testing
- [ ] Phase 5: Deploy & verify
