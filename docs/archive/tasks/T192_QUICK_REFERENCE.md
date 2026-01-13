# T192: Mapbox Integration - Quick Reference

## 🗺️ Quick Start

```bash
# Set Mapbox token
echo "VITE_MAPBOX_API_KEY=your-token" >> services/frontend/.env

# Install dependencies (already done)
cd services/frontend && npm install

# Run tests
npm test -- FacilityMap facilityHealth

# Run e2e tests
npm run test:e2e -- mapbox-integration
```

## 📦 Key Files

```
services/frontend/src/
├── components/
│   ├── FacilityMap.tsx          # Main Mapbox component
│   └── __tests__/
│       └── FacilityMap.test.tsx
├── utils/
│   ├── facilityHealth.ts        # Health calculation
│   └── __tests__/
│       └── facilityHealth.test.ts
└── pages/
    └── GeospatialView.tsx       # Uses FacilityMap
```

## 🎨 Health Status Colors

```typescript
healthy  → #10b981 (green)
warning  → #f59e0b (amber)
critical → #ef4444 (red)
```

## 🔧 Map Controls

- **Zoom**: + / - buttons or scroll
- **Fullscreen**: Fullscreen button (top-right)
- **Geolocate**: Location button (top-right)
- **Pan**: Click and drag
- **Cluster Expand**: Click cluster circle

## 📊 Health Criteria

```
Critical: SoH < 60% OR alerts > 5 OR status=inactive/offline
Warning:  SoH < 80% OR alerts > 2 OR status=maintenance
Healthy:  SoH ≥ 80% AND alerts ≤ 2 AND status=active
```

## 🧪 Testing Commands

```bash
# Unit tests only
npm test -- FacilityMap.test

# Health utils only
npm test -- facilityHealth.test

# E2E tests
npm run test:e2e -- mapbox-integration

# All tests with coverage
npm run test:coverage
```

## 🌐 API Integration

The map automatically fetches facility data from:
```
GET /api/facilities
Response: { id, name, location, latitude, longitude, status, ... }
```

To add health metrics, extend the facility API response with:
```json
{
  "averageSoH": 85,
  "averageSoC": 70,
  "activeAlerts": 2
}
```

## 🚀 Deployment Checklist

- [ ] Set `VITE_MAPBOX_API_KEY` in production env
- [ ] Test map loads correctly
- [ ] Verify markers display with correct colors
- [ ] Check clustering works at different zoom levels
- [ ] Test on mobile devices
- [ ] Validate fullscreen mode
- [ ] Ensure popups show complete info

## 🐛 Troubleshooting

**Map not showing?**
- Check `VITE_MAPBOX_API_KEY` is set
- Verify WebGL is supported in browser
- Check browser console for errors

**Markers wrong color?**
- Verify facility has `status`, `averageSoH`, `activeAlerts` fields
- Check `calculateFacilityHealth()` logic

**Clustering not working?**
- Zoom level must be < 14
- Multiple markers must be within 50px radius

## 📚 Related Docs

- `T209_GEOSPATIAL_README.md` - Original geospatial implementation
- `docs/GEOSPATIAL_API.md` - API documentation
- Mapbox Docs: https://docs.mapbox.com/mapbox-gl-js/

---

**Tests**: 21 unit + 10 e2e  
**Status**: ✅ Production Ready
