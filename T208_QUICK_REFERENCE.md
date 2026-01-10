# T208: Geospatial API - Quick Reference

## Task Overview
Add comprehensive geospatial API documentation covering coordinates, distances, geocoding, and map integration.

## Documentation Location
📄 **Main Document:** `docs/GEOSPATIAL_API.md` (33KB)

## Key Content Sections

### 1. API Endpoints
- `GET /api/facilities` - List with coordinates
- `GET /api/facilities/:id` - Single facility location
- `GET /api/facilities/nearby` - Find nearest facilities
- `GET /api/facilities/distance` - Calculate distances
- `POST /api/geocoding/forward` - Address → Coordinates
- `POST /api/geocoding/reverse` - Coordinates → Address

### 2. Coordinate Formats
- **Standard:** WGS84 (EPSG:4326)
- **Range:** Lat: -90 to +90, Lng: -180 to +180
- **Precision:** 4-6 decimal places recommended
- **Alternatives:** GeoJSON, DMS, WKT

### 3. Distance Calculations
- **Haversine:** Fast, accurate for most cases
- **Vincenty:** High precision (0.5mm accuracy)
- **PostGIS:** Database-level with spatial indexes

### 4. Geocoding Providers
- **Google Maps:** Most accurate, 200 USD/month free
- **OpenStreetMap:** Free, rate-limited to 1 req/sec
- **Mapbox:** 100,000 free requests/month
- **HERE:** 250,000 free transactions/month

### 5. Map Libraries
- **Google Maps:** `@react-google-maps/api`
- **Leaflet:** `react-leaflet` (open source)
- **Static Maps:** For emails/reports

### 6. Performance Targets
- Get facility coords: < 10ms
- Calculate distance: < 1ms
- Find nearby (50km): < 50ms
- Geocode (cached): < 200ms
- Render 100 markers: < 1s

## Quick Code Examples

### Calculate Distance (TypeScript)
```typescript
function calculateDistance(
  coord1: { latitude: number; longitude: number },
  coord2: { latitude: number; longitude: number },
  unit: 'km' | 'mi' | 'm' = 'km'
): number {
  const R = unit === 'mi' ? 3958.8 : 6371;
  const lat1 = (coord1.latitude * Math.PI) / 180;
  const lat2 = (coord2.latitude * Math.PI) / 180;
  const deltaLat = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
  const deltaLng = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) *
    Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return unit === 'm' ? distance * 1000 : distance;
}
```

### Find Nearby (SQL with PostGIS)
```sql
SELECT 
  id, name,
  ST_Distance(
    coordinates,
    ST_SetSRID(ST_MakePoint($1, $2), 4326)::GEOGRAPHY
  ) / 1000 AS distance_km
FROM facilities
WHERE ST_DWithin(
  coordinates,
  ST_SetSRID(ST_MakePoint($1, $2), 4326)::GEOGRAPHY,
  50000  -- 50km radius
)
ORDER BY distance_km ASC
LIMIT 10;
```

### React Map Component
```tsx
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';

export const FacilityMap = ({ coordinates, name }) => (
  <LoadScript googleMapsApiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY}>
    <GoogleMap
      center={{ lat: coordinates.latitude, lng: coordinates.longitude }}
      zoom={14}
      mapContainerStyle={{ width: '100%', height: '400px' }}
    >
      <Marker
        position={{ lat: coordinates.latitude, lng: coordinates.longitude }}
        title={name}
      />
    </GoogleMap>
  </LoadScript>
);
```

## Database Setup

### Enable PostGIS
```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

### Add Coordinate Columns
```sql
ALTER TABLE facilities
ADD COLUMN latitude DOUBLE PRECISION,
ADD COLUMN longitude DOUBLE PRECISION,
ADD COLUMN coordinates GEOGRAPHY(POINT, 4326);
```

### Create Spatial Index
```sql
CREATE INDEX idx_facilities_coordinates 
ON facilities USING GIST(coordinates);
```

## Performance Optimization

1. **Spatial Indexing:** Use GIST indexes (10-100x faster)
2. **Caching:** Cache geocoding results (24h TTL)
3. **Bounding Box:** Pre-filter before exact distance
4. **Batching:** Calculate multiple distances in one query
5. **Pagination:** Always limit result sets
6. **Compression:** Enable gzip for large responses

## Common Patterns

### Validate Coordinates
```typescript
function isValid(lat: number, lng: number): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}
```

### Geocode with Cache
```typescript
const cache = new NodeCache({ stdTTL: 86400 });

async function geocode(address: string) {
  const key = `geocode:${address.toLowerCase()}`;
  const cached = cache.get(key);
  if (cached) return cached;
  
  const result = await geocodeAPI(address);
  cache.set(key, result);
  return result;
}
```

### Get Bounding Box
```typescript
function getBoundingBox(coord, radiusKm) {
  const latDelta = radiusKm / 111.0;
  const lngDelta = radiusKm / (111.0 * Math.cos(coord.latitude * Math.PI / 180));
  
  return {
    minLat: coord.latitude - latDelta,
    maxLat: coord.latitude + latDelta,
    minLng: coord.longitude - lngDelta,
    maxLng: coord.longitude + lngDelta
  };
}
```

## Error Codes

- `INVALID_COORDINATES` - Lat/lng out of range
- `GEOCODING_FAILED` - API error or invalid address
- `DISTANCE_CALCULATION_FAILED` - Computation error
- `API_RATE_LIMIT_EXCEEDED` - Too many requests
- `FACILITY_NOT_FOUND` - Invalid facility ID

## Security Checklist

- ✅ API keys in environment variables only
- ✅ Rate limiting on all endpoints (1 req/sec for OSM)
- ✅ Input validation for all coordinates
- ✅ CORS configuration for allowed origins
- ✅ Radius limits enforced (max 500km)

## Testing Tips

### Unit Test Distance
```typescript
expect(calculateDistance(
  { latitude: 13.7563, longitude: 100.5018 },
  { latitude: 13.8621, longitude: 100.5144 },
  'km'
)).toBeCloseTo(11.8, 1);
```

### Integration Test Geocoding
```typescript
const response = await request(app)
  .post('/api/geocoding/forward')
  .send({ address: 'Bangkok, Thailand' })
  .expect(200);

expect(response.body.data.coordinates.latitude).toBeCloseTo(13.7563, 1);
```

## Installation Commands

### Backend Dependencies
```bash
npm install @googlemaps/google-maps-services-js
npm install node-cache
```

### Frontend Dependencies
```bash
# Google Maps
npm install @react-google-maps/api

# Or Leaflet (open source)
npm install leaflet react-leaflet
npm install -D @types/leaflet
```

### Database
```bash
# PostgreSQL with PostGIS
psql -d your_database -c "CREATE EXTENSION postgis;"
```

## Acceptance Criteria Status

- ✅ API endpoint documentation (6 endpoints)
- ✅ Coordinate format specifications (5 formats)
- ✅ Distance calculation examples (3 implementations)
- ✅ Geocoding integration guide (2 providers)
- ✅ Map embedding examples (2 libraries)
- ✅ Performance optimization tips (8 strategies)

## Next Steps

1. Review full documentation: `docs/GEOSPATIAL_API.md`
2. Add latitude/longitude to facilities table
3. Implement nearby facilities endpoint
4. Integrate geocoding service
5. Add map components to frontend
6. Create spatial indexes
7. Implement caching layer
8. Set up monitoring

## Resources

- Full Documentation: `docs/GEOSPATIAL_API.md`
- Implementation Complete: `T208_IMPLEMENTATION_COMPLETE.md`
- PostGIS Docs: https://postgis.net/documentation/
- Google Maps: https://developers.google.com/maps

---

**Quick Start:** Read `docs/GEOSPATIAL_API.md` sections 1-3 for immediate implementation.
