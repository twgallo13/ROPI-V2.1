/**
 * AuthFetch Service
 * 
 * LP-obs-studio-cleanup-1.7.0: Centralized authenticated fetch helper.
 * 
 * Features:
 * - Auto-attaches Firebase ID token as Bearer auth
 * - Auto-refreshes token on 401 and retries once
 * - Exponential backoff for transient errors (500, 502, 503, 504)
 * - Telemetry events for observability
 * 
 * References:
 * - Workflow W1 — Observations: https://www.notion.so/2b845ee1ec5a81b5a4a6d3ea439ec277
 * - LP-obs-studio-cleanup-1.7.0: Auth + Sync reliability
 */

import { getAuth, User } from 'firebase/auth';

// Telemetry event emitter (if available)
type TelemetryEvent = {
  name: string;
  data?: Record<string, unknown>;
};

let telemetryEmitter: ((event: TelemetryEvent) => void) | null = null;

/**
 * Set telemetry emitter for authFetch events
 */
export function setTelemetryEmitter(emitter: ((event: TelemetryEvent) => void) | null): void {
  telemetryEmitter = emitter;
}

function emitTelemetry(name: string, data?: Record<string, unknown>): void {
  if (telemetryEmitter) {
    telemetryEmitter({ name, data });
  }
}

// Default retry configuration
export interface RetryConfig {
  /** Max retries for transient errors (default: 3) */
  maxRetries: number;
  /** Initial delay in ms (default: 1000) */
  initialDelayMs: number;
  /** Max delay in ms (default: 8000) */
  maxDelayMs: number;
  /** Backoff multiplier (default: 2) */
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 8000,
  backoffMultiplier: 2,
};

// Transient error status codes that should be retried
const TRANSIENT_ERROR_CODES = [500, 502, 503, 504];

/**
 * Sleep helper for backoff delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate delay with exponential backoff
 */
function calculateBackoff(attempt: number, config: RetryConfig): number {
  const delay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt);
  return Math.min(delay, config.maxDelayMs);
}

/**
 * Get current Firebase user with timeout
 */
async function getCurrentUser(timeoutMs = 5000): Promise<User | null> {
  const auth = getAuth();
  if (auth.currentUser) {
    return auth.currentUser;
  }
  
  // Wait for auth state to settle
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      unsubscribe();
      resolve(null);
    }, timeoutMs);
    
    const unsubscribe = auth.onAuthStateChanged((user) => {
      clearTimeout(timer);
      unsubscribe();
      resolve(user);
    });
  });
}

export interface AuthFetchOptions extends RequestInit {
  /** Skip auth header (for public endpoints) */
  skipAuth?: boolean;
  /** Custom retry config */
  retryConfig?: Partial<RetryConfig>;
  /** Skip retry on transient errors */
  skipRetry?: boolean;
}

export interface AuthFetchResult {
  response: Response;
  refreshedToken: boolean;
  retryCount: number;
}

/**
 * Authenticated fetch with auto token refresh and retry.
 * 
 * @param url - Request URL
 * @param opts - Fetch options with authFetch extensions
 * @returns Response object
 * @throws Error if user not authenticated or max retries exceeded
 */
export async function authFetch(
  url: string,
  opts: AuthFetchOptions = {}
): Promise<Response> {
  const { skipAuth, retryConfig: customRetryConfig, skipRetry, ...fetchOpts } = opts;
  const config = { ...DEFAULT_RETRY_CONFIG, ...customRetryConfig };
  
  // Get current user
  const user = await getCurrentUser();
  if (!user && !skipAuth) {
    emitTelemetry('auth.fetch.no_user', { url });
    throw new Error('Not authenticated: Please sign in to continue.');
  }
  
  // Get initial token
  let token: string | null = null;
  if (user && !skipAuth) {
    try {
      token = await user.getIdToken(false);
    } catch (err) {
      emitTelemetry('auth.fetch.token_error', { url, error: String(err) });
      throw new Error('Failed to get authentication token');
    }
  }
  
  // Build headers with auth
  const headers = new Headers(fetchOpts.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('Content-Type') && fetchOpts.body) {
    headers.set('Content-Type', 'application/json');
  }
  
  let lastResponse: Response | null = null;
  let refreshedToken = false;
  let retryCount = 0;
  
  // Retry loop
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      lastResponse = await fetch(url, {
        ...fetchOpts,
        headers,
        credentials: 'include',
      });
      
      // Success - return immediately
      if (lastResponse.ok) {
        if (retryCount > 0) {
          emitTelemetry('auth.fetch.retry_success', { url, retryCount, refreshedToken });
        }
        return lastResponse;
      }
      
      // Handle 401 - token refresh and retry once
      if (lastResponse.status === 401 && user && !refreshedToken && !skipAuth) {
        emitTelemetry('auth.fetch.401_refresh', { url });
        
        try {
          // Force refresh token
          token = await user.getIdToken(true);
          headers.set('Authorization', `Bearer ${token}`);
          refreshedToken = true;
          
          // Retry with fresh token (doesn't count as retry attempt)
          lastResponse = await fetch(url, {
            ...fetchOpts,
            headers,
            credentials: 'include',
          });
          
          if (lastResponse.ok) {
            emitTelemetry('auth.fetch.refresh_success', { url });
            return lastResponse;
          }
          
          // If still 401 after refresh, don't retry further for auth issues
          if (lastResponse.status === 401) {
            emitTelemetry('auth.fetch.refresh_still_401', { url });
            break;
          }
        } catch (refreshErr) {
          emitTelemetry('auth.fetch.refresh_error', { url, error: String(refreshErr) });
          // Continue to return the original 401 response
          break;
        }
      }
      
      // Handle transient errors with retry
      if (TRANSIENT_ERROR_CODES.includes(lastResponse.status) && !skipRetry) {
        if (attempt < config.maxRetries) {
          const delay = calculateBackoff(attempt, config);
          emitTelemetry('auth.fetch.transient_retry', { 
            url, 
            status: lastResponse.status, 
            attempt: attempt + 1, 
            delay 
          });
          await sleep(delay);
          retryCount++;
          continue;
        }
      }
      
      // Non-retryable error or max retries reached
      break;
      
    } catch (networkErr) {
      // Network error - retry if online
      if (!skipRetry && attempt < config.maxRetries && navigator.onLine) {
        const delay = calculateBackoff(attempt, config);
        emitTelemetry('auth.fetch.network_retry', { 
          url, 
          error: String(networkErr), 
          attempt: attempt + 1, 
          delay 
        });
        await sleep(delay);
        retryCount++;
        continue;
      }
      
      emitTelemetry('auth.fetch.network_error', { url, error: String(networkErr) });
      throw new Error(`Network error: ${networkErr instanceof Error ? networkErr.message : 'Request failed'}`);
    }
  }
  
  // Return last response (error case)
  if (lastResponse) {
    if (retryCount > 0) {
      emitTelemetry('auth.fetch.retry_exhausted', { 
        url, 
        status: lastResponse.status, 
        retryCount 
      });
    }
    return lastResponse;
  }
  
  throw new Error('Request failed: No response received');
}

/**
 * Convenience method for JSON requests
 */
export async function authFetchJson<T = unknown>(
  url: string,
  opts: AuthFetchOptions = {}
): Promise<T> {
  const headers = new Headers(opts.headers || {});
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }
  
  const response = await authFetch(url, { ...opts, headers });
  
  if (!response.ok) {
    let errorMessage = `Request failed: ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorData.message || errorMessage;
    } catch {
      // Ignore JSON parse errors
    }
    throw new Error(errorMessage);
  }
  
  return response.json();
}

export default authFetch;
