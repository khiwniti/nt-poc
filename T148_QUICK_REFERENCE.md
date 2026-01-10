# T148: Health Score Dashboard - Quick Reference

## What Was Built
A comprehensive battery health monitoring dashboard showing facility-wide health metrics, trends, and at-risk systems.

## Key Features
✅ Facility-wide health summary with color-coded metrics  
✅ Health score distribution histogram  
✅ 30-day rolling average trend chart  
✅ Zone-level health aggregation table  
✅ At-risk batteries list (health < 70)  
✅ CSV export functionality  

## API Endpoints

### Get Health Summary
```
GET /api/v1/battery-health/facility/:facilityId/summary
```
Returns: total batteries, avg score, at-risk count, healthy count, warning count

### Get Distribution
```
GET /api/v1/battery-health/facility/:facilityId/distribution
```
Returns: histogram buckets with battery counts

### Get At-Risk Batteries
```
GET /api/v1/battery-health/facility/:facilityId/at-risk?threshold=70
```
Returns: list of batteries below threshold

### Get Health Trend
```
GET /api/v1/battery-health/facility/:facilityId/trend?days=30
```
Returns: daily average health scores

### Get Zone Stats
```
GET /api/v1/battery-health/facility/:facilityId/by-zone
```
Returns: aggregated health stats per zone

### Export Report
```
GET /api/v1/battery-health/facility/:facilityId/export
```
Returns: CSV file with complete health report

## Frontend Route
```
/health-dashboard
```

## Health Score Thresholds
- **Healthy**: ≥90 (green)
- **Warning**: 70-89 (yellow)
- **At-Risk**: <70 (red)

## Files Added
**Backend:**
- `services/backend/src/routes/batteryHealth.ts`
- `services/backend/src/routes/__tests__/batteryHealth.test.ts`

**Frontend:**
- `services/frontend/src/pages/HealthScoreDashboard.tsx`
- `services/frontend/src/pages/__tests__/HealthScoreDashboard.test.tsx`
- `services/frontend/src/types/batteryHealth.ts`
- `services/frontend/src/api/batteryHealth.ts`

**Modified:**
- `services/backend/src/app.ts` (route added)
- `services/frontend/src/App.tsx` (route added)
- `services/frontend/src/components/Header.tsx` (nav link added)

## Testing
Backend tests verify:
- All 6 API endpoints
- Authentication
- Data accuracy
- Custom thresholds

Frontend tests verify:
- Component rendering
- Data loading
- User interactions
- Error handling

## Usage Example
1. Navigate to `/health-dashboard`
2. Enter facility ID: `fac-001`
3. Click "Load Dashboard"
4. View metrics, charts, and tables
5. Click "Export Report" for CSV download

## Data Source
Health scores are based on SOH (State of Health) from the `sensor_readings` table. Latest reading per battery is used for current metrics.

## Quick Wins
- Zero additional database tables needed
- Reuses existing SOH data
- Standard REST API patterns
- Responsive dashboard design
- Export-ready for external tools
