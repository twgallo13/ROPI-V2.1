/**
 * Audit Service Tests
 * Tests for audit event creation, retrieval, and revert functionality
 * 
 * PVS-0.3.0 — Attribute audit trail
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  computeDiff,
  formatAuditSummary,
  exportAuditToCsv,
  type AuditEvent,
} from '../src/services/auditService';

describe('Audit Service', () => {
  describe('computeDiff', () => {
    it('should detect added fields', () => {
      const before = { name: 'Test' };
      const after = { name: 'Test', description: 'New description' };
      
      const diff = computeDiff(before, after);
      expect(diff).toHaveLength(1);
      expect(diff[0]).toEqual({
        field: 'description',
        oldValue: undefined,
        newValue: 'New description',
        type: 'added',
      });
    });

    it('should detect removed fields', () => {
      const before = { name: 'Test', description: 'To be removed' };
      const after = { name: 'Test' };
      
      const diff = computeDiff(before, after);
      expect(diff).toHaveLength(1);
      expect(diff[0]).toEqual({
        field: 'description',
        oldValue: 'To be removed',
        newValue: undefined,
        type: 'removed',
      });
    });

    it('should detect modified fields', () => {
      const before = { name: 'Old Name' };
      const after = { name: 'New Name' };
      
      const diff = computeDiff(before, after);
      expect(diff).toHaveLength(1);
      expect(diff[0]).toEqual({
        field: 'name',
        oldValue: 'Old Name',
        newValue: 'New Name',
        type: 'modified',
      });
    });

    it('should skip metadata fields', () => {
      const before = { name: 'Test', updatedAt: '2024-01-01', updatedBy: 'user1' };
      const after = { name: 'Test', updatedAt: '2024-01-02', updatedBy: 'user2' };
      
      const diff = computeDiff(before, after);
      expect(diff).toHaveLength(0); // No changes to non-metadata fields
    });

    it('should handle null before state (create)', () => {
      const before = null;
      const after = { name: 'New Item', data_type: 'string' };
      
      const diff = computeDiff(before, after);
      expect(diff).toHaveLength(2);
      expect(diff.every(d => d.type === 'added')).toBe(true);
    });

    it('should handle null after state (delete)', () => {
      const before = { name: 'Old Item', data_type: 'string' };
      const after = null;
      
      const diff = computeDiff(before, after);
      expect(diff).toHaveLength(2);
      expect(diff.every(d => d.type === 'removed')).toBe(true);
    });

    it('should detect nested object changes', () => {
      const before = { config: { enabled: true, count: 5 } };
      const after = { config: { enabled: false, count: 5 } };
      
      const diff = computeDiff(before, after);
      expect(diff).toHaveLength(1);
      expect(diff[0].field).toBe('config');
      expect(diff[0].type).toBe('modified');
    });

    it('should detect array changes', () => {
      const before = { allowed_values: ['red', 'blue'] };
      const after = { allowed_values: ['red', 'blue', 'green'] };
      
      const diff = computeDiff(before, after);
      expect(diff).toHaveLength(1);
      expect(diff[0].field).toBe('allowed_values');
      expect(diff[0].type).toBe('modified');
    });
  });

  describe('formatAuditSummary', () => {
    const baseEvent: AuditEvent = {
      event_id: 'test-event-1',
      attribute_id: 'test-attr',
      actor: 'test-user',
      timestamp: '2024-01-15T10:30:00.000Z',
      action: 'update',
      before: { name: 'Old' },
      after: { name: 'New' },
    };

    it('should format create action', () => {
      const event: AuditEvent = { 
        ...baseEvent, 
        action: 'create', 
        before: null,
        after: { name: 'New Item' },
      };
      const summary = formatAuditSummary(event);
      expect(summary).toContain('created attribute');
      expect(summary).toContain('test-user');
    });

    it('should format update action with changed fields', () => {
      const event: AuditEvent = { 
        ...baseEvent, 
        action: 'update',
        before: { name: 'Old', data_type: 'string' },
        after: { name: 'New', data_type: 'string' },
      };
      const summary = formatAuditSummary(event);
      expect(summary).toContain('updated');
      expect(summary).toContain('name');
    });

    it('should format delete action', () => {
      const event: AuditEvent = { 
        ...baseEvent, 
        action: 'delete',
        after: null,
      };
      const summary = formatAuditSummary(event);
      expect(summary).toContain('deleted attribute');
    });

    it('should format revert action with reason', () => {
      const event: AuditEvent = { 
        ...baseEvent, 
        action: 'revert',
        reason: 'Mistake in last edit',
      };
      const summary = formatAuditSummary(event);
      expect(summary).toContain('reverted');
      expect(summary).toContain('Mistake in last edit');
    });

    it('should format convert action with data types', () => {
      const event: AuditEvent = { 
        ...baseEvent, 
        action: 'convert',
        before: { data_type: 'string' },
        after: { data_type: 'enum' },
      };
      const summary = formatAuditSummary(event);
      expect(summary).toContain('converted');
      expect(summary).toContain('string');
      expect(summary).toContain('enum');
    });
  });

  describe('exportAuditToCsv', () => {
    it('should export events to CSV format', () => {
      const events: AuditEvent[] = [
        {
          event_id: 'event-1',
          attribute_id: 'attr-1',
          actor: 'user-1',
          timestamp: '2024-01-15T10:00:00.000Z',
          action: 'create',
          before: null,
          after: { name: 'New' },
          reason: 'Initial creation',
        },
        {
          event_id: 'event-2',
          attribute_id: 'attr-1',
          actor: 'user-2',
          timestamp: '2024-01-16T10:00:00.000Z',
          action: 'update',
          before: { name: 'New' },
          after: { name: 'Updated' },
        },
      ];

      const csv = exportAuditToCsv(events);
      const lines = csv.split('\n');
      
      // Should have header + 2 data rows
      expect(lines).toHaveLength(3);
      
      // Header
      expect(lines[0]).toContain('event_id');
      expect(lines[0]).toContain('timestamp');
      expect(lines[0]).toContain('actor');
      expect(lines[0]).toContain('action');
      
      // First data row
      expect(lines[1]).toContain('event-1');
      expect(lines[1]).toContain('user-1');
      expect(lines[1]).toContain('create');
      expect(lines[1]).toContain('Initial creation');
      
      // Second data row
      expect(lines[2]).toContain('event-2');
      expect(lines[2]).toContain('user-2');
      expect(lines[2]).toContain('update');
    });

    it('should handle empty events array', () => {
      const csv = exportAuditToCsv([]);
      const lines = csv.split('\n');
      
      // Should only have header
      expect(lines).toHaveLength(1);
      expect(lines[0]).toContain('event_id');
    });

    it('should escape quotes in values', () => {
      const events: AuditEvent[] = [
        {
          event_id: 'event-1',
          attribute_id: 'attr-1',
          actor: 'user-1',
          timestamp: '2024-01-15T10:00:00.000Z',
          action: 'update',
          before: { name: 'Old' },
          after: { name: 'New' },
          reason: 'Reason with "quotes"',
        },
      ];

      const csv = exportAuditToCsv(events);
      // CSV escaping doubles quotes
      expect(csv).toContain('""quotes""');
    });
  });
});
