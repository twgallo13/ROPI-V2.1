/**
 * Async Describe Service - Client-side helper
 * 
 * This service provides async describe functionality using the job queue pattern.
 * Instead of blocking for 5+ seconds, it returns a jobId immediately and polls for results.
 * 
 * Usage in React component:
 * 
 * ```tsx
 * import { startDescribeJob, pollDescribeJob } from '@/services/asyncDescribe';
 * 
 * const handleGenerate = async () => {
 *   setLoading(true);
 *   setStatus('Creating job...');
 *   
 *   try {
 *     const jobId = await startDescribeJob(payload);
 *     setStatus('Generating description...');
 *     
 *     const result = await pollDescribeJob(jobId);
 *     setDescription(result);
 *     setStatus('Done!');
 *   } catch (error) {
 *     setError(error.message);
 *   } finally {
 *     setLoading(false);
 *   }
 * };
 * ```
 * 
 * Or using Firestore real-time listener (recommended for better UX):
 * 
 * ```tsx
 * import { startDescribeJob, subscribeToDescribeJob } from '@/services/asyncDescribe';
 * 
 * const handleGenerate = async () => {
 *   const jobId = await startDescribeJob(payload);
 *   
 *   const unsubscribe = subscribeToDescribeJob(jobId, (status, result, error) => {
 *     if (status === 'processing') setStatus('Generating...');
 *     if (status === 'done') {
 *       setDescription(result);
 *       unsubscribe();
 *     }
 *     if (status === 'error') {
 *       setError(error);
 *       unsubscribe();
 *     }
 *   });
 * };
 * ```
 */

import { doc, onSnapshot, getFirestore } from 'firebase/firestore';

export interface DescribePayload {
  productId: string;
  channel?: string;
  attributes?: Record<string, unknown>;
  facts?: Record<string, unknown>;
  aiContext?: Record<string, unknown>;
  tone?: string;
  length?: string;
  temperature?: number;
  templateOverride?: string;
}

export interface DescribeJobStatus {
  jobId: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  result?: Record<string, unknown>;
  error?: string;
  createdAt?: unknown;
  startedAt?: unknown;
  finishedAt?: unknown;
  updatedAt?: unknown;
}

/**
 * Start an async describe job
 * Returns a jobId immediately (non-blocking)
 */
export async function startDescribeJob(payload: DescribePayload): Promise<string> {
  const resp = await fetch('/api/describe-start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  
  if (!resp.ok) {
    const error = await resp.json().catch(() => ({ error: 'Failed to start describe job' }));
    throw new Error(error.error || 'Failed to start describe job');
  }
  
  const json = await resp.json();
  return json.jobId;
}

/**
 * Poll for describe job status
 * Simple polling approach with timeout
 */
export async function pollDescribeJob(
  jobId: string, 
  options: {
    intervalMs?: number;
    timeoutMs?: number;
    onProgress?: (status: string) => void;
  } = {}
): Promise<Record<string, unknown>> {
  const { intervalMs = 1000, timeoutMs = 60000, onProgress } = options;
  const start = Date.now();
  
  while (Date.now() - start < timeoutMs) {
    const status = await getDescribeJobStatus(jobId);
    
    if (onProgress) {
      onProgress(status.status);
    }
    
    if (status.status === 'done' && status.result) {
      return status.result;
    }
    
    if (status.status === 'error') {
      throw new Error(status.error || 'Describe job failed');
    }
    
    // Wait before next poll
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  
  throw new Error('Timeout waiting for describe result');
}

/**
 * Get current status of a describe job
 */
export async function getDescribeJobStatus(jobId: string): Promise<DescribeJobStatus> {
  const resp = await fetch(`/api/describe-status?jobId=${jobId}`);
  
  if (!resp.ok) {
    const error = await resp.json().catch(() => ({ error: 'Failed to fetch job status' }));
    throw new Error(error.error || 'Failed to fetch job status');
  }
  
  return await resp.json();
}

/**
 * Subscribe to describe job updates using Firestore real-time listener
 * This is the recommended approach for better UX - no polling needed!
 * 
 * @returns unsubscribe function to stop listening
 */
export function subscribeToDescribeJob(
  jobId: string,
  callback: (status: string, result?: Record<string, unknown>, error?: string) => void
): () => void {
  const db = getFirestore();
  const jobDoc = doc(db, 'descriptionJobs', jobId);
  
  const unsubscribe = onSnapshot(jobDoc, (snap) => {
    const data = snap.data();
    if (!data) {
      callback('error', undefined, 'Job not found');
      return;
    }
    
    callback(data.status, data.result, data.error);
  });
  
  return unsubscribe;
}

/**
 * Combined helper: Start job and wait for result using real-time listener
 * This is the simplest way to use async describe with real-time updates
 */
export async function describeAsync(
  payload: DescribePayload,
  onProgress?: (status: string) => void
): Promise<Record<string, unknown>> {
  const jobId = await startDescribeJob(payload);
  
  return new Promise((resolve, reject) => {
    const unsubscribe = subscribeToDescribeJob(jobId, (status, result, error) => {
      if (onProgress) {
        onProgress(status);
      }
      
      if (status === 'done' && result) {
        unsubscribe();
        resolve(result);
      }
      
      if (status === 'error') {
        unsubscribe();
        reject(new Error(error || 'Describe job failed'));
      }
    });
    
    // Cleanup on timeout (60s)
    setTimeout(() => {
      unsubscribe();
      reject(new Error('Timeout waiting for describe result'));
    }, 60000);
  });
}
