/**
 * Sentry Error Tracking Configuration
 * Captures and reports errors to Sentry for monitoring
 */

import * as Sentry from '@sentry/node';
import { createRequire } from 'module';

const sentryDsn = process.env.SENTRY_DSN;
const sentryEnvironment = process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development';
const sentryEnabled = !!sentryDsn && sentryEnvironment !== 'test';

const require = createRequire(import.meta.url);

const tryGetProfilingIntegration = (): unknown | null => {
  try {
    // Optional dependency: some environments (or test installs) may not have native bindings available.
    const profiling = require('@sentry/profiling-node') as { nodeProfilingIntegration?: () => unknown };
    if (typeof profiling?.nodeProfilingIntegration !== 'function') return null;
    return profiling.nodeProfilingIntegration();
  } catch {
    return null;
  }
};

export function initializeSentry() {
  if (!sentryEnabled) {
    console.log('Sentry is disabled (no DSN configured or in test environment)');
    return;
  }

  const profilingIntegration = tryGetProfilingIntegration();

  Sentry.init({
    dsn: sentryDsn,
    environment: sentryEnvironment,
    integrations: profilingIntegration ? [profilingIntegration as any] : [],
    tracesSampleRate: sentryEnvironment === 'production' ? 0.1 : 1.0,
    profilesSampleRate: sentryEnvironment === 'production' ? 0.1 : 1.0,
  });

  console.log(`Sentry initialized for environment: ${sentryEnvironment}`);
}

export default Sentry;
