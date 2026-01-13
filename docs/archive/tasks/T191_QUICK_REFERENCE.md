# T191 Quick Reference: Facility Geolocation

## New Database Fields
```sql
facilities table:
- latitude: DECIMAL(10,7) NULL
- longitude: DECIMAL(10,7) NULL
- address: VARCHAR(500) NULL
- city: VARCHAR(255) NULL
- country: VARCHAR(255) NULL
```

## Environment Variables
```bash
GOOGLE_MAPS_API_KEY=your-api-key-here
```

## API Endpoints

### Geocode Address → Coordinates
```bash
POST /api/v1/facilities/geocode
Body: { "address": "123 Main St, City, State" }
Returns: { latitude, longitude, address, city, country }
```

### Reverse Geocode Coordinates → Address
```bash
POST /api/v1/facilities/reverse-geocode
Body: { "latitude": 37.7749, "longitude": -122.4194 }
Returns: { address, city, country }
```

### Update Facility Geolocation
```bash
PATCH /api/v1/facilities/:id/geolocation
Body: { latitude?, longitude?, address?, city?, country? }
Returns: Updated facility with geolocation fields
```

### Get Facilities (includes geolocation)
```bash
GET /api/v1/facilities
GET /api/v1/facilities/:id
Returns: Facility data including lat, lng, address, city, country
```

## Service Usage
```typescript
import { geocodingService } from './services/geocodingService';

// Geocode
const result = await geocodingService.geocode('1600 Amphitheatre Parkway');
// { latitude: 37.4224764, longitude: -122.0842499, address, city, country }

// Reverse geocode
const result = await geocodingService.reverseGeocode(37.7749, -122.4194);
// { address, city, country }
```

## Migration
```bash
# Apply migration
npm run migrate

# Rollback migration
npm run migrate:rollback
```

## Testing
```bash
# Run all tests
npm test

# Run geocoding tests only
npm test geocodingService
npm test facilities
```

## Key Files
- Migration: `migrations/20240105000000_add_geolocation_to_facilities.ts`
- Service: `src/services/geocodingService.ts`
- Routes: `src/routes/facilities.ts`
- Tests: `src/services/__tests__/geocodingService.test.ts`
- Factory: `src/test/factories/facilityFactory.ts`
