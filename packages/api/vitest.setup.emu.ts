/**
 * Vitest setup for EMULATOR/integration tests (NO mocks).
 * This file should be used when running tests WITH the Firebase Emulator.
 * 
 * DO NOT add any vi.mock() calls here - emulator tests need real firebase-admin.
 */
import { vi } from 'vitest';

const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
console.log(`[vitest.setup.emu] Loading emulator test setup - FIRESTORE_EMULATOR_HOST=${emulatorHost}`);

if (!emulatorHost) {
  console.warn('[vitest.setup.emu] WARNING: FIRESTORE_EMULATOR_HOST is not set! Tests may fail or hit production.');
}

// No mocks - emulator tests use real firebase-admin against the emulator
console.log('[vitest.setup.emu] Emulator setup complete - using real firebase-admin');
