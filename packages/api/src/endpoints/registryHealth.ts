/**
 * Registry Health Endpoint
 * LP-registry-health-1.0.0
 * 
 * Provides health check for the attribute registry system.
 * Returns status, registry version, and load timestamp.
 * 
 * Used by:
 * - CI smoke tests after deploy
 * - Admin UI to verify registry is available before saving rules
 * - Monitoring and alerting
 */

import type { Request, Response } from 'express';
import * as admin from 'firebase-admin';
import { getRegistrySyncStatus, loadRegistrySnapshot, clearRegistrySnapshotCache } from '../services/registryBridge';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// Types
// ============================================================================

export interface RegistryHealthResponse {
  status: 'ok' | 'degraded' | 'error';
  registry_version?: string;
  lastLoadedAt?: string;
  firestoreCount: number;
  firestoreLastSync?: string;
  sdkVersion?: string;
  versionMatch: boolean;
  errors?: string[];
  details?: {
    cacheLoaded: boolean;
    cacheLoadedAt?: string;
    firestoreReachable: boolean;
    sdkRegistryFound: boolean;
  };
}

// ============================================================================
// SDK Registry Version Loader
// ============================================================================

/**
 * Get version from the SDK's attributeRegistry.json
 */
function getSDKRegistryVersion(): { version: string | null; found: boolean } {
  const possiblePaths = [
    // Packaged path (deployed)
    path.resolve(__dirname, '../config/attributeRegistry.json'),
    path.resolve(__dirname, '../../config/attributeRegistry.json'),
    // Development path
    path.resolve(__dirname, '../../../../sdk/config/attributeRegistry.json'),
    // Workspace root
    '/workspaces/ROPI-V2.1/packages/sdk/config/attributeRegistry.json',
  ];

  for (const registryPath of possiblePaths) {
    try {
      if (fs.existsSync(registryPath)) {
        const content = fs.readFileSync(registryPath, 'utf-8');
        const registry = JSON.parse(content);
        return { 
          version: registry.version || registry.registry_version || null, 
          found: true 
        };
      }
    } catch {
      // Continue to next path
    }
  }

  return { version: null, found: false };
}

// ============================================================================
// Health Check Handler
// ============================================================================

/**
 * GET /api/registry/health
 * 
 * Returns registry health status including:
 * - Firestore registry count and version
 * - SDK registry version
 * - Version match status
 * - Cache status
 */
export async function registryHealthHandler(req: Request, res: Response): Promise<void> {
  const errors: string[] = [];
  let status: RegistryHealthResponse['status'] = 'ok';
  let firestoreReachable = false;
  let firestoreCount = 0;
  let firestoreLastSync: string | undefined;
  let firestoreVersion: string | undefined;
  let cacheLoaded = false;
  let cacheLoadedAt: string | undefined;

  // 1. Check Firestore registry
  try {
    const syncStatus = await getRegistrySyncStatus();
    firestoreReachable = true;
    firestoreCount = syncStatus.firestoreCount;
    firestoreLastSync = syncStatus.firestoreLastSync;
    firestoreVersion = syncStatus.firestoreVersion;
    cacheLoaded = syncStatus.cacheLoaded;
    cacheLoadedAt = syncStatus.cacheLoadedAt;

    if (firestoreCount === 0) {
      errors.push('Firestore registry is empty');
      status = 'error';
    }
  } catch (err) {
    errors.push(`Firestore unreachable: ${err instanceof Error ? err.message : String(err)}`);
    status = 'error';
  }

  // 2. Check SDK registry (optional - Firestore is authoritative)
  // LP-registry-health-1.0.0: SDK registry is deprecated, only used for version comparison
  const { version: sdkVersion, found: sdkRegistryFound } = getSDKRegistryVersion();
  if (!sdkRegistryFound) {
    // SDK registry not found is acceptable - Firestore is now authoritative
    // Only log for debugging, don't mark as degraded
    errors.push('SDK registry file not found (Firestore is authoritative)');
    // Don't change status - missing SDK is acceptable
  }

  // 3. Check version match (informational only - SDK is optional)
  const versionMatch = !!(firestoreVersion && sdkVersion && firestoreVersion === sdkVersion);
  if (firestoreVersion && sdkVersion && !versionMatch) {
    // Version mismatch is informational only since SDK is deprecated
    errors.push(`Version mismatch (informational): Firestore=${firestoreVersion}, SDK=${sdkVersion}`);
    // Don't change status - SDK version mismatch is acceptable
  }

  // 4. Try loading registry to verify it works
  if (firestoreReachable && !cacheLoaded) {
    try {
      const snapshot = await loadRegistrySnapshot();
      if (snapshot.attributes.size === 0) {
        errors.push('Registry snapshot loaded but empty');
        status = 'error';
      }
      // Clear cache after health check to not affect other operations
      clearRegistrySnapshotCache();
    } catch (err) {
      errors.push(`Failed to load registry snapshot: ${err instanceof Error ? err.message : String(err)}`);
      status = 'error';
    }
  }

  const response: RegistryHealthResponse = {
    status,
    registry_version: firestoreVersion,
    lastLoadedAt: cacheLoadedAt || firestoreLastSync,
    firestoreCount,
    firestoreLastSync,
    sdkVersion: sdkVersion || undefined,
    versionMatch,
    details: {
      cacheLoaded,
      cacheLoadedAt,
      firestoreReachable,
      sdkRegistryFound,
    },
  };

  if (errors.length > 0) {
    response.errors = errors;
  }

  // Return appropriate HTTP status
  const httpStatus = status === 'error' ? 503 : status === 'degraded' ? 200 : 200;
  res.status(httpStatus).json(response);
}

/**
 * POST /api/registry/refresh
 * 
 * Force refresh the registry cache.
 * Useful after a sync or when debugging.
 */
export async function registryRefreshHandler(req: Request, res: Response): Promise<void> {
  try {
    // Clear existing cache
    clearRegistrySnapshotCache();
    
    // Force reload
    const snapshot = await loadRegistrySnapshot();
    
    res.status(200).json({
      success: true,
      message: 'Registry cache refreshed',
      attributeCount: snapshot.attributes.size,
      loadedAt: snapshot.loadedAt.toISOString(),
      source: snapshot.source,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
