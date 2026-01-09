/**
 * Sentry Error Tracking Configuration
 * Captures and reports errors to Sentry for monitoring
 */

import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

const sentryDsn = process.env.SENTRY_DSN;
const sentryEnvironment = process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development';
const sentryEnabled = !!sentryDsn && sentryEnvironment !== 'test';

export function initializeSentry() {
  if (!sentryEnabled) {
    console.log('Sentry is disabled (no DSN configured or in test environment)');
    return;
  }

  Sentry.init({
    dsn: sentryDsn,
    environment: sentryEnvironment,
    integrations: [
      nodeProfilingIntegration(),
    ],
    tracesSampleRate: sentryEnvironment === 'production' ? 0.1 : 1.0,
    profilesSampleRate: sentryEnvironment === 'production' ? 0.1 : 1.0,
  });

  console.log(`Sentry initialized for environment: ${sentryEnvironment}`);
}

export default Sentry;
