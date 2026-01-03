import { describe, it, expect } from 'vitest';
import { cleanObject } from '../src/lib/cleanObject';

describe('cleanObject', () => {
  it('should remove undefined values from flat objects', () => {
    const input = {
      name: 'test',
      value: undefined,
      count: 42,
      flag: false,
    };

    const result = cleanObject(input);

    expect(result).toEqual({
      name: 'test',
      count: 42,
      flag: false,
    });
    expect(result).not.toHaveProperty('value');
  });

  it('should recursively clean nested objects', () => {
    const input = {
      outer: {
        inner: {
          defined: 'value',
          undefined: undefined,
        },
        alsoUndefined: undefined,
      },
      topLevel: 'kept',
    };

    const result = cleanObject(input);

    expect(result).toEqual({
      outer: {
        inner: {
          defined: 'value',
        },
      },
      topLevel: 'kept',
    });
  });

  it('should clean arrays and remove undefined elements', () => {
    const input = {
      items: ['a', undefined, 'b', null, 'c'],
      nested: [{ x: 1, y: undefined }, { z: 2 }],
    };

    const result = cleanObject(input);

    expect(result.items).toEqual(['a', 'b', null, 'c']);
    expect(result.nested).toEqual([{ x: 1 }, { z: 2 }]);
  });

  it('should preserve null values (Firestore allows null)', () => {
    const input = {
      nullValue: null,
      undefinedValue: undefined,
      zeroValue: 0,
      emptyString: '',
      falseValue: false,
    };

    const result = cleanObject(input);

    expect(result).toEqual({
      nullValue: null,
      zeroValue: 0,
      emptyString: '',
      falseValue: false,
    });
    expect(result).not.toHaveProperty('undefinedValue');
  });

  it('should handle empty objects', () => {
    const input = { a: undefined, b: undefined };
    const result = cleanObject(input);
    expect(result).toEqual({});
  });

  it('should return primitives unchanged', () => {
    expect(cleanObject('string')).toBe('string');
    expect(cleanObject(42)).toBe(42);
    expect(cleanObject(true)).toBe(true);
    expect(cleanObject(null)).toBe(null);
  });

  it('should handle deeply nested structures', () => {
    const input = {
      level1: {
        level2: {
          level3: {
            value: 'deep',
            removed: undefined,
          },
        },
        alsoRemoved: undefined,
      },
    };

    const result = cleanObject(input);

    expect(result).toEqual({
      level1: {
        level2: {
          level3: {
            value: 'deep',
          },
        },
      },
    });
  });

  it('should handle audit document example', () => {
    const auditDoc = {
      actor: 'user-123',
      action: 'create',
      reason: undefined,
      timestamp: 1234567890,
      metadata: {
        source: 'api',
        details: undefined,
      },
    };

    const result = cleanObject(auditDoc);

    expect(result).toEqual({
      actor: 'user-123',
      action: 'create',
      timestamp: 1234567890,
      metadata: {
        source: 'api',
      },
    });
  });
});
