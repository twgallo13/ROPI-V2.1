/**
 * logging.ts
 * LP-smart-rules-logging-1.0.0
 * 
 * Configuration for Smart Rules structured logging.
 * 
 * Controls sampling rates, log levels, and workspace-specific overrides.
 */

// ============================================================================
// Environment Variables
// ============================================================================

/**
 * Sampling rate for smartrule.eval events (0.0 to 1.0)
 * Default: 0.01 (1%) in production, 1.0 (100%) in development
 */
const LOG_SAMPLING_RATE = parseFloat(process.env.LOG_SAMPLING_RATE || '0.01');

/**
 * Verbose logging enabled (logs all eval events regardless of sampling)
 */
const LOG_VERBOSE = process.env.LOG_VERBOSE === 'true';

/**
 * Workspace ID for verbose logging (if set, enables verbose for specific workspace)
 */
const LOG_VERBOSE_WORKSPACE = process.env.LOG_VERBOSE_WORKSPACE;

/**
 * Project ID for Cloud Logging
 */
const PROJECT_ID = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || 'ropi-bccee';

// ============================================================================
// Configuration Interface
// ============================================================================

export interface LoggingConfig {
  projectId: string;
  samplingRate: number;
  verbose: boolean;
  verboseWorkspace?: string;
  logAllApply: boolean;
  logAllErrors: boolean;
  environment: 'staging' | 'production' | 'development';
}

// ============================================================================
// Get Config
// ============================================================================

/**
 * Get current logging configuration from environment variables
 */
export function getLoggingConfig(): LoggingConfig {
  const env = process.env.NODE_ENV || 'development';
  
  // Determine sampling rate
  let samplingRate = LOG_SAMPLING_RATE;
  if (env === 'development') {
    samplingRate = 1.0; // Always log in dev
  }
  if (LOG_VERBOSE) {
    samplingRate = 1.0; // Verbose mode
  }
  
  // Clamp sampling rate
  samplingRate = Math.max(0, Math.min(1, samplingRate));
  
  return {
    projectId: PROJECT_ID,
    samplingRate,
    verbose: LOG_VERBOSE,
    verboseWorkspace: LOG_VERBOSE_WORKSPACE,
    logAllApply: true, // Always log apply events
    logAllErrors: true, // Always log errors
    environment: env === 'production' ? 'production' : env === 'staging' ? 'staging' : 'development',
  };
}

/**
 * Check if verbose logging is enabled for a workspace
 */
export function isVerboseForWorkspace(workspaceId: string): boolean {
  const config = getLoggingConfig();
  if (config.verbose) return true;
  if (config.verboseWorkspace === workspaceId) return true;
  return false;
}

/**
 * Get effective sampling rate for a workspace
 */
export function getSamplingRateForWorkspace(workspaceId?: string): number {
  const config = getLoggingConfig();
  if (workspaceId && isVerboseForWorkspace(workspaceId)) {
    return 1.0;
  }
  return config.samplingRate;
}
