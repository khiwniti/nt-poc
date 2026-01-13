# T190: Report Analytics Tracking - Quick Reference

## 🎯 What Was Built
Complete analytics tracking system for reports with dashboard, charts, and CSV export.

## 📁 Key Files

### Backend
```
migrations/20240105000000_create_report_analytics.ts    # Database schema
src/types/reportAnalytics.ts                            # TypeScript types
src/services/reportAnalyticsService.ts                  # Business logic
src/routes/reportAnalytics.ts                           # API endpoints
src/app.ts                                              # Route registration
```

### Frontend
```
src/pages/ReportAnalyticsDashboard.tsx                  # Analytics dashboard UI
src/pages/ReportsPage.tsx                               # Updated with tracking
src/api/reportAnalytics.ts                              # API client
```

### Tests
```
src/routes/__tests__/reportAnalytics.test.ts           # Route tests
src/services/__tests__/reportAnalyticsService.test.ts  # Service tests
e2e/report-analytics.spec.ts                           # E2E tests
```

## 🔌 API Endpoints

### Track Event
```
POST /api/v1/report-analytics/track
Body: {
  report_id: string,
  event_type: 'view' | 'download' | 'email_open' | 'email_click',
  format?: 'pdf' | 'csv' | 'xlsx',
  metadata?: object
}
```

### Get Events
```
GET /api/v1/report-analytics/events?report_id=&event_type=&limit=100
```

### Get Summary
```
GET /api/v1/report-analytics/summary/:reportId
```

### Get Popular Reports
```
GET /api/v1/report-analytics/popular?limit=10
```

### Get Dashboard
```
GET /api/v1/report-analytics/dashboard?days=30
```

### Export CSV
```
GET /api/v1/report-analytics/export?event_type=&start_date=
```

## 💾 Database Schema

### Tables
- `report_analytics_events` - Individual tracking events
- `report_analytics_summary` - Aggregated statistics per report

### Event Types
- `view` - Report viewed
- `download` - Report downloaded (with format: pdf/csv/xlsx)
- `email_open` - Email opened
- `email_click` - Email link clicked

## 🎨 Dashboard Features

1. **Overview Stats** - Total reports, views, downloads, email metrics
2. **Format Breakdown** - Downloads by PDF/CSV/XLSX
3. **Popular Reports** - Ranked by engagement score
4. **Timeline Chart** - Views/downloads/emails over time
5. **Recent Activity** - Latest events feed
6. **Time Range** - 7/30/90 day filters
7. **CSV Export** - Download full analytics data

## 📊 Engagement Scoring
```
engagement_score = (views × 1) + (downloads × 3) + (email_opens × 2) + (email_clicks × 4)
```

## 🧪 Testing

### Run Backend Tests
```bash
cd services/backend
npm test reportAnalytics
```

### Run E2E Tests
```bash
cd services/frontend
npm run test:e2e -- report-analytics
```

## 🚀 Quick Start

### 1. Run Migration
```bash
cd services/backend
npm run migrate
```

### 2. Start Services
```bash
# Backend
cd services/backend && npm start

# Frontend
cd services/frontend && npm run dev
```

### 3. Access Dashboard
Navigate to `/report-analytics` in the frontend application.

### 4. Track Events
Events are automatically tracked when:
- Generating/viewing reports
- Downloading reports (PDF/CSV/XLSX)
- Sending test emails

## 💻 Code Examples

### Track View Event
```typescript
await reportAnalyticsAPI.trackEvent({
  report_id: 'uuid',
  event_type: 'view',
  metadata: { template: 'utilization' }
});
```

### Track Download Event
```typescript
await reportAnalyticsAPI.trackEvent({
  report_id: 'uuid',
  event_type: 'download',
  format: 'pdf'
});
```

### Get Dashboard Data
```typescript
const data = await reportAnalyticsAPI.getDashboard(30);
console.log(data.overview.total_views);
console.log(data.popular_reports[0].report_name);
```

### Export to CSV
```typescript
const blob = await reportAnalyticsAPI.exportToCSV({
  event_type: 'download',
  start_date: '2024-01-01'
});
// Handle blob download
```

## 🔍 Troubleshooting

### Events Not Tracking
- Check authentication headers
- Verify report_id exists in reports table
- Check browser console for errors

### Dashboard Not Loading
- Verify backend is running
- Check API endpoint configuration
- Ensure database migration ran successfully

### Summary Not Updating
- Summaries update asynchronously (wait ~100ms)
- Check backend logs for errors
- Verify database constraints

## ✅ Acceptance Criteria Status

- ✅ Track report views
- ✅ Track downloads by format
- ✅ Track email opens and clicks
- ✅ Usage dashboard with charts
- ✅ Most popular reports ranking
- ✅ Export usage data to CSV

## 📚 Related Documentation
- Full implementation details: `T190_IMPLEMENTATION_COMPLETE.md`
- Database schema: `migrations/20240105000000_create_report_analytics.ts`
- API types: `src/types/reportAnalytics.ts`
