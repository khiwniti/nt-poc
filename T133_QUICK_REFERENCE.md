# T133: Alert History View - Quick Reference

## Overview
Complete alert history view with timeline visualization, filtering, pagination, and CSV export.

## Access
Navigate to `/alerts` route in the application.

## Key Features

### 1. Statistics Dashboard
- **Total Alerts**: Overview count
- **Critical Alerts**: High-priority count
- **Warning Alerts**: Medium-priority count  
- **Avg Resolution Time**: Mean time to resolve

### 2. Timeline Visualization
- 30-day historical view
- Line chart with multiple series:
  - 🔴 Critical alerts
  - 🟠 Warning alerts
  - 🔵 Info alerts
  - 🟢 Resolved alerts (dashed line)

### 3. Filtering
```
Battery ID:  [text input]     Zone ID:    [text input]
Severity:    [dropdown]        Status:     [dropdown]
```

**Filter Options:**
- Severity: All, Critical, Warning, Info
- Status: All, Active, Acknowledged, Resolved

### 4. Alert Table
| Column | Description |
|--------|-------------|
| ID | Alert identifier |
| Battery | Battery system ID |
| Zone | Zone identifier |
| Type | Alert type/category |
| Severity | Critical/Warning/Info badge |
| Status | Active/Acknowledged/Resolved badge |
| Created | Timestamp |
| Duration | Resolution time (hours & minutes) |

### 5. Pagination
- 20 items per page (default)
- Previous/Next navigation
- Page indicator: "Page X of Y"
- Results count: "Showing 1 to 20 of 100 results"

### 6. CSV Export
Click "Export to CSV" button to download:
- Filename: `alert-history-{timestamp}.csv`
- Includes all current page alerts
- All fields with formatted dates

## API Endpoints

### List Alerts
```
GET /api/v1/alerts?page=1&limit=20&batteryId=battery-1&severity=critical
```

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `batteryId`: Filter by battery
- `zoneId`: Filter by zone
- `severity`: Filter by severity
- `status`: Filter by status
- `sortBy`: Sort field (default: createdAt)
- `sortOrder`: asc/desc (default: desc)

**Response:**
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### Get Alert Statistics
```
GET /api/v1/alerts/stats/summary?batteryId=battery-1
```

**Response:**
```json
{
  "data": {
    "total": 100,
    "bySeverity": { "critical": 30, "warning": 50, "info": 20 },
    "byStatus": { "active": 10, "acknowledged": 20, "resolved": 70 },
    "averageResolutionTime": 3600000
  }
}
```

### Get Timeline Data
```
GET /api/v1/alerts/timeline/data?days=30&batteryId=battery-1
```

**Response:**
```json
{
  "data": [
    {
      "date": "2024-01-01",
      "timestamp": 1704067200000,
      "total": 5,
      "critical": 2,
      "warning": 2,
      "info": 1,
      "resolved": 3
    }
  ]
}
```

## Usage Examples

### Filter by Battery
1. Enter battery ID in "Battery ID" field (e.g., "battery-1")
2. Data automatically refreshes

### Filter by Multiple Criteria
1. Enter battery ID: "battery-1"
2. Select severity: "Critical"
3. Select status: "Active"
4. View filtered results

### Export Filtered Data
1. Apply desired filters
2. Click "Export to CSV" button
3. File downloads automatically

### Navigate Pages
1. Use Previous/Next buttons
2. Or select specific page number
3. Results update automatically

## Color Coding

### Severity Badges
- 🔴 **Critical**: Red (`#ef4444`)
- 🟠 **Warning**: Orange (`#f59e0b`)
- 🔵 **Info**: Blue (`#3b82f6`)

### Status Badges
- 🔴 **Active**: Red (`#ef4444`)
- 🟠 **Acknowledged**: Orange (`#f59e0b`)
- 🟢 **Resolved**: Green (`#10b981`)

## Technical Details

### Frontend Files
- **Component**: `services/frontend/src/pages/AlertsPage.tsx`
- **API**: `services/frontend/src/api/alerts.ts`
- **Route**: `/alerts` (lazy loaded)

### Backend Files
- **Routes**: `services/backend/src/routes/alerts.ts`
- **Registration**: `services/backend/src/app.ts`

### Dependencies
- **recharts**: Timeline visualization
- **lucide-react**: Icons

## Developer Notes

### Mock Data
- Generates 100 sample alerts
- Random distribution across 30 days
- Varies severity, status, and types

### Customization
- Adjust page size in `AlertsPage.tsx` (default: 20)
- Modify timeline days in API call (default: 30)
- Add custom alert types in backend generator

### Integration
Replace mock data with database queries:
1. Update `services/backend/src/routes/alerts.ts`
2. Replace `generateMockAlerts()` with DB queries
3. Maintain same response structure

## Troubleshooting

### No Data Showing
- Check API endpoint is accessible
- Verify filters aren't too restrictive
- Check browser console for errors

### Chart Not Rendering
- Ensure recharts is installed
- Check browser console for errors
- Verify timeline data format

### Export Not Working
- Check browser allows downloads
- Verify alerts array has data
- Check console for errors

## Future Enhancements
- Real-time updates via WebSocket
- Alert details modal
- Bulk operations (acknowledge/resolve)
- Advanced date range filtering
- Custom export date ranges
- Alert notification preferences
