# T191: Geolocation Implementation

## Overview
Added comprehensive geolocation support to the Facility model with geocoding and reverse geocoding capabilities using Google Maps API.

## Implementation Summary

### 1. Database Migration
**File**: `migrations/20240105000000_add_geolocation_to_facilities.ts`
- Added `latitude` (decimal 10,7) and `longitude` (decimal 10,7) fields
- Added `address` (string 500), `city` (string 255), and `country` (string 255) fields
- Created indexes for efficient geospatial queries
- All fields are nullable to support existing facilities

### 2. Geocoding Service
**File**: `src/services/geocodingService.ts`
- **Google Maps API Integration**: Uses Google Maps Geocoding API for address lookups
- **Geocoding**: Converts addresses to latitude/longitude coordinates
- **Reverse Geocoding**: Converts coordinates to formatted addresses
- **Address Parsing**: Extracts city and country from Google Maps response
- **Error Handling**: Graceful handling of API failures and missing API keys

### 3. API Endpoints
**File**: `src/routes/facilities.ts`

#### GET /api/v1/facilities
- Now includes geolocation fields in response: `latitude`, `longitude`, `address`, `city`, `country`

#### GET /api/v1/facilities/:id
- Facility detail includes all geolocation fields

#### POST /api/v1/facilities/geocode
- Geocode an address to coordinates
- Request: `{ "address": "123 Main St, San Francisco, CA" }`
- Response: `{ latitude, longitude, address, city, country }`

#### POST /api/v1/facilities/reverse-geocode
- Reverse geocode coordinates to address
- Request: `{ "latitude": 37.7749, "longitude": -122.4194 }`
- Response: `{ address, city, country }`

#### PATCH /api/v1/facilities/:id/geolocation
- Update facility geolocation fields
- Supports partial updates (any combination of fields)
- Request: `{ latitude?, longitude?, address?, city?, country? }`

### 4. Factory Updates
**File**: `src/test/factories/facilityFactory.ts`
- Updated `FacilityData` interface with geolocation fields
- Added faker-generated defaults for latitude, longitude, address, city, country
- Updated `createFacility()` and `buildFacility()` functions

### 5. Environment Configuration
**File**: `.env.example`
- Added `GOOGLE_MAPS_API_KEY` environment variable
- Service gracefully handles missing API key (logs warning)

### 6. Tests
**Files**: 
- `src/services/__tests__/geocodingService.test.ts`
- `src/routes/__tests__/facilities.test.ts`

Comprehensive test coverage including:
- Geocoding success and failure cases
- Reverse geocoding success and failure cases
- Address component extraction
- API endpoint validation
- Error handling for missing API keys
- Partial updates for geolocation fields

## Usage Examples

### Geocode an Address
```bash
curl -X POST http://localhost:3000/api/v1/facilities/geocode \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"address": "1600 Amphitheatre Parkway, Mountain View, CA"}'
```

### Reverse Geocode Coordinates
```bash
curl -X POST http://localhost:3000/api/v1/facilities/reverse-geocode \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"latitude": 37.4224764, "longitude": -122.0842499}'
```

### Update Facility Geolocation
```bash
curl -X PATCH http://localhost:3000/api/v1/facilities/{facility-id}/geolocation \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 37.7749,
    "longitude": -122.4194,
    "address": "123 Main St, San Francisco, CA",
    "city": "San Francisco",
    "country": "United States"
  }'
```

## Google Maps API Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing project
3. Enable the **Geocoding API**
4. Create API credentials (API Key)
5. Add the API key to your `.env` file:
   ```
   GOOGLE_MAPS_API_KEY=your-api-key-here
   ```
6. (Optional) Restrict API key to Geocoding API and your server IP for security

## Database Migration

Run the migration to add geolocation fields:
```bash
npm run migrate
```

To rollback:
```bash
npm run migrate:rollback
```

## Acceptance Checklist

- [x] Add lat/long fields to Facility model (decimal 10,7)
- [x] Address string field (varchar 500)
- [x] City and country fields (varchar 255)
- [x] Geocoding API integration (Google Maps)
- [x] Reverse geocoding support
- [x] Database migration for existing facilities
- [x] API endpoints for geocoding operations
- [x] Updated facility endpoints to include geolocation data
- [x] Comprehensive test coverage
- [x] Factory updates for test data generation
- [x] Environment configuration documentation

## Architecture Decisions

### Why Google Maps API?
- Industry-standard geocoding accuracy
- Comprehensive address parsing
- Reliable reverse geocoding
- Familiar to most developers

### Database Schema
- Used `DECIMAL(10,7)` for coordinates (standard precision)
- All fields nullable for backward compatibility
- Indexes on lat/lng for geospatial queries
- Separate city/country fields for efficient filtering

### API Design
- Separate geocode endpoints for flexibility
- PATCH endpoint for partial updates
- Included geolocation in existing facility endpoints
- RESTful naming conventions

## Future Enhancements

1. **Distance Queries**: Add endpoint to find facilities within radius
2. **Batch Geocoding**: Support geocoding multiple addresses at once
3. **Caching**: Cache geocoding results to reduce API calls
4. **Alternative Providers**: Support for Mapbox or other geocoding services
5. **Geofencing**: Add support for facility boundaries/polygons
6. **Map Visualization**: Frontend map component showing facility locations

## Performance Considerations

- Geocoding is async and doesn't block facility operations
- Consider rate limiting for geocoding endpoints
- Cache geocoding results when possible
- Use indexes for location-based queries
- Monitor Google Maps API usage and costs

## Security Considerations

- API key stored in environment variables
- Restrict Google Maps API key to specific APIs and IPs
- Authenticate all geocoding endpoints
- Validate and sanitize address inputs
- Rate limit geocoding requests to prevent abuse
