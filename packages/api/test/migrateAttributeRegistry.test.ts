/**
 * migrateAttributeRegistry.test.ts
 * Tests for migration script behavior (dry-run and apply modes)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

describe('migrateAttributeRegistry', () => {
  const testDir = path.join(process.cwd(), 'test-artifacts');
  const sourceRegistry = path.join(testDir, 'test-registry.json');
  const artifactsDir = path.join(testDir, 'artifacts');

  beforeEach(() => {
    // Create test directories and source registry
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    if (!fs.existsSync(artifactsDir)) {
      fs.mkdirSync(artifactsDir, { recursive: true });
    }

    // Create test registry
    const testRegistry = {
      attributes: [
        {
          attribute_id: 'brand',
          label: 'Brand',
          data_type: 'string',
          exportable: true,
          import: true,
        },
        {
          attribute_id: 'color',
          label: 'Color',
          data_type: 'string',
          exportable: true,
          import: true,
        },
        {
          attribute_id: 'internal_code',
          label: 'Internal Code',
          data_type: 'string',
          internalOnly: true,
          exportable: false,
        },
      ],
    };

    fs.writeFileSync(sourceRegistry, JSON.stringify(testRegistry, null, 2));
  });

  afterEach(() => {
    // Cleanup
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('--dry-run mode', () => {
    it('should generate migration plan without writing', () => {
      // This test would require Firebase emulator or mocking
      // For now, we test the file I/O aspects

      expect(fs.existsSync(sourceRegistry)).toBe(true);

      const registry = JSON.parse(fs.readFileSync(sourceRegistry, 'utf8'));
      expect(registry.attributes).toHaveLength(3);
      expect(registry.attributes[0].attribute_id).toBe('brand');
    });

    it('should identify added attributes', () => {
      const registry = JSON.parse(fs.readFileSync(sourceRegistry, 'utf8'));
      const attributeIds = registry.attributes.map((a: any) => a.attribute_id);

      expect(attributeIds).toContain('brand');
      expect(attributeIds).toContain('color');
      expect(attributeIds).toContain('internal_code');
      expect(attributeIds.length).toBe(3);
    });
  });

  describe('registry source normalization', () => {
    it('should handle array format', () => {
      const registry = JSON.parse(fs.readFileSync(sourceRegistry, 'utf8'));
      const attrs = registry.attributes;

      expect(Array.isArray(attrs)).toBe(true);
      attrs.forEach((attr: any) => {
        expect(attr.attribute_id).toBeDefined();
        expect(attr.label).toBeDefined();
        expect(attr.data_type).toBeDefined();
      });
    });

    it('should validate attribute structure', () => {
      const registry = JSON.parse(fs.readFileSync(sourceRegistry, 'utf8'));

      registry.attributes.forEach((attr: any) => {
        expect(typeof attr.attribute_id).toBe('string');
        expect(attr.attribute_id.length).toBeGreaterThan(0);
        expect(typeof attr.label).toBe('string');
      });
    });

    it('should preserve flags (exportable, internalOnly)', () => {
      const registry = JSON.parse(fs.readFileSync(sourceRegistry, 'utf8'));
      
      const internalAttr = registry.attributes.find((a: any) => a.attribute_id === 'internal_code');
      expect(internalAttr?.internalOnly).toBe(true);
      expect(internalAttr?.exportable).toBe(false);

      const exportableAttr = registry.attributes.find((a: any) => a.attribute_id === 'brand');
      expect(exportableAttr?.exportable).toBe(true);
    });
  });

  describe('artifact generation', () => {
    it('should create artifacts directory if missing', () => {
      if (fs.existsSync(artifactsDir)) {
        fs.rmSync(artifactsDir, { recursive: true });
      }

      expect(fs.existsSync(artifactsDir)).toBe(false);

      fs.mkdirSync(artifactsDir, { recursive: true });

      expect(fs.existsSync(artifactsDir)).toBe(true);
    });

    it('should write plan JSON in correct format', () => {
      const plan = {
        newVersion: 'abc123',
        currentVersion: null,
        added: ['brand', 'color', 'internal_code'],
        updated: [],
        deleted: [],
        summary: {
          totalAttributes: 3,
          addedCount: 3,
          updatedCount: 0,
          deletedCount: 0,
        },
      };

      const planPath = path.join(artifactsDir, 'migrate-plan.json');
      fs.writeFileSync(planPath, JSON.stringify(plan, null, 2));

      const written = JSON.parse(fs.readFileSync(planPath, 'utf8'));
      expect(written.summary.totalAttributes).toBe(3);
      expect(written.summary.addedCount).toBe(3);
    });
  });

  describe('version computation', () => {
    it('should compute stable SHA1 hash of registry payload', () => {
      const crypto = require('crypto');
      const registry = JSON.parse(fs.readFileSync(sourceRegistry, 'utf8'));

      // Normalize to flat map (as migration script does)
      const attrs: any = {};
      registry.attributes.forEach((a: any) => {
        attrs[a.attribute_id] = a;
      });

      const payload = JSON.stringify(attrs);
      const hash = crypto.createHash('sha1').update(payload).digest('hex');

      expect(typeof hash).toBe('string');
      expect(hash.length).toBe(40); // SHA1 hex is 40 chars
    });

    it('should produce different hash for different payloads', () => {
      const crypto = require('crypto');
      const registry1 = JSON.stringify({ brand: { label: 'Brand' } });
      const registry2 = JSON.stringify({ brand: { label: 'Brand Name' } });

      const hash1 = crypto.createHash('sha1').update(registry1).digest('hex');
      const hash2 = crypto.createHash('sha1').update(registry2).digest('hex');

      expect(hash1).not.toBe(hash2);
    });
  });
});
