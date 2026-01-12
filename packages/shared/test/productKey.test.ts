// packages/shared/test/productKey.test.ts
import { describe, it, expect } from 'vitest';
import { normalizeMPN } from '../src/productKey';

describe('normalizeMPN', () => {
  it('should normalize basic MPN strings', () => {
    expect(normalizeMPN('ABC-123')).toBe('abc-123')
    expect(normalizeMPN('ABC_123')).toBe('abc-123')
    expect(normalizeMPN('ABC 123')).toBe('abc-123')
    expect(normalizeMPN('ABC/123')).toBe('abc-123')
  })

  it('should handle edge cases', () => {
    expect(normalizeMPN('')).toBe(null)
    expect(normalizeMPN('   ')).toBe(null)
    expect(normalizeMPN(undefined)).toBe(null)
    expect(normalizeMPN(null as any)).toBe(null)
  })

  it('should remove special characters', () => {
    expect(normalizeMPN('ABC.123!@#')).toBe('abc123')
    expect(normalizeMPN('ABC---123')).toBe('abc-123')
    expect(normalizeMPN('---ABC123---')).toBe('abc123')
  })

  it('should handle mixed cases and spaces', () => {
    expect(normalizeMPN('  ABC 123  ')).toBe('abc-123')
    expect(normalizeMPN('AbC_123/DeF')).toBe('abc-123-def')
  })

  it('should handle real world examples', () => {
    expect(normalizeMPN('DZ5485-410')).toBe('dz5485-410')
    expect(normalizeMPN('TEST_MPN_001')).toBe('test-mpn-001')
    expect(normalizeMPN('106 TEST')).toBe('106-test')
    expect(normalizeMPN('NIKE/AM90/001')).toBe('nike-am90-001')
  })

  it('should be idempotent', () => {
    const input = 'ABC_123/DEF'
    const normalized = normalizeMPN(input)
    expect(normalizeMPN(normalized!)).toBe(normalized)
  })
})