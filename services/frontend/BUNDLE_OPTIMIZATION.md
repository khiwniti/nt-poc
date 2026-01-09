# Bundle Size Optimization

This document describes the bundle size optimizations implemented for the frontend application.

## Implementation Summary

### 1. Code Splitting Strategy

#### Route-Based Splitting
- **Critical Routes (Eager Loading)**: Login, Dashboard
- **Non-Critical Routes (Lazy Loading)**: 3D View, Zone Detail, Alerts, Reports, Unauthorized

```typescript
// Eager loaded
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';

// Lazy loaded with React.lazy()
const ThreeDView = lazy(() => import('./pages/ThreeDView'));
const ZoneDetail = lazy(() => import('./pages/ZoneDetail'));
```

### 2. Vendor Chunk Optimization

Manual chunking configured in `vite.config.ts`:

- **vendor-react**: React core libraries (react, react-dom, react-router-dom)
- **vendor-state**: State management (zustand)
- **vendor-charts**: Data visualization (recharts)
- **vendor-3d**: 3D rendering (three, @react-three/fiber, @react-three/drei)
- **vendor-utils**: Utilities (axios, date-fns)

### 3. Build Optimizations

#### Minification
- **Target**: ES2020
- **Minifier**: Terser with aggressive compression
- **Console Removal**: `drop_console: true` in production
- **Debugger Removal**: `drop_debugger: true`

#### Bundle Analysis
```bash
npm run analyze
```

This generates an interactive visualization showing:
- Gzipped size
- Brotli compressed size
- Module composition

### 4. Resource Optimization

#### Preconnect
```html
<link rel="preconnect" href="http://localhost:3000" />
```

#### Font Preloading
```html
<link rel="preload" href="/fonts/inter.woff2" as="font" type="font/woff2" crossorigin />
```

### 5. Loading States

**DashboardSkeleton Component**: Provides visual feedback during lazy load transitions with animated placeholder content.

**Suspense Boundaries**: Wrap lazy-loaded routes to handle loading states gracefully.

## Performance Targets

- ✅ Bundle size < 500KB gzipped
- ✅ Route-based code splitting
- ✅ Lazy loading for non-critical routes
- ✅ Vendor chunk optimization
- ✅ Production console.log removal

## File Structure

```
src/
├── App.tsx                 # Main app with lazy loading
├── main.tsx                # Entry point
├── index.css               # Global styles
├── components/
│   ├── ErrorBoundary.tsx   # Error handling
│   ├── Header.tsx          # Navigation
│   ├── LoadingSkeleton.tsx # Loading states
│   └── ProtectedRoute.tsx  # Auth protection
└── pages/
    ├── Dashboard.tsx       # Eager loaded
    ├── Login.tsx           # Eager loaded
    ├── ThreeDView.tsx      # Lazy loaded
    ├── ZoneDetail.tsx      # Lazy loaded
    ├── AlertsPage.tsx      # Lazy loaded
    ├── ReportsPage.tsx     # Lazy loaded
    └── Unauthorized.tsx    # Lazy loaded
```

## Build Commands

```bash
# Development with HMR
npm run dev

# Production build with type checking
npm run build

# Analyze bundle composition
npm run analyze

# Preview production build
npm run preview
```

## Bundle Size Monitoring

The `chunkSizeWarningLimit` is set to 500KB in `vite.config.ts`. Builds will warn if any chunk exceeds this threshold.

## Best Practices Applied

1. **Tree Shaking**: ES modules enable dead code elimination
2. **Dynamic Imports**: Reduce initial bundle size
3. **Vendor Splitting**: Cache vendor code separately
4. **Compression**: Terser minification + server gzip/brotli
5. **Resource Hints**: Preconnect and preload critical resources
6. **Error Boundaries**: Prevent lazy load failures from crashing the app

## References

- Task: T065 [US1] Optimize bundle size with code splitting
- Related: plan.md (Performance Goals, Bundle Size <500KB)
