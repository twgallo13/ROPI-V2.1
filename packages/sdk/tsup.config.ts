import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  outDir: 'dist',
  dts: false, // Skip dts generation - using manual index.d.ts
  sourcemap: false,
  clean: false, // Don't clean to preserve manual index.d.ts
  splitting: false,
  treeshake: true,
  external: [],
  cjsInterop: true, // Enable CJS interop for better compatibility
  platform: 'neutral',
});
