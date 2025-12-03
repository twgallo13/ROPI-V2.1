/**
 * Tests for Email Verification Policy and Environment Utilities
 * 
 * PROMPT_018C_vB: Sprint B — IAM, Email Verification, Launch Calendar
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  isProduction,
  isStaging,
  isPublicSignupEnabled,
  hasWriteCapableRole,
  shouldBlockWrites,
  getBlockedWriteMessage,
} from '../src/utils/envPolicy';

describe('Environment Detection', () => {
  beforeEach(() => {
    // Reset environment variables
    vi.unstubAllEnvs();
  });

  it('should detect production environment', () => {
    vi.stubEnv('VITE_ENV', 'production');
    expect(isProduction()).toBe(true);
    expect(isStaging()).toBe(false);
  });

  it('should detect staging environment', () => {
    vi.stubEnv('VITE_ENV', 'staging');
    expect(isProduction()).toBe(false);
    expect(isStaging()).toBe(true);
  });

  it('should default to staging when VITE_ENV is not set', () => {
    expect(isProduction()).toBe(false);
    expect(isStaging()).toBe(true);
  });

  it('should detect when public signup is enabled', () => {
    vi.stubEnv('VITE_LAUNCH_SIGNUP_PUBLIC_ENABLED', 'true');
    expect(isPublicSignupEnabled()).toBe(true);
  });

  it('should detect when public signup is disabled', () => {
    vi.stubEnv('VITE_LAUNCH_SIGNUP_PUBLIC_ENABLED', 'false');
    expect(isPublicSignupEnabled()).toBe(false);
  });
});

describe('Write Capable Roles', () => {
  it('should identify admin as write-capable', () => {
    expect(hasWriteCapableRole('admin')).toBe(true);
  });

  it('should identify merch as write-capable', () => {
    expect(hasWriteCapableRole('merch')).toBe(true);
  });

  it('should identify buyer as write-capable', () => {
    expect(hasWriteCapableRole('buyer')).toBe(true);
  });

  it('should identify photographer as write-capable', () => {
    expect(hasWriteCapableRole('photographer')).toBe(true);
  });

  it('should not identify viewer as write-capable', () => {
    expect(hasWriteCapableRole('viewer')).toBe(false);
  });

  it('should handle undefined role', () => {
    expect(hasWriteCapableRole(undefined)).toBe(false);
  });
});

describe('Write Blocking Policy', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  describe('Staging (Soft Enforcement)', () => {
    beforeEach(() => {
      vi.stubEnv('VITE_ENV', 'staging');
    });

    it('should NOT block writes for unverified admin in staging', () => {
      expect(shouldBlockWrites(false, true)).toBe(false);
    });

    it('should NOT block writes for verified admin in staging', () => {
      expect(shouldBlockWrites(true, true)).toBe(false);
    });

    it('should NOT block writes for unverified non-admin in staging', () => {
      expect(shouldBlockWrites(false, false)).toBe(false);
    });
  });

  describe('Production (Hard Enforcement)', () => {
    beforeEach(() => {
      vi.stubEnv('VITE_ENV', 'production');
    });

    it('should block writes for unverified admin in production', () => {
      expect(shouldBlockWrites(false, true)).toBe(true);
    });

    it('should NOT block writes for verified admin in production', () => {
      expect(shouldBlockWrites(true, true)).toBe(false);
    });

    it('should NOT block writes for unverified non-admin in production', () => {
      expect(shouldBlockWrites(false, false)).toBe(false);
    });

    it('should NOT block writes for verified non-admin in production', () => {
      expect(shouldBlockWrites(true, false)).toBe(false);
    });
  });

  it('should provide human-readable error message', () => {
    const message = getBlockedWriteMessage();
    expect(message).toContain('Email verification required');
    expect(message).toContain('verify your email');
  });
});
