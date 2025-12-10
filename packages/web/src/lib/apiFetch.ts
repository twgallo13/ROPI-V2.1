/**
 * API Fetch Helper
 * 
 * Centralized helper for all API calls that require Firebase authentication.
 * Automatically adds Authorization header with Firebase ID token.
 * Handles both JSON and no-content responses gracefully.
 * 
 * Homer v2.1.0
 */

import { getAuthHeaders } from './authHeaders';

const API_BASE = import.meta.env.VITE_API_BASE || '';

interface ApiFetchOptions extends Omit<RequestInit, 'headers'> {
  headers?: Record<string, string>;
  skipAuth?: boolean; // For public endpoints
}

/**
 * Fetch wrapper that automatically adds Firebase Auth headers
 * and validates JSON responses. Accepts 204 No Content and empty responses.
 * 
 * @param url - API endpoint (relative /api/* or absolute URL)
 * @param options - Fetch options (method, body, etc.)
 * @returns Promise<T> Parsed JSON response, or undefined for 204/empty responses
 * @throws Error if response is HTTP error, or has non-empty non-JSON body
 */
export async function apiFetch<T = unknown>(
  url: string,
  options: ApiFetchOptions = {}
): Promise<T | undefined> {
  const { skipAuth = false, headers: customHeaders = {}, ...fetchOptions } = options;

  // Build full URL if relative
  const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url}`;

  // Get auth headers if not skipping authentication
  let headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...customHeaders,
  };

  if (!skipAuth) {
    try {
      const authHeaders = await getAuthHeaders();
      headers = { ...headers, ...authHeaders };
    } catch (err) {
      throw new Error(`Authentication required: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  // Execute fetch
  const response = await fetch(fullUrl, {
    ...fetchOptions,
    headers,
    credentials: 'include',
  });

  // Read response text for error handling
  const text = await response.text();
  const contentType = response.headers.get('content-type') || '';

  // Check for HTTP errors
  if (!response.ok) {
    const errorPreview = text.substring(0, 400);
    throw new Error(`HTTP ${response.status}: ${errorPreview}`);
  }

  // Handle 204 No Content or empty responses
  if (response.status === 204 || !text.trim()) {
    return undefined;
  }

  // Validate JSON response for non-empty bodies
  if (!contentType.includes('application/json')) {
    throw new Error(
      `Expected JSON response but got ${contentType || 'unknown content-type'}. ` +
      `Response starts with: ${text.substring(0, 200)}... ` +
      `This usually means the API route is not configured correctly.`
    );
  }

  // Parse and return JSON
  try {
    return JSON.parse(text) as T;
  } catch (parseErr) {
    throw new Error(`Failed to parse JSON: ${text.substring(0, 200)}`);
  }
}

/**
 * Convenience method for GET requests
 */
export async function apiFetchGet<T = unknown>(
  url: string,
  options?: Omit<ApiFetchOptions, 'method' | 'body'>
): Promise<T | undefined> {
  return apiFetch<T>(url, { ...options, method: 'GET' });
}

/**
 * Convenience method for POST requests
 */
export async function apiFetchPost<T = unknown>(
  url: string,
  body?: unknown,
  options?: Omit<ApiFetchOptions, 'method' | 'body'>
): Promise<T | undefined> {
  return apiFetch<T>(url, {
    ...options,
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * Convenience method for PUT requests
 */
export async function apiFetchPut<T = unknown>(
  url: string,
  body?: unknown,
  options?: Omit<ApiFetchOptions, 'method' | 'body'>
): Promise<T | undefined> {
  return apiFetch<T>(url, {
    ...options,
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * Convenience method for PATCH requests
 */
export async function apiFetchPatch<T = unknown>(
  url: string,
  body?: unknown,
  options?: Omit<ApiFetchOptions, 'method' | 'body'>
): Promise<T | undefined> {
  return apiFetch<T>(url, {
    ...options,
    method: 'PATCH',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * Convenience method for DELETE requests
 */
export async function apiFetchDelete<T = unknown>(
  url: string,
  options?: Omit<ApiFetchOptions, 'method' | 'body'>
): Promise<T | undefined> {
  return apiFetch<T>(url, { ...options, method: 'DELETE' });
}

export default apiFetch;
