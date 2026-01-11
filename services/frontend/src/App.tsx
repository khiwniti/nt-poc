import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Header } from './components/Header';
import { DashboardSkeleton } from './components/LoadingSkeleton';
import { ErrorBoundary } from './components/ErrorBoundary';

// Eager load critical routes
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { MapPage } from './pages/MapPage';

// Import map styles
import './styles/map.css';

// Lazy load non-critical routes
const ThreeDView = lazy(() => import('./pages/ThreeDView'));
const ComparativeView3D = lazy(() => import('./pages/ComparativeView3D'));
const ZoneDetail = lazy(() => import('./pages/ZoneDetail'));
const AlertsPage = lazy(() => import('./pages/AlertsPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const ComparativeAnalysisView = lazy(() => import('./pages/ComparativeAnalysisView'));
const ModelPerformance = lazy(() => import('./pages/ModelPerformance'));
const AIInsights = lazy(() => import('./pages/AIInsights'));
const WhatIfScenarioAnalysis = lazy(() => import('./pages/WhatIfScenarioAnalysis'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const GeospatialView = lazy(() => import('./pages/GeospatialView'));
const Unauthorized = lazy(() => import('./pages/Unauthorized'));

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <div className="app-layout">
                  <Header />
                  <main className="app-main">
                    <Suspense fallback={<DashboardSkeleton />}>
                      <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/map" element={<MapPage />} />
                        <Route path="/zones/:id" element={<ZoneDetail />} />
                        <Route path="/3d" element={<ThreeDView />} />
                        <Route path="/3d/comparative" element={<ComparativeView3D />} />
                        <Route path="/alerts" element={<AlertsPage />} />
                        <Route path="/reports" element={<ReportsPage />} />
                        <Route path="/comparative-analysis" element={<ComparativeAnalysisView />} />
                        <Route path="/model-performance" element={<ModelPerformance />} />
                        <Route path="/ai-insights" element={<AIInsights />} />
                        <Route path="/what-if-analysis" element={<WhatIfScenarioAnalysis />} />
                        <Route path="/settings" element={<SettingsPage />} />
                        <Route path="/geospatial" element={<GeospatialView />} />
                        <Route path="/unauthorized" element={<Unauthorized />} />
                      </Routes>
                    </Suspense>
                  </main>
                </div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
