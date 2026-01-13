# T122: AlertDetail Modal - Quick Reference

## Usage

### Opening the Modal
Click any row in the Alerts table to open the AlertDetail modal.

```typescript
// In AlertsPage.tsx
<tr onClick={() => setSelectedAlertId(alert.id)}>
  {/* Alert row content */}
</tr>

{selectedAlertId && (
  <AlertDetailModal
    alertId={selectedAlertId}
    onClose={() => setSelectedAlertId(null)}
    onUpdate={() => fetchData()}
  />
)}
```

### Modal Props
```typescript
interface AlertDetailModalProps {
  alertId: string;        // ID of the alert to display
  onClose: () => void;    // Called when modal should close
  onUpdate?: () => void;  // Called after acknowledge/resolve actions
}
```

## API Endpoints

### Get Alert History
```http
GET /api/v1/alerts/:id/history
```
**Response:**
```json
{
  "readings": [
    {
      "timestamp": 1704844800000,
      "temperature": 25.5,
      "voltage": 3.7,
      "soc": 85
    }
  ],
  "timeline": [
    {
      "timestamp": 1704844800000,
      "event": "Alert Created",
      "user": "System",
      "notes": "Optional notes"
    }
  ]
}
```

### Acknowledge Alert
```http
POST /api/v1/alerts/:id/acknowledge
```
**Response:**
```json
{
  "data": {
    "id": "alert-1",
    "status": "acknowledged",
    "acknowledgedAt": 1704844800000,
    // ... other alert fields
  }
}
```

### Resolve Alert
```http
POST /api/v1/alerts/:id/resolve
Content-Type: application/json

{
  "notes": "Fixed temperature issue by cleaning cooling system"
}
```
**Response:**
```json
{
  "data": {
    "id": "alert-1",
    "status": "resolved",
    "resolvedAt": 1704844800000,
    "duration": 3600000,
    // ... other alert fields
  }
}
```

## Features

### Alert Information Section
- Severity badge (color-coded)
- Status badge (active, acknowledged, resolved)
- Alert type and message
- Created/acknowledged/resolved timestamps
- Battery System ID and Zone ID
- Threshold and actual values from metadata

### Historical Context
- Last 24 hours of sensor readings
- Temperature, Voltage, SoC chart
- Interactive Recharts visualization
- Automatic time formatting

### Timeline Visualization
- Chronological event list
- Event names and timestamps
- User attribution
- Resolution notes display

### Actions
- **Acknowledge** (active alerts only)
  - One-click acknowledgment
  - Updates status immediately
  - Shows loading state

- **Resolve** (active/acknowledged alerts)
  - Requires resolution notes
  - Validates notes field
  - Button disabled until notes provided
  - Updates status and records duration

### UI/UX
- Click outside to close
- Scrollable content area
- Sticky header
- Loading states
- Error handling
- Responsive design
- Hover effects on table rows

## Testing

### Run Frontend Tests
```bash
cd services/frontend
npx vitest run AlertDetailModal.test.tsx
```

### Run Backend Tests
```bash
cd services/backend
npx vitest run alertDetail.test.ts
```

## Component Structure

```
AlertDetailModal
├── Header (sticky)
│   ├── Title
│   ├── Alert ID
│   └── Close Button
├── Content (scrollable)
│   ├── Error Display (if error)
│   ├── Alert Information
│   │   ├── Severity/Status Badges
│   │   ├── Type/Created timestamps
│   │   └── Message
│   ├── Affected Assets
│   │   ├── Battery System
│   │   ├── Zone
│   │   └── Metadata (threshold, value)
│   ├── Historical Context
│   │   └── Sensor Readings Chart
│   ├── Timeline
│   │   └── Event List
│   └── Resolution Actions
│       ├── Acknowledge Button (if active)
│       ├── Notes Textarea
│       └── Resolve Button
└── Overlay (click to close)
```

## Key Files
- `services/frontend/src/components/AlertDetailModal.tsx` - Main component
- `services/frontend/src/components/__tests__/AlertDetailModal.test.tsx` - Tests
- `services/frontend/src/api/alerts.ts` - API client
- `services/backend/src/routes/alerts.ts` - Backend endpoints
- `services/backend/src/routes/__tests__/alertDetail.test.ts` - Backend tests

## Color Scheme
- **Critical**: Red (#ef4444)
- **Warning**: Orange (#f59e0b)
- **Info**: Blue (#3b82f6)
- **Active**: Red (#ef4444)
- **Acknowledged**: Orange (#f59e0b)
- **Resolved**: Green (#10b981)
