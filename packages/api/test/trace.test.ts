/**
 * trace.test.ts
 * LP-smart-rules-logging-1.0.0
 * 
 * Unit tests for trace ID helpers
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  generateTraceId,
  extractTraceIdFromHeader,
  createTraceContext,
  storeTraceContext,
  getTraceContext,
  clearTraceContext,
  formatTraceIdForLogging,
  createImportTraceId,
} from '../src/lib/trace';

describe('Trace Helpers', () => {
  describe('generateTraceId', () => {
    it('should generate a valid UUID', () => {
      const traceId = generateTraceId();
      
      expect(traceId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });
    
    it('should generate unique IDs', () => {
      const id1 = generateTraceId();
      const id2 = generateTraceId();
      
      expect(id1).not.toBe(id2);
    });
  });
  
  describe('extractTraceIdFromHeader', () => {
    it('should extract trace ID from Cloud Trace format', () => {
      const header = 'projects/ropi-bccee/traces/a1b2c3d4e5f6/o/1';
      const traceId = extractTraceIdFromHeader(header);
      
      expect(traceId).toBe('a1b2c3d4e5f6');
    });
    
    it('should handle header without project prefix', () => {
      const header = 'traces/abc123def456';
      const traceId = extractTraceIdFromHeader(header);
      
      expect(traceId).toBe('abc123def456');
    });
    
    it('should return undefined for invalid header', () => {
      const traceId = extractTraceIdFromHeader('invalid-format');
      
      expect(traceId).toBeUndefined();
    });
    
    it('should return undefined for empty header', () => {
      const traceId = extractTraceIdFromHeader('');
      
      expect(traceId).toBeUndefined();
    });
    
    it('should return undefined for undefined header', () => {
      const traceId = extractTraceIdFromHeader(undefined);
      
      expect(traceId).toBeUndefined();
    });
  });
  
  describe('createTraceContext', () => {
    it('should create context from Cloud Trace header', () => {
      const request = {
        headers: {
          'x-cloud-trace-context': 'projects/ropi-bccee/traces/trace123/o/1',
        },
      };
      
      const context = createTraceContext(request);
      
      expect(context.traceId).toBe('trace123');
    });
    
    it('should use x-trace-id header if Cloud Trace not present', () => {
      const request = {
        headers: {
          'x-trace-id': 'custom-trace-456',
        },
      };
      
      const context = createTraceContext(request);
      
      expect(context.traceId).toBe('custom-trace-456');
    });
    
    it('should generate new trace ID if no headers present', () => {
      const request = {
        headers: {},
      };
      
      const context = createTraceContext(request);
      
      expect(context.traceId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}/);
    });
    
    it('should extract importId from parameter', () => {
      const request = {
        headers: {},
      };
      
      const context = createTraceContext(request, 'import_789');
      
      expect(context.importId).toBe('import_789');
      expect(context.traceId).toBeTruthy();
    });
    
    it('should extract workspaceId from body', () => {
      const request = {
        headers: {},
        body: {
          workspaceId: 'workspace_123',
        },
      };
      
      const context = createTraceContext(request);
      
      expect(context.workspaceId).toBe('workspace_123');
    });
    
    it('should extract workspaceId from query if not in body', () => {
      const request = {
        headers: {},
        query: {
          workspaceId: 'workspace_456',
        },
      };
      
      const context = createTraceContext(request);
      
      expect(context.workspaceId).toBe('workspace_456');
    });
    
    it('should extract userId from request.user', () => {
      const request = {
        headers: {},
        user: {
          uid: 'user_123',
        },
      };
      
      const context = createTraceContext(request);
      
      expect(context.userId).toBe('user_123');
    });
    
    it('should extract requestId from header', () => {
      const request = {
        headers: {
          'x-request-id': 'req_789',
        },
      };
      
      const context = createTraceContext(request);
      
      expect(context.requestId).toBe('req_789');
    });
  });
  
  describe('context storage', () => {
    beforeEach(() => {
      // Clear any existing contexts
      clearTraceContext('test-trace-1');
      clearTraceContext('test-trace-2');
    });
    
    it('should store and retrieve context', () => {
      const context = {
        traceId: 'test-trace-1',
        importId: 'import_123',
        workspaceId: 'workspace_456',
      };
      
      storeTraceContext('test-trace-1', context);
      const retrieved = getTraceContext('test-trace-1');
      
      expect(retrieved).toEqual(context);
    });
    
    it('should return undefined for non-existent trace', () => {
      const retrieved = getTraceContext('non-existent-trace');
      
      expect(retrieved).toBeUndefined();
    });
    
    it('should clear stored context', () => {
      const context = {
        traceId: 'test-trace-2',
        importId: 'import_789',
      };
      
      storeTraceContext('test-trace-2', context);
      expect(getTraceContext('test-trace-2')).toEqual(context);
      
      clearTraceContext('test-trace-2');
      expect(getTraceContext('test-trace-2')).toBeUndefined();
    });
    
    it('should auto-cleanup after timeout', async () => {
      vi.useFakeTimers();
      
      const context = {
        traceId: 'test-trace-3',
        importId: 'import_cleanup',
      };
      
      storeTraceContext('test-trace-3', context);
      expect(getTraceContext('test-trace-3')).toEqual(context);
      
      // Fast-forward 5 minutes + 1ms
      vi.advanceTimersByTime(5 * 60 * 1000 + 1);
      
      expect(getTraceContext('test-trace-3')).toBeUndefined();
      
      vi.useRealTimers();
    });
  });
  
  describe('formatTraceIdForLogging', () => {
    it('should format trace ID for Cloud Logging', () => {
      const formatted = formatTraceIdForLogging('abc123');
      
      expect(formatted).toBe('projects/ropi-bccee/traces/abc123');
    });
    
    it('should use custom project ID', () => {
      const formatted = formatTraceIdForLogging('def456', 'my-project');
      
      expect(formatted).toBe('projects/my-project/traces/def456');
    });
  });
  
  describe('createImportTraceId', () => {
    it('should create import trace ID with timestamp', () => {
      const traceId = createImportTraceId('import_123');
      
      expect(traceId).toMatch(/^import-import_123-[0-9a-z]+$/);
    });
    
    it('should create unique IDs for same import', async () => {
      const id1 = createImportTraceId('import_same');
      
      // Wait 1ms to ensure timestamp changes
      await new Promise(resolve => setTimeout(resolve, 2));
      
      const id2 = createImportTraceId('import_same');
      
      expect(id1).not.toBe(id2);
    });
  });
  
  describe('async context propagation', () => {
    it('should maintain trace context across async operations', async () => {
      const context = {
        traceId: 'async-trace-1',
        importId: 'async-import-1',
      };
      
      storeTraceContext('async-trace-1', context);
      
      // Simulate async work
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const retrieved = getTraceContext('async-trace-1');
      expect(retrieved).toEqual(context);
      
      clearTraceContext('async-trace-1');
    });
    
    it('should handle multiple concurrent contexts', async () => {
      const context1 = { traceId: 'concurrent-1', importId: 'import-1' };
      const context2 = { traceId: 'concurrent-2', importId: 'import-2' };
      
      storeTraceContext('concurrent-1', context1);
      storeTraceContext('concurrent-2', context2);
      
      // Simulate concurrent async work
      const [result1, result2] = await Promise.all([
        Promise.resolve(getTraceContext('concurrent-1')),
        Promise.resolve(getTraceContext('concurrent-2')),
      ]);
      
      expect(result1).toEqual(context1);
      expect(result2).toEqual(context2);
      
      clearTraceContext('concurrent-1');
      clearTraceContext('concurrent-2');
    });
  });
});
