# T200: Weather Overlay - Quick Reference

## Quick Start

### Setup
1. Get OpenWeatherMap API key: https://openweathermap.org/api
2. Add to `.env`: `WEATHER_API_KEY=your_key_here`
3. Ensure facilities have latitude/longitude in database

### Basic Usage

**Display weather overlay:**
```tsx
import { WeatherOverlay } from './components/geospatial/WeatherOverlay';

<WeatherOverlay visible={true} onFacilitySelect={(id) => console.log(id)} />
```

**Show facility details:**
```tsx
import { WeatherDetailsPanel } from './components/geospatial/WeatherDetailsPanel';

<WeatherDetailsPanel facilityId={id} onClose={() => setShow(false)} />
```

**Fetch weather data:**
```tsx
import { useWeather } from './hooks/useWeather';

const { facilitiesWeather, loading, error } = useWeather();
```

## API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /api/v1/weather/facilities` | All facilities weather |
| `GET /api/v1/weather/facility/:id` | Single facility weather |
| `GET /api/v1/weather/forecast/facility/:id` | 7-day forecast |
| `GET /api/v1/weather/correlation/facility/:id?days=30` | Correlation analysis |

## Alert Thresholds

| Severity | Heat | Cold |
|----------|------|------|
| Extreme | ≥40°C | ≤-20°C |
| High | ≥35°C | ≤-10°C |

## Features Checklist

- [x] Weather API integration (OpenWeatherMap)
- [x] Current weather display on markers
- [x] Temperature overlay on map
- [x] Weather-based alerts (extreme heat/cold)
- [x] 7-day forecast for facilities
- [x] Historical weather correlation analysis

## Key Components

- **WeatherOverlay**: Main map overlay with all facility weather
- **WeatherMarker**: Individual facility weather marker
- **WeatherDetailsPanel**: Detailed weather panel with forecast and correlation
- **useWeather**: Hook for fetching all facilities weather
- **useFacilityWeather**: Hook for single facility weather/forecast/correlation

## Files

**Backend:**
- `services/backend/src/services/weatherService.ts`
- `services/backend/src/routes/weather.ts`

**Frontend:**
- `services/frontend/src/components/geospatial/WeatherOverlay.tsx`
- `services/frontend/src/components/geospatial/WeatherMarker.tsx`
- `services/frontend/src/components/geospatial/WeatherDetailsPanel.tsx`
- `services/frontend/src/hooks/useWeather.ts`
- `services/frontend/src/types/weather.ts`

## Testing

```bash
# Backend
cd services/backend && npm test weatherService.test.ts

# Frontend
cd services/frontend && npm test WeatherMarker.test.tsx
```

## Troubleshooting

**No weather data showing:**
- Check `WEATHER_API_KEY` is set
- Verify facilities have latitude/longitude
- Check API rate limits (60 req/min free tier)

**Alerts not appearing:**
- Temperature must be ≥35°C or ≤-10°C
- Check browser console for errors

**Correlation not loading:**
- Ensure historical data exists in database
- Check date range (max 90 days)
