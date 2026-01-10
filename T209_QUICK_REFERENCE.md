# T209: Map Caching Quick Reference

## ✅ Acceptance Criteria
- [x] Cache map tiles with Redis (7d TTL)
- [x] Cache geocoding results (24h TTL)
- [x] Cache weather data (1h TTL)
- [x] Cache distance calculations (7d TTL)
- [x] Cache hit rate monitoring (Prometheus)
- [x] 70%+ cache hit rate target

## 📁 Files Created
- `services/backend/src/services/mapCache.ts`
- `services/backend/src/services/geospatialService.ts`
- `services/backend/src/routes/geospatial.ts`
- `services/backend/src/services/__tests__/mapCache.test.ts`
- `services/backend/src/services/__tests__/geospatialService.test.ts`
- `services/backend/src/routes/__tests__/geospatial.test.ts`

## 📝 Files Modified
- `services/backend/src/config/metrics.ts` (added map cache metrics)
- `services/backend/src/app.ts` (registered geospatial routes)
- `services/backend/.env.example` (added API keys)

## 🔧 Environment Variables
```bash
MAPBOX_ACCESS_TOKEN=your-mapbox-access-token
WEATHER_API_KEY=your-openweather-api-key
WEATHER_API_URL=https://api.openweathermap.org/data/2.5
REDIS_URL=redis://localhost:6379
```

## 🚀 API Endpoints
- `POST /api/v1/geospatial/geocode` - Convert address to coordinates
- `POST /api/v1/geospatial/reverse-geocode` - Convert coordinates to address
- `GET /api/v1/geospatial/weather` - Get weather data
- `POST /api/v1/geospatial/distance` - Calculate distance/duration
- `GET /api/v1/geospatial/tile-url` - Get map tile URL
- `GET /api/v1/geospatial/cache-stats` - Get cache statistics

## 📊 Metrics
- `map_cache_hits_total{cache_type}`
- `map_cache_misses_total{cache_type}`
- `map_cache_sets_total{cache_type}`
- `map_cache_errors_total{cache_type}`
- `map_cache_hit_rate{cache_type}`

## 🧪 Testing
```bash
npm test -- mapCache              # 23 tests
npm test -- geospatialService     # 21 tests  
npm test -- routes/geospatial     # 16 tests
```

## 🎯 Cache Strategy
- **Tiles**: 7 days (static content)
- **Geocoding**: 24 hours (addresses don't change)
- **Weather**: 1 hour (frequent updates)
- **Distance**: 7 days (routes stable)

## 📈 Expected Performance
- **Hit Rate**: 75-85% in production
- **Cost Savings**: 70%+ reduction in API calls
- **Response Time**: <10ms for cached requests

## 🔍 Monitoring
```bash
# View cache stats
curl http://localhost:3000/api/v1/geospatial/cache-stats \
  -H "Authorization: Bearer <token>"

# View Prometheus metrics
curl http://localhost:3000/metrics
```
