// packages/api/src/lib/aiActionLog.ts
import { getFirestore } from 'firebase-admin/firestore';

// Lazy Firestore getter to ensure app is initialized
function getDb() {
  return getFirestore();
}
import { logger } from './logger';

/**
 * AI Action Log utilities for tracking AI Describe operations
 * 
 * Provides audit trail for all AI generation requests including
 * success/failure tracking, template usage, and performance metrics.
 */

interface AIActionLogEntry {
  mpn: string;
  site: string;
  userId?: string;
  templateKey: string;
  templatePriority: number;
  candidateIds: string[];
  contextAttributeCount: number;
  elapsedMs: number;
  model: string;
  status?: 'success' | 'blocked' | 'error';
  error?: string;
  timestamp?: FirebaseFirestore.Timestamp;
  [key: string]: any;
}

/**
 * Write AI Action Log entry to Firestore
 * This function runs asynchronously and should not block API responses
 */
export async function writeAIActionLog(entry: AIActionLogEntry): Promise<void> {
  try {
    const logEntry: AIActionLogEntry = {
      ...entry,
      status: 'success',
      timestamp: getDb().Timestamp.now()
    };

    // Add to ai_action_log collection
    const docRef = await getDb().collection('ai_action_log').add(logEntry);
    
    logger.info('AI Action Log entry written', {
      docId: docRef.id,
      mpn: entry.mpn,
      site: entry.site,
      templateKey: entry.templateKey,
      elapsedMs: entry.elapsedMs
    });

  } catch (error) {
    // Log error but don't throw - this should not break the main API flow
    logger.error('Failed to write AI Action Log entry', {
      error: error.message,
      entry: { ...entry, timestamp: undefined } // Don't log timestamp object
    });
  }
}

/**
 * Write AI Action Log entry for blocked requests
 */
export async function writeAIActionLogBlocked(
  mpn: string, 
  site: string, 
  userId: string | undefined, 
  templateKey: string, 
  missingAttributes: string[],
  elapsedMs: number
): Promise<void> {
  try {
    const logEntry: AIActionLogEntry = {
      mpn,
      site,
      userId,
      templateKey,
      templatePriority: 0,
      candidateIds: [],
      contextAttributeCount: 0,
      elapsedMs,
      model: 'n/a',
      status: 'blocked',
      error: `Missing required attributes: ${missingAttributes.join(', ')}`,
      missingAttributes,
      timestamp: getDb().Timestamp.now()
    };

    const docRef = await getDb().collection('ai_action_log').add(logEntry);
    
    logger.info('AI Action Log blocked entry written', {
      docId: docRef.id,
      mpn,
      site,
      templateKey,
      missingAttributes
    });

  } catch (error) {
    logger.error('Failed to write blocked AI Action Log entry', {
      error: error.message,
      mpn,
      site
    });
  }
}

/**
 * Write AI Action Log entry for error cases
 */
export async function writeAIActionLogError(
  mpn: string, 
  site: string, 
  userId: string | undefined, 
  templateKey: string, 
  errorMessage: string,
  elapsedMs: number
): Promise<void> {
  try {
    const logEntry: AIActionLogEntry = {
      mpn,
      site,
      userId,
      templateKey,
      templatePriority: 0,
      candidateIds: [],
      contextAttributeCount: 0,
      elapsedMs,
      model: 'n/a',
      status: 'error',
      error: errorMessage,
      timestamp: getDb().Timestamp.now()
    };

    const docRef = await getDb().collection('ai_action_log').add(logEntry);
    
    logger.info('AI Action Log error entry written', {
      docId: docRef.id,
      mpn,
      site,
      error: errorMessage
    });

  } catch (error) {
    logger.error('Failed to write error AI Action Log entry', {
      error: error.message,
      mpn,
      site,
      originalError: errorMessage
    });
  }
}

/**
 * Query AI Action Log entries for analytics
 */
export async function queryAIActionLog(options: {
  mpn?: string;
  site?: string;
  userId?: string;
  status?: 'success' | 'blocked' | 'error';
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}) {
  try {
    let query = getDb().collection('ai_action_log') as any;

    // Apply filters
    if (options.mpn) {
      query = query.where('mpn', '==', options.mpn);
    }
    
    if (options.site) {
      query = query.where('site', '==', options.site);
    }
    
    if (options.userId) {
      query = query.where('userId', '==', options.userId);
    }
    
    if (options.status) {
      query = query.where('status', '==', options.status);
    }

    if (options.startDate) {
      query = query.where('timestamp', '>=', getDb().Timestamp.fromDate(options.startDate));
    }
    
    if (options.endDate) {
      query = query.where('timestamp', '<=', getDb().Timestamp.fromDate(options.endDate));
    }

    // Order by timestamp and limit
    query = query.orderBy('timestamp', 'desc');
    
    if (options.limit) {
      query = query.limit(options.limit);
    }

    const snapshot = await query.get();
    
    const results = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    logger.info('AI Action Log query completed', {
      resultCount: results.length,
      filters: options
    });

    return results;
  } catch (error) {
    logger.error('Failed to query AI Action Log', {
      error: error.message,
      options
    });
    throw error;
  }
}

export default {
  writeAIActionLog,
  writeAIActionLogBlocked,
  writeAIActionLogError,
  queryAIActionLog
};