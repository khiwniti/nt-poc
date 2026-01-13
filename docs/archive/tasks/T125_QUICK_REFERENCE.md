# T125: Alert Filtering Controls - Quick Reference

## Usage

### Accessing Filters
Navigate to `/alerts` page to see the new filter controls.

### Applying Filters

1. **Status Filter**
   - Select one or more: Active, Acknowledged, Resolved
   - Multiple selections allowed

2. **Severity Filter**
   - Select one or more: Critical, Warning, Info
   - Color-coded for easy identification

3. **Alert Type Filter**
   - Select from: Temperature High, Voltage Anomaly, SoC Critical, Communication Lost, Capacity Degraded
   - Multiple selections allowed

4. **Date Range Filter**
   - Quick options: Last 24 Hours, Last 7 Days, Last 30 Days
   - Custom Range: Select start and end dates, then click Apply

5. **Apply Filters**
   - Click "Apply Filters" button to execute the search

6. **Clear Filters**
   - Click "Clear All" button to reset all filters to default

### URL Parameters

Filters are automatically saved to URL parameters, allowing you to:
- Share filtered views with team members
- Bookmark specific filter combinations
- Use browser back/forward buttons to navigate filter history

**Example URLs:**
```
# Critical alerts only
/alerts?severity=critical

# Active and acknowledged alerts
/alerts?status=active,acknowledged

# Multiple filters
/alerts?status=active&severity=critical,warning&dateRange=7d

# Custom date range
/alerts?dateRange=custom&startDate=2024-01-01&endDate=2024-01-31
```

## API Usage

### Frontend API Call
```typescript
import { alertsApi } from '../api/alerts';

// Get filtered alerts
const response = await alertsApi.getAlerts({
  status: 'active,acknowledged',
  severity: 'critical,warning',
  type: 'Temperature High',
  page: 1,
  limit: 20
});
```

### Using the Store
```typescript
import { useAlertFilterStore } from '../stores/alertFilterStore';

function MyComponent() {
  const { status, severity, setStatus, clearFilters } = useAlertFilterStore();
  
  // Set filters
  setStatus(['active', 'critical']);
  
  // Clear all
  clearFilters();
  
  // Get URL params
  const params = useAlertFilterStore.getState().getURLParams();
  
  // Set from URL params
  const searchParams = new URLSearchParams(window.location.search);
  useAlertFilterStore.getState().setFromURLParams(searchParams);
}
```

## Component Integration

```tsx
import { AlertFilterControls } from '../components/AlertFilterControls';

function AlertsPage() {
  const handleApplyFilters = () => {
    // Fetch data with updated filters
    fetchAlerts();
  };
  
  return (
    <div>
      <AlertFilterControls onApplyFilters={handleApplyFilters} />
      {/* Rest of page */}
    </div>
  );
}
```

## Testing

### Run Tests
```bash
# Store tests
cd services/frontend
npx vitest alertFilterStore.test.ts --run

# Component tests
npx vitest AlertFilterControls.test.tsx --run

# All frontend tests
npx vitest --run

# Backend tests
cd services/backend
npx vitest alerts --run
```

## Architecture

```
┌─────────────────────────────────────────┐
│         AlertsPage Component            │
│  ┌─────────────────────────────────┐   │
│  │   AlertFilterControls           │   │
│  │   - Status checkboxes           │   │
│  │   - Severity checkboxes         │   │
│  │   - Type checkboxes             │   │
│  │   - Date range buttons          │   │
│  │   - Apply/Clear buttons         │   │
│  └─────────────────────────────────┘   │
│              ↕                          │
│  ┌─────────────────────────────────┐   │
│  │   useAlertFilterStore           │   │
│  │   - Filter state                │   │
│  │   - URL serialization           │   │
│  └─────────────────────────────────┘   │
│              ↕                          │
│  ┌─────────────────────────────────┐   │
│  │   useSearchParams               │   │
│  │   - URL parameter sync          │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│         Backend API                     │
│   GET /api/v1/alerts                    │
│   ?status=active,acknowledged           │
│   &severity=critical,warning            │
│   &type=Temperature High                │
└─────────────────────────────────────────┘
```

## Files Reference

### Frontend
- **Store**: `services/frontend/src/stores/alertFilterStore.ts`
- **Component**: `services/frontend/src/components/AlertFilterControls.tsx`
- **Page**: `services/frontend/src/pages/AlertsPage.tsx`
- **API**: `services/frontend/src/api/alerts.ts`
- **Tests**: 
  - `services/frontend/src/stores/__tests__/alertFilterStore.test.ts`
  - `services/frontend/src/components/__tests__/AlertFilterControls.test.tsx`

### Backend
- **Routes**: `services/backend/src/routes/alerts.ts`
- **Tests**: `services/backend/src/routes/__tests__/alertsEmail.test.ts`

## Troubleshooting

### Filters not applying
- Check browser console for errors
- Ensure "Apply Filters" button was clicked
- Verify URL parameters are correct

### URL not updating
- Check that `setSearchParams` is working
- Verify router is configured correctly
- Check browser URL encoding

### Store state not persisting
- Verify store initialization
- Check URL parameter parsing
- Ensure `setFromURLParams` is called on mount

### Custom date range not working
- Ensure both start and end dates are selected
- Click "Apply" button after selecting dates
- Check date format (YYYY-MM-DD)

## Performance Notes

- Filters are applied on API request, minimizing frontend computation
- Frontend filtering for type and custom dates is efficient for <1000 items
- URL updates don't trigger re-renders unless necessary
- Store uses Zustand's built-in optimizations
