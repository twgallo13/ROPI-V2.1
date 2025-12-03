/**
 * Sentry Error Monitoring Configuration for ROPI AOSS
 * 
 * Captures:
 * - Auth errors (sign-in failures, token issues)
 * - Firestore permission errors
 * - Critical UI failures
 * 
 * Breadcrumbs:
 * - Route changes
 * - Key user actions (launch signup, observation creation)
 * 
 * Source-of-truth: Section 11 — Observability, Monitoring & Runbooks
 * Notion Page ID: 2b845ee1-ec5a-80d4-82ed-cd9af5565e45
 */

import * as Sentry from '@sentry/react';

/**
 * Initialize Sentry monitoring
 * Call this at app bootstrap (in main.tsx)
 */
export function initSentry() {
  const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
  const environment = import.meta.env.VITE_ENV || 'staging';
  
  // Only initialize if DSN is configured
  if (!sentryDsn) {
    console.warn('Sentry DSN not configured - error monitoring disabled');
    return;
  }
  
  Sentry.init({
    dsn: sentryDsn,
    
    // Environment: staging | production
    environment,
    
    // Release version (use git commit hash or package version)
    release: `ropi-aoss@${import.meta.env.VITE_APP_VERSION || 'dev'}`,
    
    // Integrations
    integrations: [
      // Browser profiling
      Sentry.browserTracingIntegration(),
      
      // Replay sessions (for debugging)
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    
    // Performance monitoring
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
    
    // Session replay sample rate
    replaysSessionSampleRate: environment === 'production' ? 0.1 : 1.0,
    replaysOnErrorSampleRate: 1.0, // Always capture on error
    
    // Before sending events
    beforeSend(event, hint) {
      // Filter out development errors
      if (environment === 'development') {
        return null;
      }
      
      // Scrub sensitive data
      if (event.request?.headers) {
        delete event.request.headers['Authorization'];
        delete event.request.headers['Cookie'];
      }
      
      // Add custom context
      const error = hint.originalException as Error;
      if (error) {
        event.tags = {
          ...event.tags,
          error_type: error.name,
        };
      }
      
      return event;
    },
  });
  
  console.log(`✅ Sentry initialized (${environment})`);
}

/**
 * Capture auth errors
 */
export function captureAuthError(error: Error, context?: Record<string, any>) {
  Sentry.captureException(error, {
    level: 'error',
    tags: {
      feature: 'auth',
      env: import.meta.env.VITE_ENV || 'staging',
    },
    contexts: {
      auth: context,
    },
  });
  
  console.error('[Auth Error]', error.message, context);
}

/**
 * Capture Firestore permission errors
 */
export function captureFirestoreError(error: Error, context?: Record<string, any>) {
  Sentry.captureException(error, {
    level: 'error',
    tags: {
      feature: 'firestore',
      env: import.meta.env.VITE_ENV || 'staging',
    },
    contexts: {
      firestore: context,
    },
  });
  
  console.error('[Firestore Error]', error.message, context);
}

/**
 * Capture launch signup errors
 */
export function captureLaunchSignupError(error: Error, context?: Record<string, any>) {
  Sentry.captureException(error, {
    level: 'error',
    tags: {
      feature: 'launch-signup',
      env: import.meta.env.VITE_ENV || 'staging',
    },
    contexts: {
      launch_signup: context,
    },
  });
  
  console.error('[Launch Signup Error]', error.message, context);
}

/**
 * Capture observation errors
 */
export function captureObservationError(error: Error, context?: Record<string, any>) {
  Sentry.captureException(error, {
    level: 'error',
    tags: {
      feature: 'observations',
      env: import.meta.env.VITE_ENV || 'staging',
    },
    contexts: {
      observation: context,
    },
  });
  
  console.error('[Observation Error]', error.message, context);
}

/**
 * Add breadcrumb for route changes
 */
export function addRouteBreadcrumb(route: string) {
  Sentry.addBreadcrumb({
    category: 'navigation',
    message: `Navigated to ${route}`,
    level: 'info',
  });
}

/**
 * Add breadcrumb for key actions
 */
export function addActionBreadcrumb(action: string, data?: Record<string, any>) {
  Sentry.addBreadcrumb({
    category: 'action',
    message: action,
    level: 'info',
    data,
  });
}

/**
 * Set user context
 */
export function setSentryUser(userId: string, email?: string) {
  Sentry.setUser({
    id: userId,
    email,
  });
}

/**
 * Clear user context (on sign out)
 */
export function clearSentryUser() {
  Sentry.setUser(null);
}


