# Offline Support Implementation (T066-US1)

## Overview
This implementation adds PWA (Progressive Web App) capabilities with offline support using Workbox service workers and IndexedDB for client-side data caching.

## Features Implemented

### 1. Service Worker with Workbox
- **Location**: `services/frontend/vite.config.ts`
- **Auto-update**: Service worker automatically updates when new versions are available
- **Caching Strategies**:
  - **NetworkFirst** for API calls: Tries network first, falls back to cache (5-minute cache)
  - **CacheFirst** for images: Serves from cache first, 30-day expiration
- **Precaching**: All static assets (JS, CSS, HTML, images) are precached

### 2. PWA Manifest
- **Name**: Facility Manager 3D
- **Theme**: Blue (#3b82f6)
- **Display**: Standalone (app-like experience)
- **Icons**: Configured for 192x192 and 512x512 sizes

### 3. IndexedDB Storage
- **Location**: `services/frontend/src/utils/offlineStorage.ts`
- **Database**: FacilityManagerDB (using Dexie.js)
- **Tables**:
  - `sensorReadings`: Stores sensor data with batterySystemId and time indices
  - `alerts`: Stores alerts with batterySystemId and status indices
- **Features**:
  - Automatic cleanup: Keeps only last 1000 sensor readings
  - Efficient querying by batterySystemId
  - Active alert filtering

### 4. Offline Detection
- **Location**: `services/frontend/src/hooks/useOnlineStatus.ts`
- **Hook**: `useOnlineStatus()` - React hook that monitors online/offline status
- **Uses**: Browser's `navigator.onLine` API and online/offline events

### 5. Offline Banner Component
- **Location**: `services/frontend/src/components/OfflineBanner.tsx`
- **Behavior**: Displays warning banner when user goes offline
- **Styling**: Orange background with WiFi-off icon
- **Auto-hide**: Disappears when connection is restored

## Dependencies Added

```json
{
  "dependencies": {
    "dexie": "^3.2.4",
    "dexie-react-hooks": "^1.1.6",
    "lucide-react": "latest"
  },
  "devDependencies": {
    "vite-plugin-pwa": "^0.17.4",
    "workbox-window": "latest",
    "fake-indexeddb": "latest"
  }
}
```

## Usage Examples

### Using Offline Storage

```typescript
import { offlineStorage } from './utils/offlineStorage';
import { useOnlineStatus } from './hooks/useOnlineStatus';

// Cache sensor reading
await offlineStorage.cacheSensorReading({
  batterySystemId: 'battery-1',
  time: Date.now(),
  voltage: 12.5,
  current: 2.3,
  temperature: 25.0,
});

// Get latest readings
const readings = await offlineStorage.getLatestReadings('battery-1', 100);

// Cache alert
await offlineStorage.cacheAlert({
  id: 'alert-123',
  batterySystemId: 'battery-1',
  status: 'active',
  severity: 'high',
  createdAt: Date.now(),
});

// Get active alerts
const activeAlerts = await offlineStorage.getActiveAlerts();
```

### Using Offline Status Hook

```typescript
import { useOnlineStatus } from './hooks/useOnlineStatus';

function MyComponent() {
  const isOnline = useOnlineStatus();
  
  return (
    <div>
      {isOnline ? 'Connected' : 'Offline'}
    </div>
  );
}
```

### Adding Offline Banner to App

```typescript
import { OfflineBanner } from './components/OfflineBanner';

function App() {
  return (
    <>
      <OfflineBanner />
      {/* Rest of your app */}
    </>
  );
}
```

## Testing

All functionality is thoroughly tested:

- **Unit Tests**: 25 tests covering all offline features
- **Test Files**:
  - `useOnlineStatus.test.ts` - Online/offline status detection
  - `offlineStorage.test.ts` - IndexedDB caching operations
  - `OfflineBanner.test.tsx` - UI component behavior

Run tests:
```bash
npm test
```

## Build

The service worker is automatically generated during the build process:

```bash
npm run build
```

Generated files:
- `dist/sw.js` - Service worker
- `dist/manifest.webmanifest` - PWA manifest
- `dist/workbox-*.js` - Workbox runtime
- `dist/registerSW.js` - Service worker registration

## Architecture Decisions

1. **Workbox over Manual SW**: Provides battle-tested caching strategies and automatic updates
2. **Dexie over Raw IndexedDB**: Type-safe, Promise-based API with better DX
3. **NetworkFirst for API**: Ensures fresh data when online, fallback for offline
4. **CacheFirst for Images**: Reduces bandwidth and improves performance
5. **Limited Cache Size**: 1000 readings and 50 images prevent storage bloat

## Future Enhancements

- Background sync for queuing offline mutations
- Push notifications for critical alerts
- Offline-first data synchronization
- Service worker update notifications
- Cache management UI

## Acceptance Criteria ✅

- ✅ Service worker with Workbox configured
- ✅ PWA manifest with proper metadata
- ✅ IndexedDB caching with Dexie
- ✅ Offline detection hook implemented
- ✅ NetworkFirst for API, CacheFirst for images
- ✅ Comprehensive test coverage
- ✅ Build successfully generates service worker
