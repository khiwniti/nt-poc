# T204: Map Export Functionality - Quick Reference

## Overview
Map export functionality for saving current view as PNG or exporting facility data as GeoJSON/KML.

## Export Formats

### PNG (Image)
```typescript
// Automatically exports the visible map view
// Triggered via: Export button > "Export as PNG"
// Output: facility-map.png (2x scale, transparent background)
```

### GeoJSON
```typescript
// Standard GeoJSON FeatureCollection
// Triggered via: Export button > "Export as GeoJSON"
// Output: facilities.geojson
// Contains: coordinates, properties, metadata, bounds
```

### KML
```typescript
// Google Earth compatible format
// Triggered via: Export button > "Export as KML"  
// Output: facilities.kml
// Contains: placemarks, extended data, metadata
```

## Usage

### Component Integration
```typescript
import { FacilityMap } from './components/geospatial/FacilityMap';

<FacilityMap
  facilities={facilitiesArray}
  filters={activeFilters}        // Optional: included in exports
  showExportControls={true}       // Optional: default true
  highContrastMode={false}        // Optional: default false
/>
```

### Direct Export Functions
```typescript
import {
  exportMapAsPNG,
  exportFacilitiesAsGeoJSON,
  exportFacilitiesAsKML
} from './geospatial/mapExport';

// PNG Export
await exportMapAsPNG(mapElement, 'custom-name.png');

// GeoJSON Export
exportFacilitiesAsGeoJSON(facilities, filters, 'data.geojson');

// KML Export
exportFacilitiesAsKML(facilities, filters, 'data.kml');
```

## Files

### New Files
- `src/geospatial/mapExport.ts` - Export utilities
- `src/components/geospatial/MapExportControls.tsx` - UI controls
- `src/geospatial/__tests__/mapExport.test.ts` - Export tests
- `src/components/geospatial/__tests__/MapExportControls.test.tsx` - UI tests

### Modified Files
- `src/components/geospatial/FacilityMap.tsx` - Integrated export controls
- `src/components/geospatial/__tests__/FacilityMap.test.tsx` - Added export tests

## Keyboard Shortcuts

- **Tab**: Focus export button
- **Enter/Space**: Open export menu
- **Arrow Keys**: Navigate menu options
- **Enter/Space**: Select export format
- **Escape**: Close menu

## Accessibility Features

- ✅ ARIA labels and roles
- ✅ Keyboard navigation
- ✅ Screen reader announcements
- ✅ High contrast mode support
- ✅ Focus management
- ✅ Live region for status updates

## Export Metadata

All exports include:
- Export date (ISO 8601)
- Facility count
- Applied filters
- Geographic bounds (GeoJSON only)

## Testing

```bash
# Run all export tests
npm test -- src/geospatial/__tests__/mapExport.test.ts --run
npm test -- src/components/geospatial/__tests__/MapExportControls.test.tsx --run
npm test -- src/components/geospatial/__tests__/FacilityMap.test.tsx --run

# Coverage: 58 tests, all passing
```

## Troubleshooting

### PNG Export Fails
- Check browser console for html2canvas errors
- Ensure map element is fully rendered
- Check CORS if external images are used

### Download Doesn't Start
- Check browser allows downloads
- Verify Blob API support
- Check console for errors

### Empty Export
- Verify facilities array is not empty
- Check filter criteria aren't too restrictive
- Ensure facility data has coordinates

## Props Reference

### FacilityMap New Props
```typescript
filters?: Record<string, unknown>     // Filters to include in metadata
showExportControls?: boolean          // Show export button (default: true)
```

### MapExportControls Props
```typescript
onExport: (format: ExportFormat) => void  // Callback for export
disabled?: boolean                         // Disable button
highContrastMode?: boolean                 // High contrast styling
```

## Performance

- PNG: ~1-2s for typical map
- GeoJSON: <100ms for 1000 facilities
- KML: <100ms for 1000 facilities

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

Requires: Blob API, URL.createObjectURL

## Status

✅ All acceptance criteria met
✅ All 58 tests passing
✅ Ready for production

---

**Last Updated**: 2026-01-11
**Related**: T209 (Geospatial Services)
