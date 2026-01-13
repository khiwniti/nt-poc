# T146: RUL Trend Chart - Quick Reference

## Quick Start

### View the Chart
1. Navigate to `/ai-insights` in your browser
2. Enter a battery system ID (UUID)
3. Click "Load Predictions" or press Enter
4. View the RUL trend chart with confidence bands

### Component Usage

```tsx
import { RULTrendChart } from '@/components/RULTrendChart';
import { getRULPredictions } from '@/api/rulPredictions';

// Fetch predictions
const predictions = await getRULPredictions('battery-uuid');

// Render chart
<RULTrendChart 
  predictions={predictions} 
  warningThreshold={30} // optional, defaults to 30
/>
```

## API Endpoints

### Get Predictions
```bash
GET /api/v1/predictions/:batteryId?limit=100&offset=0
Authorization: Bearer <token>
```

### Get Latest Prediction
```bash
GET /api/v1/predictions/:batteryId/latest
Authorization: Bearer <token>
```

## Key Features

### Chart Elements
- **Blue Line**: Predicted RUL over time
- **Light Blue Area**: Confidence bands (±1 standard deviation)
- **Red Dashed Line**: Warning threshold (configurable)
- **Dots**: Individual prediction data points

### Interactivity
- **Hover**: See detailed prediction info in tooltip
- **Export Button**: Download chart as PNG image
- **Responsive**: Automatically resizes to container

### Tooltip Information
- Date of prediction
- Predicted RUL (days)
- Confidence percentage
- Confidence range
- Model version

## Testing

```bash
# Run tests
cd services/frontend
npm test -- RULTrendChart.test.tsx AIInsights.test.tsx --run

# Build
npm run build
```

## File Structure

```
services/frontend/src/
├── api/
│   └── rulPredictions.ts          # API client
├── components/
│   ├── RULTrendChart.tsx          # Chart component
│   └── __tests__/
│       └── RULTrendChart.test.tsx # Component tests
├── pages/
│   ├── AIInsights.tsx             # Main page
│   └── __tests__/
│       └── AIInsights.test.tsx    # Page tests
└── types/
    └── rulPrediction.ts           # TypeScript types
```

## Common Tasks

### Change Warning Threshold
```tsx
<RULTrendChart predictions={data} warningThreshold={50} />
```

### Handle Loading State
```tsx
{loading ? <div>Loading...</div> : <RULTrendChart predictions={data} />}
```

### Handle Empty Data
```tsx
{predictions.length === 0 ? (
  <div>No predictions available</div>
) : (
  <RULTrendChart predictions={predictions} />
)}
```

### Export Chart Programmatically
The export button triggers the PNG download automatically.

## Dependencies

- **recharts**: ^3.6.0 (charting library)
- **html2canvas**: Latest (PNG export)
- **@testing-library/user-event**: Latest (testing)

## Troubleshooting

### Chart not displaying
- Check that predictions array is not empty
- Verify predictions have valid dates
- Check browser console for errors

### Export not working
- Ensure html2canvas loaded successfully
- Check browser console for errors
- Try in a different browser

### API errors
- Verify battery system ID is valid UUID
- Check authentication token is present
- Confirm backend is running and accessible

## Performance Tips

- Limit predictions to last 100 entries for optimal performance
- Chart automatically sorts and processes data efficiently
- html2canvas only loads when export is triggered

## Browser Support

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support
- Mobile browsers: ✅ Responsive design

## Related Documentation

- Full implementation: `T146_RUL_TREND_CHART_COMPLETE.md`
- Backend API: `RUL_PREDICTION_IMPLEMENTATION.md`
- Task details: Task T146 (US4)
