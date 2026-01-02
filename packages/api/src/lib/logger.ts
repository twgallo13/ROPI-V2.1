/**
 * logger.ts
 * LP-smart-rules-logging-1.0.0
 * 
 * Structured logging utility for Smart Rules engine.
 * 
 * Wraps Cloud Logging (Stackdriver) with typed event interfaces
 * and automatic field population (timestamp, env, etc.).
 * 
 * Usage:
 *   import { logger } from './logger';
 *   
 *   logger.info('smartrule.eval', {
 *     ruleId: 'rule_123',
 *     productId: 'prod_456',
 *     conditionMatched: true
 *   });
 */

import { Logging } from '@google-cloud/logging';
import { getLoggingConfig } from '../config/logging';

// ============================================================================
// Types
// ============================================================================

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export type SmartRuleEvent = 
  | 'smartrule.eval'
  | 'smartrule.apply'
  | 'smartrule.suggestion'
  | 'smartrule.error';

/**
 * Base fields present in all Smart Rule log events
 */
export interface BaseLogFields {
  event: SmartRuleEvent;
  timestamp: string; // ISO 8601
  traceId?: string;
  env: 'staging' | 'production' | 'development';
  durationMs?: number;
  error?: string;
}

/**
 * Fields for smartrule.eval event (rule evaluation)
 */
export interface SmartRuleEvalFields extends BaseLogFields {
  event: 'smartrule.eval';
  ruleId: string;
  ruleName: string;
  ruleVersion?: string;
  productId?: string;
  mpn?: string;
  conditionMatched: boolean;
  matchedClauses?: string[];
  generatedValue?: string | number | null;
  validationResult?: {
    ok: boolean;
    errors?: string[];
  };
  action: 'suggest' | 'auto-apply' | 'skip' | 'conflict';
  applied: boolean;
  actor?: 'engine' | 'admin' | 'user' | string; // user:<uid>
  workerId?: string;
}

/**
 * Fields for smartrule.apply event (value written)
 */
export interface SmartRuleApplyFields extends BaseLogFields {
  event: 'smartrule.apply';
  ruleId: string;
  productId: string;
  changes: Array<{
    path: string;
    oldValue?: any;
    newValue: any;
  }>;
  actor: 'engine' | 'admin' | 'user' | string; // user:<uid>
}

/**
 * Fields for smartrule.suggestion event
 */
export interface SmartRuleSuggestionFields extends BaseLogFields {
  event: 'smartrule.suggestion';
  ruleId: string;
  productId: string;
  suggestion: {
    targetField: string;
    value: any;
    reason: string;
  };
}

/**
 * Fields for smartrule.error event
 */
export interface SmartRuleErrorFields extends BaseLogFields {
  event: 'smartrule.error';
  ruleId?: string;
  productId?: string;
  errorType: 'validation' | 'runtime' | 'config' | 'unknown';
  message: string;
  stack?: string;
}

export type SmartRuleLogFields = 
  | SmartRuleEvalFields
  | SmartRuleApplyFields
  | SmartRuleSuggestionFields
  | SmartRuleErrorFields;

// ============================================================================
// Logger Class
// ============================================================================

/**
 * Structured logger for Smart Rules
 */
export class SmartRuleLogger {
  private logging: Logging;
  private log: any; // Cloud Logging log instance
  private config: ReturnType<typeof getLoggingConfig>;

  constructor() {
    this.config = getLoggingConfig();
    this.logging = new Logging({ projectId: this.config.projectId });
    this.log = this.logging.log('smart-rules');
  }

  /**
   * Get current environment
   */
  private getEnv(): 'staging' | 'production' | 'development' {
    const env = process.env.NODE_ENV || 'development';
    if (env === 'production') return 'production';
    if (env === 'staging') return 'staging';
    return 'development';
  }

  /**
   * Should log based on level and sampling
   */
  private shouldLog(level: LogLevel, eventType: SmartRuleEvent): boolean {
    // Always log errors and warnings
    if (level === 'ERROR' || level === 'WARN') return true;

    // Check if event type should be sampled
    if (eventType === 'smartrule.eval') {
      // Sample eval events based on config
      return Math.random() < this.config.samplingRate;
    }

    // Always log apply, suggestion, and error events
    return true;
  }

  /**
   * Enrich log fields with automatic metadata
   */
  private enrichFields<T extends BaseLogFields>(fields: T): T {
    return {
      ...fields,
      timestamp: fields.timestamp || new Date().toISOString(),
      env: this.getEnv(),
      workerId: process.env.CLOUD_RUN_REVISION || process.env.FUNCTION_NAME || 'local',
    } as T;
  }

  /**
   * Write structured log entry to Cloud Logging
   */
  private async writeLog(level: LogLevel, fields: SmartRuleLogFields): Promise<void> {
    if (!this.shouldLog(level, fields.event)) {
      return; // Skip due to sampling
    }

    const enriched = this.enrichFields(fields);

    const metadata = {
      resource: { type: 'cloud_function' },
      severity: level,
      labels: {
        event_type: fields.event,
        rule_id: 'ruleId' in fields ? fields.ruleId : undefined,
      },
    };

    const entry = this.log.entry(metadata, enriched);

    try {
      await this.log.write(entry);
    } catch (error) {
      // Fallback to console if Cloud Logging fails
      console.error('[Logger Error] Failed to write to Cloud Logging:', error);
      console.log('[Fallback]', JSON.stringify(enriched, null, 2));
    }
  }

  /**
   * Log at DEBUG level
   */
  async debug(event: SmartRuleEvent, fields: Omit<SmartRuleLogFields, 'event'>): Promise<void> {
    await this.writeLog('DEBUG', { ...fields, event } as SmartRuleLogFields);
  }

  /**
   * Log at INFO level
   */
  async info(event: SmartRuleEvent, fields: Omit<SmartRuleLogFields, 'event'>): Promise<void> {
    await this.writeLog('INFO', { ...fields, event } as SmartRuleLogFields);
  }

  /**
   * Log at WARN level
   */
  async warn(event: SmartRuleEvent, fields: Omit<SmartRuleLogFields, 'event'>): Promise<void> {
    await this.writeLog('WARN', { ...fields, event } as SmartRuleLogFields);
  }

  /**
   * Log at ERROR level
   */
  async error(event: SmartRuleEvent, fields: Omit<SmartRuleLogFields, 'event'>): Promise<void> {
    await this.writeLog('ERROR', { ...fields, event } as SmartRuleLogFields);
  }

  /**
   * Convenience: Log evaluation start (DEBUG)
   */
  async logEvalStart(ruleId: string, ruleName: string, productId: string, traceId?: string): Promise<number> {
    const startTime = Date.now();
    
    await this.debug('smartrule.eval', {
      ruleId,
      ruleName,
      productId,
      traceId,
      conditionMatched: false, // Unknown at start
      action: 'skip',
      applied: false,
    } as Partial<SmartRuleEvalFields>);
    
    return startTime;
  }

  /**
   * Convenience: Log evaluation result (INFO or DEBUG)
   */
  async logEvalResult(
    startTime: number,
    fields: Omit<SmartRuleEvalFields, 'event' | 'timestamp' | 'env' | 'durationMs'>
  ): Promise<void> {
    const durationMs = Date.now() - startTime;
    
    const level: LogLevel = fields.applied ? 'INFO' : 'DEBUG';
    
    await this.writeLog(level, {
      ...fields,
      event: 'smartrule.eval',
      durationMs,
      timestamp: new Date().toISOString(),
      env: this.getEnv(),
    } as SmartRuleEvalFields);
  }

  /**
   * Convenience: Log apply action (always INFO)
   */
  async logApply(
    ruleId: string,
    productId: string,
    changes: Array<{ path: string; oldValue?: any; newValue: any }>,
    actor: string,
    traceId?: string,
    startTime?: number
  ): Promise<void> {
    await this.info('smartrule.apply', {
      ruleId,
      productId,
      changes,
      actor,
      traceId,
      durationMs: startTime ? Date.now() - startTime : undefined,
    } as Partial<SmartRuleApplyFields>);
  }

  /**
   * Convenience: Log suggestion created
   */
  async logSuggestion(
    ruleId: string,
    productId: string,
    suggestion: { targetField: string; value: any; reason: string },
    traceId?: string
  ): Promise<void> {
    await this.info('smartrule.suggestion', {
      ruleId,
      productId,
      suggestion,
      traceId,
    } as Partial<SmartRuleSuggestionFields>);
  }

  /**
   * Convenience: Log error
   */
  async logError(
    message: string,
    errorType: 'validation' | 'runtime' | 'config' | 'unknown',
    error?: Error,
    ruleId?: string,
    productId?: string,
    traceId?: string
  ): Promise<void> {
    await this.error('smartrule.error', {
      message,
      errorType,
      error: error?.message,
      stack: error?.stack,
      ruleId,
      productId,
      traceId,
    } as Partial<SmartRuleErrorFields>);
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const logger = new SmartRuleLogger();
