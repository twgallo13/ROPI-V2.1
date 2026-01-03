import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as svsModule from '../src/services/svsVerification';
import { ensureProtectedTestRule } from '../src/services/ensureTestRule';
import * as admin from 'firebase-admin';

vi.mock('firebase-admin', () => ({
  firestore: vi.fn(),
  initializeApp: vi.fn(),
}));

describe('SVS Verification Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should ensure protected test rule exists without error', async () => {
    await expect(ensureProtectedTestRule()).resolves.not.toThrow();
  });
});
