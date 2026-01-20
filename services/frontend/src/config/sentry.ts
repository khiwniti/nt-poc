/**
 * Sentry Configuration for Frontend Error Tracking
 */

import * as Sentry from '@sentry/react';

export function initializeSentry() {
  const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
  const ENVIRONMENT = import.meta.env.MODE || 'development';
  const RELEASE = import.meta.env.VITE_SENTRY_RELEASE;

  // Only initialize Sentry if DSN is provided
  if (!SENTRY_DSN) {
    console.warn('Sentry DSN not provided. Error tracking is disabled.');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: ENVIRONMENT,
    release: RELEASE,

    // Integration configuration
    integrations: [
      // Browser tracing for performance monitoring
      Sentry.browserTracingIntegration({
        // Trace navigation and interactions
        tracePropagationTargets: ['localhost', /^https:\/\/[^/]*\.railway\.app/],
      }),

      // Replay for session recording (only in production)
      ...(ENVIRONMENT === 'production'
        ? [
            Sentry.replayIntegration({
              maskAllText: true, // Mask sensitive text
              blockAllMedia: true, // Block images/videos for privacy
            }),
          ]
        : []),
    ],

    // Performance monitoring
    tracesSampleRate: ENVIRONMENT === 'production' ? 0.1 : 1.0, // 10% in prod, 100% in dev

    // Session replay sample rate
    replaysSessionSampleRate: ENVIRONMENT === 'production' ? 0.1 : 1.0,
    replaysOnErrorSampleRate: 1.0, // Always capture replays on errors

    // Error filtering
    beforeSend(event, hint) {
      // Filter out certain errors
      const error = hint.originalException;

      // Ignore browser extension errors
      if (error && typeof error === 'object' && 'message' in error) {
        const message = (error as Error).message;
        if (message && message.includes('chrome-extension://')) {
          return null;
        }
      }

      // Ignore rate limit errors (already logged)
      if (event.message && event.message.includes('Rate limit exceeded')) {
        return null;
      }

      return event;
    },

    // Add custom context
    initialScope: {
      tags: {
        service: 'frontend',
        framework: 'react',
      },
    },
  });

  console.log('Sentry initialized for error tracking');
}

/**
 * Set user context for Sentry
 */
export function setSentryUser(userId: string, email?: string, username?: string) {
  Sentry.setUser({
    id: userId,
    email,
    username,
  });
}

/**
 * Clear user context (on logout)
 */
export function clearSentryUser() {
  Sentry.setUser(null);
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(message: string, data?: Record<string, any>) {
  Sentry.addBreadcrumb({
    message,
    data,
    level: 'info',
  });
}
