/**
 * Vitest config for EMULATOR/integration tests.
 * Uses vitest.setup.emu.ts which has NO mocks.
 */
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./vitest.setup.emu.ts'],
    include: [
      'test/integration/**/*.spec.ts',
      'test/**/*.emu.test.ts',
      'test/**/*.emu.spec.ts',
    ],
    testTimeout: 30000,
    hookTimeout: 30000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
    deps: {
      // Don't try to inline/transform node_modules packages
      interopDefault: true,
    },
  },
  resolve: {
    alias: {
      '@ropi-aoss/sdk': path.resolve(__dirname, '../sdk/src'),
    },
  },
  // Prevent Vite from trying to bundle these native Node modules
  ssr: {
    noExternal: [],
    external: [
      '@google-cloud/storage',
      '@google-cloud/firestore', 
      'firebase-admin',
      'firebase-admin/firestore',
      'firebase-admin/auth',
      'express',
      'supertest',
    ],
  },
});
