import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import App from './App';
import './index.css';

const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
if (dsn) {
  const sentryAny = Sentry as any;
  const integrations = [];
  if (typeof sentryAny.browserTracingIntegration === 'function') {
    integrations.push(sentryAny.browserTracingIntegration());
  }

  Sentry.init({
    dsn,
    environment: (import.meta.env.VITE_SENTRY_ENVIRONMENT as string | undefined) ?? import.meta.env.MODE,
    release: (import.meta.env.VITE_SENTRY_RELEASE as string | undefined) ?? (import.meta.env.VITE_APP_VERSION as string | undefined),
    tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE ?? 0),
    integrations,
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {dsn ? (
      <Sentry.ErrorBoundary fallback={<div style={{ padding: 16 }}>Something went wrong.</div>}>
        <App />
      </Sentry.ErrorBoundary>
    ) : (
      <App />
    )}
  </React.StrictMode>
);
