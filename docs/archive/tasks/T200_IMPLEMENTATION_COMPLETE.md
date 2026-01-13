# Weather Overlay Implementation - T200

## Overview
Weather overlay feature displaying current conditions, forecasts, and alerts for facility locations with historical correlation analysis.

## Features Implemented

### 1. Weather API Integration (OpenWeatherMap)
- **Service**: `services/backend/src/services/weatherService.ts`
- Current weather data retrieval
- 7-day weather forecasts
- Historical weather data access
- Smart caching (10 min for current, 1 hour for forecast, 24 hours for historical)

### 2. Current Weather Display on Markers
- **Component**: `services/frontend/src/components/geospatial/WeatherMarker.tsx`
- Visual weather markers with temperature and conditions
- Weather emoji based on conditions (☀️, 🌧️, ❄️, etc.)
- Color-coded temperature indicators
- High contrast mode support

### 3. Temperature Overlay on Map
- **Component**: `services/frontend/src/components/geospatial/WeatherOverlay.tsx`
- Visual overlay showing all facility weather conditions
- Automatic positioning based on facility coordinates
- Real-time weather updates (10-minute refresh)
- Alert indicators for extreme conditions

### 4. Weather-Based Alerts
Temperature thresholds defined in `weatherService.ts`:
- **Extreme Heat**: ≥40°C (Red alert)
- **High Heat**: ≥35°C (Orange alert)
- **Extreme Cold**: ≤-20°C (Red alert)
- **High Cold**: ≤-10°C (Orange alert)

Alert system monitors temperature and generates warnings for battery system protection.

### 5. 7-Day Forecast for Facilities
- **Component**: `services/frontend/src/components/geospatial/WeatherDetailsPanel.tsx`
- Daily min/max temperatures
- Weather descriptions and conditions
- Precipitation probability
- Humidity and wind speed

### 6. Historical Weather Correlation Analysis
- **Endpoint**: `GET /api/v1/weather/correlation/facility/:id`
- Pearson correlation coefficients calculated for:
  - Temperature vs State of Charge (SoC)
  - Temperature vs State of Health (SoH)
  - Temperature vs Alert Count
- Configurable analysis period (7-90 days)
- Visualization of correlation trends

## API Endpoints

### Current Weather
```
GET /api/v1/weather/current?latitude={lat}&longitude={lon}
GET /api/v1/weather/facility/:id
GET /api/v1/weather/facilities
```

### Forecasts
```
GET /api/v1/weather/forecast?latitude={lat}&longitude={lon}
GET /api/v1/weather/forecast/facility/:id
```

### Correlation Analysis
```
GET /api/v1/weather/correlation/facility/:id?days={days}
```

## Component Usage

### Weather Overlay
```tsx
import { WeatherOverlay } from './components/geospatial/WeatherOverlay';

<WeatherOverlay
  visible={true}
  highContrastMode={false}
  onFacilitySelect={(facilityId) => {
    console.log('Selected facility:', facilityId);
  }}
  height={400}
/>
```

### Weather Details Panel
```tsx
import { WeatherDetailsPanel } from './components/geospatial/WeatherDetailsPanel';

<WeatherDetailsPanel
  facilityId="facility-123"
  onClose={() => setShowPanel(false)}
  highContrastMode={false}
/>
```

### Weather Marker (Standalone)
```tsx
import { WeatherMarker } from './components/geospatial/WeatherMarker';

<WeatherMarker
  weather={weatherData}
  position={{ xPercent: 50, yPercent: 50 }}
  facilityName="Factory A"
  onClick={() => handleClick()}
  highContrastMode={false}
/>
```

## Hooks

### useWeather
Fetches weather for all facilities:
```tsx
import { useWeather } from './hooks/useWeather';

const { loading, error, facilitiesWeather, refreshWeather } = useWeather();
```

### useFacilityWeather
Fetches weather, forecast, and correlation for a specific facility:
```tsx
import { useFacilityWeather } from './hooks/useWeather';

const { 
  weather, 
  forecast, 
  correlation, 
  refreshWeather,
  refreshForecast,
  refreshCorrelation 
} = useFacilityWeather(facilityId);
```

## Environment Variables

Add to `.env`:
```bash
WEATHER_API_KEY=your_openweathermap_api_key
WEATHER_API_URL=https://api.openweathermap.org/data/2.5  # Optional
```

Get a free API key from: https://openweathermap.org/api

## Database Requirements

Facilities must have `latitude` and `longitude` columns:
```sql
ALTER TABLE facilities 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);
```

## Testing

### Backend Tests
```bash
cd services/backend
npm test services/weatherService.test.ts
```

### Frontend Tests
```bash
cd services/frontend
npm test WeatherMarker.test.tsx
```

## Performance Considerations

1. **Caching Strategy**:
   - Current weather: 10 minutes
   - Forecast: 1 hour
   - Historical: 24 hours

2. **Batch Requests**: 
   - `/weather/facilities` endpoint fetches all facility weather in parallel

3. **Rate Limiting**: 
   - Free tier: 60 calls/minute
   - Paid tier: 600 calls/minute

4. **Optimization**: 
   - Use facility-specific endpoints for single facility views
   - Historical data is fetched on-demand only

## Accessibility

- ✅ ARIA labels for all interactive elements
- ✅ Keyboard navigation support
- ✅ High contrast mode
- ✅ Screen reader announcements
- ✅ Semantic HTML structure

## Files Created

### Backend
- `services/backend/src/services/weatherService.ts` - Core weather service
- `services/backend/src/routes/weather.ts` - API routes
- `services/backend/src/services/__tests__/weatherService.test.ts` - Tests

### Frontend
- `services/frontend/src/types/weather.ts` - TypeScript types
- `services/frontend/src/hooks/useWeather.ts` - React hooks
- `services/frontend/src/components/geospatial/WeatherMarker.tsx` - Marker component
- `services/frontend/src/components/geospatial/WeatherOverlay.tsx` - Overlay component
- `services/frontend/src/components/geospatial/WeatherDetailsPanel.tsx` - Details panel
- `services/frontend/src/components/__tests__/WeatherMarker.test.tsx` - Tests

### Modified
- `services/backend/src/app.ts` - Added weather routes

## Next Steps

1. **Alert Integration**: Connect weather alerts to existing alert system
2. **Mobile Optimization**: Responsive design for mobile views
3. **Data Persistence**: Store historical weather data in database
4. **Advanced Analytics**: ML-based weather impact predictions
5. **Multi-language**: Internationalization support

## Support

For issues or questions, refer to:
- OpenWeatherMap API docs: https://openweathermap.org/api
- Internal geospatial documentation: `docs/GEOSPATIAL_API.md`
