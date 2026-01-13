# Geospatial API Documentation

## Overview

This document provides comprehensive guidance on implementing and using geospatial features in the Energy Management System. It covers coordinate formats, distance calculations, geocoding integration, map embedding, and performance optimization strategies.

---

## Table of Contents

1. [API Endpoints](#api-endpoints)
2. [Coordinate Formats](#coordinate-formats)
3. [Distance Calculation](#distance-calculation)
4. [Geocoding Integration](#geocoding-integration)
5. [Map Embedding](#map-embedding)
6. [Performance Optimization](#performance-optimization)

---

## API Endpoints

### 1. Get Facilities with Geolocation

Retrieve all facilities with their geographic coordinates.

**Endpoint:** `GET /api/facilities`

**Query Parameters:**
- `lat` (optional): Filter by latitude proximity
- `lng` (optional): Filter by longitude proximity
- `radius` (optional): Radius in kilometers (requires lat/lng)
- `bbox` (optional): Bounding box coordinates (format: `minLng,minLat,maxLng,maxLat`)

**Response:**
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Bangkok Energy Facility",
      "location": "Bangkok, Thailand",
      "coordinates": {
        "latitude": 13.7563,
        "longitude": 100.5018
      },
      "timezone": "Asia/Bangkok",
      "total_zones": 5,
      "status": "active",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-10T14:00:00Z"
    }
  ],
  "total": 1
}
```

### 2. Get Facility by ID with Geolocation

**Endpoint:** `GET /api/facilities/:id`

**Response:**
```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Bangkok Energy Facility",
    "location": "Bangkok, Thailand",
    "coordinates": {
      "latitude": 13.7563,
      "longitude": 100.5018
    },
    "timezone": "Asia/Bangkok",
    "totalZones": 5,
    "status": "active",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-10T14:00:00Z"
  }
}
```

### 3. Find Nearest Facilities

Find facilities near a specific coordinate.

**Endpoint:** `GET /api/facilities/nearby`

**Query Parameters:**
- `lat` (required): Latitude of the reference point
- `lng` (required): Longitude of the reference point
- `radius` (optional): Search radius in kilometers (default: 50)
- `limit` (optional): Maximum number of results (default: 10)

**Example Request:**
```bash
GET /api/facilities/nearby?lat=13.7563&lng=100.5018&radius=100&limit=5
```

**Response:**
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Bangkok Energy Facility",
      "location": "Bangkok, Thailand",
      "coordinates": {
        "latitude": 13.7563,
        "longitude": 100.5018
      },
      "distance": 0.0,
      "distance_unit": "km"
    },
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "name": "Nonthaburi Power Station",
      "location": "Nonthaburi, Thailand",
      "coordinates": {
        "latitude": 13.8621,
        "longitude": 100.5144
      },
      "distance": 11.8,
      "distance_unit": "km"
    }
  ],
  "total": 2,
  "query": {
    "latitude": 13.7563,
    "longitude": 100.5018,
    "radius": 100
  }
}
```

### 4. Calculate Distance Between Facilities

**Endpoint:** `GET /api/facilities/distance`

**Query Parameters:**
- `from` (required): Source facility ID
- `to` (required): Destination facility ID
- `unit` (optional): Distance unit (`km`, `mi`, `m`) - default: `km`

**Example Request:**
```bash
GET /api/facilities/distance?from=550e8400-e29b-41d4-a716-446655440000&to=660e8400-e29b-41d4-a716-446655440001&unit=km
```

**Response:**
```json
{
  "from": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Bangkok Energy Facility",
    "coordinates": {
      "latitude": 13.7563,
      "longitude": 100.5018
    }
  },
  "to": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "name": "Nonthaburi Power Station",
    "coordinates": {
      "latitude": 13.8621,
      "longitude": 100.5144
    }
  },
  "distance": 11.8,
  "unit": "km"
}
```

### 5. Geocode Address to Coordinates

**Endpoint:** `POST /api/geocoding/forward`

**Request Body:**
```json
{
  "address": "Bangkok, Thailand"
}
```

**Response:**
```json
{
  "data": {
    "address": "Bangkok, Thailand",
    "coordinates": {
      "latitude": 13.7563,
      "longitude": 100.5018
    },
    "formatted_address": "Bangkok, Thailand",
    "place_id": "ChIJ2zrrp5d6HTERsfPnfcnVqm8",
    "confidence": 0.95
  }
}
```

### 6. Reverse Geocode Coordinates to Address

**Endpoint:** `POST /api/geocoding/reverse`

**Request Body:**
```json
{
  "latitude": 13.7563,
  "longitude": 100.5018
}
```

**Response:**
```json
{
  "data": {
    "coordinates": {
      "latitude": 13.7563,
      "longitude": 100.5018
    },
    "address": "Bangkok, Thailand",
    "formatted_address": "Bangkok, 10200, Thailand",
    "address_components": {
      "city": "Bangkok",
      "country": "Thailand",
      "postal_code": "10200"
    }
  }
}
```

---

## Coordinate Formats

### Standard Format: WGS84 (EPSG:4326)

All coordinates in the system use the **WGS84** datum (World Geodetic System 1984), which is the standard for GPS and web mapping.

**Format Specifications:**

```typescript
interface Coordinates {
  latitude: number;   // Range: -90 to +90 (negative = South, positive = North)
  longitude: number;  // Range: -180 to +180 (negative = West, positive = East)
}
```

**Valid Examples:**
```json
{
  "latitude": 13.7563,
  "longitude": 100.5018
}
```

### Alternative Representations

#### 1. **GeoJSON Point Format**
```json
{
  "type": "Point",
  "coordinates": [100.5018, 13.7563]
}
```
⚠️ **Note:** GeoJSON uses `[longitude, latitude]` order (opposite of conventional usage).

#### 2. **Decimal Degrees (DD)**
```
13.7563°N, 100.5018°E
```

#### 3. **Degrees, Minutes, Seconds (DMS)**
```
13°45'22.7"N 100°30'06.5"E
```

#### 4. **Well-Known Text (WKT)**
```
POINT(100.5018 13.7563)
```

### Coordinate Precision

Different decimal places provide different levels of precision:

| Decimal Places | Precision    | Use Case                          |
|----------------|--------------|-----------------------------------|
| 0              | ~111 km      | Country-level                     |
| 1              | ~11 km       | City-level                        |
| 2              | ~1.1 km      | Neighborhood                      |
| 3              | ~110 m       | Large buildings                   |
| 4              | ~11 m        | Individual buildings (recommended)|
| 5              | ~1.1 m       | Trees, poles                      |
| 6              | ~0.11 m      | Survey-grade accuracy             |

**Recommendation:** Use **4-6 decimal places** for facility locations.

### Coordinate Validation

**TypeScript Validation:**
```typescript
function isValidCoordinate(lat: number, lng: number): boolean {
  return (
    lat >= -90 && lat <= 90 &&
    lng >= -180 && lng <= 180 &&
    !isNaN(lat) && !isNaN(lng)
  );
}

// Usage
if (!isValidCoordinate(13.7563, 100.5018)) {
  throw new Error('Invalid coordinates');
}
```

**SQL Validation:**
```sql
ALTER TABLE facilities
ADD CONSTRAINT valid_latitude CHECK (latitude BETWEEN -90 AND 90),
ADD CONSTRAINT valid_longitude CHECK (longitude BETWEEN -180 AND 180);
```

---

## Distance Calculation

### Haversine Formula

The **Haversine formula** calculates the great-circle distance between two points on Earth's surface. This is the most common method for GPS distances.

**Formula:**
```
a = sin²(Δφ/2) + cos(φ₁) × cos(φ₂) × sin²(Δλ/2)
c = 2 × atan2(√a, √(1−a))
d = R × c
```

Where:
- `φ` = latitude in radians
- `λ` = longitude in radians
- `R` = Earth's radius (6,371 km)
- `d` = distance

**TypeScript Implementation:**
```typescript
interface Coordinate {
  latitude: number;
  longitude: number;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param coord1 - First coordinate
 * @param coord2 - Second coordinate
 * @param unit - Distance unit ('km', 'mi', 'm') - default: 'km'
 * @returns Distance in specified unit
 */
function calculateDistance(
  coord1: Coordinate,
  coord2: Coordinate,
  unit: 'km' | 'mi' | 'm' = 'km'
): number {
  const R = unit === 'mi' ? 3958.8 : 6371; // Earth radius in km or miles
  
  const lat1Rad = toRadians(coord1.latitude);
  const lat2Rad = toRadians(coord2.latitude);
  const deltaLatRad = toRadians(coord2.latitude - coord1.latitude);
  const deltaLngRad = toRadians(coord2.longitude - coord1.longitude);

  const a =
    Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
    Math.cos(lat1Rad) *
      Math.cos(lat2Rad) *
      Math.sin(deltaLngRad / 2) *
      Math.sin(deltaLngRad / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return unit === 'm' ? distance * 1000 : distance;
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

// Usage Example
const bangkok = { latitude: 13.7563, longitude: 100.5018 };
const nonthaburi = { latitude: 13.8621, longitude: 100.5144 };

const distanceKm = calculateDistance(bangkok, nonthaburi, 'km');
console.log(`Distance: ${distanceKm.toFixed(2)} km`); // Distance: 11.80 km
```

### PostgreSQL Implementation (PostGIS)

For database-level distance calculations, use **PostGIS** extension:

**Enable PostGIS:**
```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

**Add Geometry Column:**
```sql
ALTER TABLE facilities
ADD COLUMN coordinates GEOGRAPHY(POINT, 4326);

-- Populate from existing lat/lng columns
UPDATE facilities
SET coordinates = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::GEOGRAPHY;

-- Create spatial index for performance
CREATE INDEX idx_facilities_coordinates ON facilities USING GIST(coordinates);
```

**Distance Query:**
```sql
-- Find facilities within 50km of a point
SELECT 
  id,
  name,
  location,
  ST_Distance(
    coordinates,
    ST_SetSRID(ST_MakePoint(100.5018, 13.7563), 4326)::GEOGRAPHY
  ) / 1000 AS distance_km
FROM facilities
WHERE ST_DWithin(
  coordinates,
  ST_SetSRID(ST_MakePoint(100.5018, 13.7563), 4326)::GEOGRAPHY,
  50000  -- 50km in meters
)
ORDER BY distance_km ASC;
```

### Alternative: Vincenty Formula

For higher accuracy (within 0.5mm), use the **Vincenty formula**. More computationally expensive but better for precise measurements.

```typescript
/**
 * Calculate distance using Vincenty formula (higher accuracy)
 */
function calculateDistanceVincenty(
  coord1: Coordinate,
  coord2: Coordinate
): number {
  const a = 6378137; // WGS-84 equatorial radius (meters)
  const b = 6356752.314245; // WGS-84 polar radius (meters)
  const f = 1 / 298.257223563; // WGS-84 flattening

  const lat1 = toRadians(coord1.latitude);
  const lat2 = toRadians(coord2.latitude);
  const lng1 = toRadians(coord1.longitude);
  const lng2 = toRadians(coord2.longitude);

  const L = lng2 - lng1;
  const U1 = Math.atan((1 - f) * Math.tan(lat1));
  const U2 = Math.atan((1 - f) * Math.tan(lat2));
  
  const sinU1 = Math.sin(U1), cosU1 = Math.cos(U1);
  const sinU2 = Math.sin(U2), cosU2 = Math.cos(U2);

  let lambda = L;
  let lambdaP;
  let iterLimit = 100;
  let cosSqAlpha, sinSigma, cos2SigmaM, cosSigma, sigma;

  do {
    const sinLambda = Math.sin(lambda);
    const cosLambda = Math.cos(lambda);
    sinSigma = Math.sqrt(
      cosU2 * sinLambda * (cosU2 * sinLambda) +
      (cosU1 * sinU2 - sinU1 * cosU2 * cosLambda) *
      (cosU1 * sinU2 - sinU1 * cosU2 * cosLambda)
    );
    
    if (sinSigma === 0) return 0; // Co-incident points
    
    cosSigma = sinU1 * sinU2 + cosU1 * cosU2 * cosLambda;
    sigma = Math.atan2(sinSigma, cosSigma);
    const sinAlpha = (cosU1 * cosU2 * sinLambda) / sinSigma;
    cosSqAlpha = 1 - sinAlpha * sinAlpha;
    cos2SigmaM = cosSigma - (2 * sinU1 * sinU2) / cosSqAlpha;
    
    if (isNaN(cos2SigmaM)) cos2SigmaM = 0; // Equatorial line
    
    const C = (f / 16) * cosSqAlpha * (4 + f * (4 - 3 * cosSqAlpha));
    lambdaP = lambda;
    lambda =
      L +
      (1 - C) *
        f *
        sinAlpha *
        (sigma +
          C *
            sinSigma *
            (cos2SigmaM + C * cosSigma * (-1 + 2 * cos2SigmaM * cos2SigmaM)));
  } while (Math.abs(lambda - lambdaP) > 1e-12 && --iterLimit > 0);

  if (iterLimit === 0) return NaN; // Formula failed to converge

  const uSq = (cosSqAlpha * (a * a - b * b)) / (b * b);
  const A = 1 + (uSq / 16384) * (4096 + uSq * (-768 + uSq * (320 - 175 * uSq)));
  const B = (uSq / 1024) * (256 + uSq * (-128 + uSq * (74 - 47 * uSq)));
  const deltaSigma =
    B *
    sinSigma *
    (cos2SigmaM +
      (B / 4) *
        (cosSigma * (-1 + 2 * cos2SigmaM * cos2SigmaM) -
          (B / 6) *
            cos2SigmaM *
            (-3 + 4 * sinSigma * sinSigma) *
            (-3 + 4 * cos2SigmaM * cos2SigmaM)));

  const distance = b * A * (sigma - deltaSigma);
  return distance / 1000; // Convert to kilometers
}
```

---

## Geocoding Integration

### Recommended Providers

1. **Google Maps Geocoding API** - Most accurate, 200 USD monthly credit
2. **OpenStreetMap Nominatim** - Free, open-source, rate-limited
3. **Mapbox Geocoding API** - 100,000 free requests/month
4. **HERE Geocoding API** - 250,000 free transactions/month

### Implementation: Google Maps Geocoding

**Installation:**
```bash
npm install @googlemaps/google-maps-services-js
```

**Configuration:**
```typescript
import { Client } from '@googlemaps/google-maps-services-js';

const client = new Client({});
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
```

**Forward Geocoding (Address → Coordinates):**
```typescript
async function geocodeAddress(address: string): Promise<Coordinate | null> {
  try {
    const response = await client.geocode({
      params: {
        address,
        key: GOOGLE_MAPS_API_KEY,
      },
    });

    if (response.data.results.length > 0) {
      const location = response.data.results[0].geometry.location;
      return {
        latitude: location.lat,
        longitude: location.lng,
      };
    }
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    throw new Error('Failed to geocode address');
  }
}

// Usage
const coordinates = await geocodeAddress('Bangkok, Thailand');
// { latitude: 13.7563, longitude: 100.5018 }
```

**Reverse Geocoding (Coordinates → Address):**
```typescript
async function reverseGeocode(coord: Coordinate): Promise<string | null> {
  try {
    const response = await client.reverseGeocode({
      params: {
        latlng: `${coord.latitude},${coord.longitude}`,
        key: GOOGLE_MAPS_API_KEY,
      },
    });

    if (response.data.results.length > 0) {
      return response.data.results[0].formatted_address;
    }
    return null;
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    throw new Error('Failed to reverse geocode coordinates');
  }
}

// Usage
const address = await reverseGeocode({ latitude: 13.7563, longitude: 100.5018 });
// "Bangkok, Thailand"
```

### Implementation: OpenStreetMap Nominatim (Free)

**Forward Geocoding:**
```typescript
async function geocodeAddressOSM(address: string): Promise<Coordinate | null> {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', address);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '1');

  const response = await fetch(url.toString(), {
    headers: {
      'User-Agent': 'EnergyManagementSystem/1.0', // Required by OSM
    },
  });

  const data = await response.json();

  if (data.length > 0) {
    return {
      latitude: parseFloat(data[0].lat),
      longitude: parseFloat(data[0].lon),
    };
  }
  return null;
}
```

**Reverse Geocoding:**
```typescript
async function reverseGeocodeOSM(coord: Coordinate): Promise<string | null> {
  const url = new URL('https://nominatim.openstreetmap.org/reverse');
  url.searchParams.set('lat', coord.latitude.toString());
  url.searchParams.set('lon', coord.longitude.toString());
  url.searchParams.set('format', 'json');

  const response = await fetch(url.toString(), {
    headers: {
      'User-Agent': 'EnergyManagementSystem/1.0',
    },
  });

  const data = await response.json();
  return data.display_name || null;
}
```

**Rate Limiting:** OSM Nominatim has a 1 request/second limit. Implement caching and rate limiting:

```typescript
import rateLimit from 'express-rate-limit';

const geocodingLimiter = rateLimit({
  windowMs: 1000, // 1 second
  max: 1, // 1 request per window
  message: 'Too many geocoding requests, please try again later.',
});

router.post('/api/geocoding/forward', geocodingLimiter, async (req, res) => {
  // Geocoding logic
});
```

### Caching Strategy

Cache geocoding results to reduce API calls and costs:

```typescript
import NodeCache from 'node-cache';

const geocodeCache = new NodeCache({ stdTTL: 86400 }); // 24 hour TTL

async function geocodeAddressWithCache(address: string): Promise<Coordinate | null> {
  const cacheKey = `geocode:${address.toLowerCase().trim()}`;
  
  // Check cache first
  const cached = geocodeCache.get<Coordinate>(cacheKey);
  if (cached) return cached;

  // Fetch from API
  const result = await geocodeAddress(address);
  
  // Store in cache
  if (result) {
    geocodeCache.set(cacheKey, result);
  }
  
  return result;
}
```

---

## Map Embedding

### Google Maps Integration

**Frontend Implementation (React/TypeScript):**

**Installation:**
```bash
npm install @react-google-maps/api
```

**Component:**
```tsx
import React from 'react';
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';

interface Coordinate {
  latitude: number;
  longitude: number;
}

interface FacilityMapProps {
  coordinates: Coordinate;
  facilityName: string;
}

const containerStyle = {
  width: '100%',
  height: '400px',
};

export const FacilityMap: React.FC<FacilityMapProps> = ({
  coordinates,
  facilityName,
}) => {
  const center = {
    lat: coordinates.latitude,
    lng: coordinates.longitude,
  };

  return (
    <LoadScript googleMapsApiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY || ''}>
      <GoogleMap mapContainerStyle={containerStyle} center={center} zoom={14}>
        <Marker position={center} title={facilityName} />
      </GoogleMap>
    </LoadScript>
  );
};
```

**Usage:**
```tsx
<FacilityMap
  coordinates={{ latitude: 13.7563, longitude: 100.5018 }}
  facilityName="Bangkok Energy Facility"
/>
```

### Multiple Markers with Clustering

```tsx
import { MarkerClusterer } from '@react-google-maps/api';

interface Facility {
  id: string;
  name: string;
  coordinates: Coordinate;
}

interface FacilitiesMapProps {
  facilities: Facility[];
}

export const FacilitiesMap: React.FC<FacilitiesMapProps> = ({ facilities }) => {
  const center = {
    lat: facilities[0]?.coordinates.latitude || 0,
    lng: facilities[0]?.coordinates.longitude || 0,
  };

  return (
    <LoadScript googleMapsApiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY || ''}>
      <GoogleMap mapContainerStyle={containerStyle} center={center} zoom={10}>
        <MarkerClusterer>
          {(clusterer) =>
            facilities.map((facility) => (
              <Marker
                key={facility.id}
                position={{
                  lat: facility.coordinates.latitude,
                  lng: facility.coordinates.longitude,
                }}
                title={facility.name}
                clusterer={clusterer}
              />
            ))
          }
        </MarkerClusterer>
      </GoogleMap>
    </LoadScript>
  );
};
```

### Leaflet (Open Source Alternative)

**Installation:**
```bash
npm install leaflet react-leaflet
npm install -D @types/leaflet
```

**Component:**
```tsx
import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export const LeafletFacilityMap: React.FC<FacilityMapProps> = ({
  coordinates,
  facilityName,
}) => {
  const position: [number, number] = [coordinates.latitude, coordinates.longitude];

  return (
    <MapContainer center={position} zoom={14} style={{ height: '400px', width: '100%' }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      <Marker position={position}>
        <Popup>{facilityName}</Popup>
      </Marker>
    </MapContainer>
  );
};
```

### Static Map Images

For email notifications or reports, use static maps:

**Google Static Maps API:**
```typescript
function getStaticMapUrl(coord: Coordinate, zoom = 14, size = '600x400'): string {
  const baseUrl = 'https://maps.googleapis.com/maps/api/staticmap';
  const params = new URLSearchParams({
    center: `${coord.latitude},${coord.longitude}`,
    zoom: zoom.toString(),
    size,
    markers: `color:red|${coord.latitude},${coord.longitude}`,
    key: process.env.GOOGLE_MAPS_API_KEY || '',
  });
  return `${baseUrl}?${params.toString()}`;
}

// Usage in email template
const mapUrl = getStaticMapUrl({ latitude: 13.7563, longitude: 100.5018 });
// <img src="${mapUrl}" alt="Facility Location" />
```

---

## Performance Optimization

### 1. Spatial Indexing

**PostgreSQL with PostGIS:**
```sql
-- Create GIST index for spatial queries
CREATE INDEX idx_facilities_coordinates 
ON facilities 
USING GIST(coordinates);

-- Analyze table for query planning
ANALYZE facilities;
```

**Benefits:**
- Speeds up distance queries by 10-100x
- Enables efficient bounding box searches
- Optimizes nearest-neighbor queries

### 2. Bounding Box Pre-filtering

Before calculating exact distances, filter by bounding box:

```typescript
/**
 * Calculate approximate bounding box for radius search
 */
function getBoundingBox(coord: Coordinate, radiusKm: number) {
  const latDelta = radiusKm / 111.0; // 1 degree latitude ≈ 111 km
  const lngDelta = radiusKm / (111.0 * Math.cos(toRadians(coord.latitude)));

  return {
    minLat: coord.latitude - latDelta,
    maxLat: coord.latitude + latDelta,
    minLng: coord.longitude - lngDelta,
    maxLng: coord.longitude + lngDelta,
  };
}

// Use in SQL query
const bbox = getBoundingBox({ latitude: 13.7563, longitude: 100.5018 }, 50);
const query = `
  SELECT * FROM facilities
  WHERE latitude BETWEEN $1 AND $2
    AND longitude BETWEEN $3 AND $4
`;
// Then calculate exact distances only for filtered results
```

### 3. Caching Strategies

**a) Geocoding Results:**
```typescript
// Cache geocoding for 24 hours
const geocodeCache = new NodeCache({ stdTTL: 86400 });
```

**b) Distance Matrix:**
```typescript
// Cache frequently calculated distances
const distanceCache = new NodeCache({ stdTTL: 3600 });

function getCachedDistance(id1: string, id2: string): number | null {
  const key = [id1, id2].sort().join(':');
  return distanceCache.get<number>(key) || null;
}
```

**c) Facility Coordinates:**
```typescript
// Cache facility coordinates in Redis
import Redis from 'ioredis';
const redis = new Redis();

async function getFacilityCoordinates(facilityId: string): Promise<Coordinate> {
  const cached = await redis.get(`facility:${facilityId}:coordinates`);
  if (cached) return JSON.parse(cached);

  // Fetch from database
  const result = await pool.query(
    'SELECT latitude, longitude FROM facilities WHERE id = $1',
    [facilityId]
  );
  
  const coordinates = {
    latitude: result.rows[0].latitude,
    longitude: result.rows[0].longitude,
  };

  // Cache for 1 hour
  await redis.setex(
    `facility:${facilityId}:coordinates`,
    3600,
    JSON.stringify(coordinates)
  );

  return coordinates;
}
```

### 4. Batch Distance Calculations

Calculate multiple distances in a single query:

```sql
-- PostgreSQL function for batch distance calculation
CREATE OR REPLACE FUNCTION calculate_distances(
  ref_lat DOUBLE PRECISION,
  ref_lng DOUBLE PRECISION,
  facility_ids UUID[]
)
RETURNS TABLE(facility_id UUID, distance_km DOUBLE PRECISION) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    f.id,
    ST_Distance(
      ST_SetSRID(ST_MakePoint(ref_lng, ref_lat), 4326)::GEOGRAPHY,
      f.coordinates
    ) / 1000 AS distance_km
  FROM facilities f
  WHERE f.id = ANY(facility_ids);
END;
$$ LANGUAGE plpgsql;

-- Usage
SELECT * FROM calculate_distances(
  13.7563, 
  100.5018, 
  ARRAY['550e8400-e29b-41d4-a716-446655440000', '660e8400-e29b-41d4-a716-446655440001']
);
```

### 5. Pagination and Limiting

Always limit result sets:

```typescript
interface NearbyOptions {
  limit?: number;
  offset?: number;
  maxDistance?: number;
}

async function findNearbyFacilities(
  coord: Coordinate,
  options: NearbyOptions = {}
): Promise<Facility[]> {
  const { limit = 10, offset = 0, maxDistance = 50 } = options;

  const query = `
    SELECT 
      id, name, location,
      ST_Distance(
        coordinates,
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::GEOGRAPHY
      ) / 1000 AS distance_km
    FROM facilities
    WHERE ST_DWithin(
      coordinates,
      ST_SetSRID(ST_MakePoint($1, $2), 4326)::GEOGRAPHY,
      $3 * 1000
    )
    ORDER BY distance_km ASC
    LIMIT $4 OFFSET $5
  `;

  const result = await pool.query(query, [
    coord.longitude,
    coord.latitude,
    maxDistance,
    limit,
    offset,
  ]);

  return result.rows;
}
```

### 6. API Response Compression

Enable gzip compression for large geospatial responses:

```typescript
import compression from 'compression';

app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  },
  level: 6, // Compression level (0-9)
}));
```

### 7. Load Testing Benchmarks

Expected performance targets:

| Operation                  | Target Latency | Notes                          |
|----------------------------|----------------|--------------------------------|
| Get single facility coords | < 10ms         | With database index            |
| Calculate distance (2 pts) | < 1ms          | In-memory Haversine            |
| Find nearby (50km radius)  | < 50ms         | With spatial index             |
| Geocode address            | < 200ms        | External API (cached)          |
| Reverse geocode            | < 200ms        | External API (cached)          |
| Render map with 100 pins   | < 1s           | Client-side with clustering    |

### 8. Monitoring and Alerts

Track geospatial query performance:

```typescript
import { performance } from 'perf_hooks';

async function monitoredDistanceCalculation(
  coord1: Coordinate,
  coord2: Coordinate
): Promise<number> {
  const start = performance.now();
  const distance = calculateDistance(coord1, coord2);
  const duration = performance.now() - start;

  // Log slow queries
  if (duration > 100) {
    console.warn(`Slow distance calculation: ${duration.toFixed(2)}ms`);
  }

  // Send to monitoring system
  // metrics.histogram('geospatial.distance_calc_duration', duration);

  return distance;
}
```

---

## Database Schema Recommendations

### Current Schema
```sql
CREATE TABLE facilities (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255) NOT NULL,  -- Text representation
  timezone VARCHAR(100) NOT NULL,
  total_zones INTEGER NOT NULL,
  status VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
);
```

### Recommended Enhanced Schema

```sql
-- Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add coordinate columns
ALTER TABLE facilities
ADD COLUMN latitude DOUBLE PRECISION,
ADD COLUMN longitude DOUBLE PRECISION,
ADD COLUMN coordinates GEOGRAPHY(POINT, 4326),
ADD COLUMN address_components JSONB;

-- Add constraints
ALTER TABLE facilities
ADD CONSTRAINT valid_latitude CHECK (latitude BETWEEN -90 AND 90),
ADD CONSTRAINT valid_longitude CHECK (longitude BETWEEN -180 AND 180);

-- Create indexes
CREATE INDEX idx_facilities_coordinates ON facilities USING GIST(coordinates);
CREATE INDEX idx_facilities_lat_lng ON facilities(latitude, longitude);
CREATE INDEX idx_facilities_address_components ON facilities USING GIN(address_components);

-- Create trigger to auto-update coordinates
CREATE OR REPLACE FUNCTION update_coordinates()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.coordinates := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::GEOGRAPHY;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_coordinates
BEFORE INSERT OR UPDATE ON facilities
FOR EACH ROW
EXECUTE FUNCTION update_coordinates();
```

---

## Testing Guidelines

### Unit Tests for Distance Calculations

```typescript
import { describe, it, expect } from 'vitest';

describe('calculateDistance', () => {
  it('should calculate distance between Bangkok and Nonthaburi', () => {
    const bangkok = { latitude: 13.7563, longitude: 100.5018 };
    const nonthaburi = { latitude: 13.8621, longitude: 100.5144 };

    const distance = calculateDistance(bangkok, nonthaburi, 'km');
    
    expect(distance).toBeCloseTo(11.8, 1); // Within 0.1 km
  });

  it('should return 0 for identical coordinates', () => {
    const coord = { latitude: 13.7563, longitude: 100.5018 };
    const distance = calculateDistance(coord, coord, 'km');
    
    expect(distance).toBe(0);
  });

  it('should handle different units', () => {
    const coord1 = { latitude: 0, longitude: 0 };
    const coord2 = { latitude: 1, longitude: 0 };

    const distanceKm = calculateDistance(coord1, coord2, 'km');
    const distanceMi = calculateDistance(coord1, coord2, 'mi');
    const distanceM = calculateDistance(coord1, coord2, 'm');

    expect(distanceKm).toBeCloseTo(111.19, 1);
    expect(distanceMi).toBeCloseTo(69.09, 1);
    expect(distanceM).toBeCloseTo(111190, 0);
  });
});
```

### Integration Tests for Geocoding

```typescript
describe('Geocoding API', () => {
  it('should geocode Bangkok address', async () => {
    const response = await request(app)
      .post('/api/geocoding/forward')
      .send({ address: 'Bangkok, Thailand' })
      .expect(200);

    expect(response.body.data.coordinates).toMatchObject({
      latitude: expect.any(Number),
      longitude: expect.any(Number),
    });
    expect(response.body.data.coordinates.latitude).toBeCloseTo(13.7563, 1);
    expect(response.body.data.coordinates.longitude).toBeCloseTo(100.5018, 1);
  });

  it('should reverse geocode coordinates', async () => {
    const response = await request(app)
      .post('/api/geocoding/reverse')
      .send({ latitude: 13.7563, longitude: 100.5018 })
      .expect(200);

    expect(response.body.data.address).toContain('Bangkok');
  });
});
```

---

## Error Handling

### Common Error Scenarios

```typescript
enum GeospatialErrorCode {
  INVALID_COORDINATES = 'INVALID_COORDINATES',
  GEOCODING_FAILED = 'GEOCODING_FAILED',
  DISTANCE_CALCULATION_FAILED = 'DISTANCE_CALCULATION_FAILED',
  API_RATE_LIMIT_EXCEEDED = 'API_RATE_LIMIT_EXCEEDED',
  FACILITY_NOT_FOUND = 'FACILITY_NOT_FOUND',
}

class GeospatialError extends Error {
  constructor(
    public code: GeospatialErrorCode,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'GeospatialError';
  }
}

// Usage in route handlers
router.get('/api/facilities/nearby', async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);

    if (!isValidCoordinate(lat, lng)) {
      throw new GeospatialError(
        GeospatialErrorCode.INVALID_COORDINATES,
        'Invalid latitude or longitude values',
        { lat, lng }
      );
    }

    // Process request...
  } catch (error) {
    if (error instanceof GeospatialError) {
      return res.status(400).json({
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      });
    }
    // Handle other errors...
  }
});
```

---

## Security Considerations

1. **API Key Protection:**
   - Never expose API keys in client-side code
   - Use environment variables
   - Implement proxy endpoints for sensitive operations

2. **Rate Limiting:**
   - Implement rate limits on geocoding endpoints
   - Use API key quotas
   - Cache results aggressively

3. **Input Validation:**
   - Validate all coordinate inputs
   - Sanitize address strings
   - Limit query radius to reasonable values

4. **CORS Configuration:**
```typescript
import cors from 'cors';

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  methods: ['GET', 'POST'],
  credentials: true,
}));
```

---

## Additional Resources

- [PostGIS Documentation](https://postgis.net/documentation/)
- [Google Maps Platform](https://developers.google.com/maps)
- [Leaflet Documentation](https://leafletjs.com/reference.html)
- [GeoJSON Specification](https://geojson.org/)
- [WGS84 Coordinate System](https://en.wikipedia.org/wiki/World_Geodetic_System)

---

## Summary Checklist

- ✅ API endpoint documentation with examples
- ✅ Coordinate format specifications (WGS84, GeoJSON, DMS)
- ✅ Distance calculation formulas (Haversine, Vincenty)
- ✅ Geocoding integration guide (Google Maps, OSM)
- ✅ Map embedding examples (Google Maps, Leaflet)
- ✅ Performance optimization tips (indexing, caching, batching)
- ✅ Database schema recommendations
- ✅ Testing guidelines
- ✅ Error handling patterns
- ✅ Security best practices

---

**Version:** 1.0  
**Last Updated:** 2026-01-10  
**Maintainer:** Energy Management System Team
