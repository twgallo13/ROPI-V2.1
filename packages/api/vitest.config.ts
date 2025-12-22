import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./vitest.setup.unit.ts'],
    exclude: [
      '**/node_modules/**',
      '**/integration/**',
      '**/*.emu.test.ts',
      '**/*.emu.spec.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
  resolve: {
    alias: {
      '@ropi-aoss/sdk': path.resolve(__dirname, '../sdk/src'),
    },
  },
});
