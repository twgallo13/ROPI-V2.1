/**
 * esbuild configuration for Firebase Functions
 * 
 * Bundles the API code with @ropi-aoss/sdk included inline
 * to avoid module resolution issues in Cloud Functions.
 */

const esbuild = require('esbuild');
const path = require('path');

const commonOptions = {
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  sourcemap: true,
  alias: {
    '@ropi-aoss/sdk': path.resolve(__dirname, '../sdk/src/index.ts'),
  },
  external: [
    // Firebase and core dependencies (provided by Cloud Functions runtime)
    'firebase-admin',
    'firebase-functions',
    'firebase-functions/v1',
    // Node.js built-in modules
    'path',
    'fs',
    'os',
    'crypto',
    'stream',
    'http',
    'https',
    'url',
    'util',
    'zlib',
    'events',
    'buffer',
    'querystring',
    'child_process',
    'net',
    'tls',
    'dns',
    // Dependencies that should be installed via package.json
    'express',
    'cors',
    'busboy',
    'papaparse',
    'uuid',
  ],
  resolveExtensions: ['.ts', '.js'],
  logLevel: 'info',
};

// Build main index
esbuild.build({
  ...commonOptions,
  entryPoints: ['src/index.ts'],
  outfile: 'dist/index.js',
}).catch(() => process.exit(1));

// Build task files separately for CLI usage
esbuild.build({
  ...commonOptions,
  entryPoints: [
    'src/tasks/syncAttributeRegistry.ts',
    'src/tasks/migrateProductsToAttributes.ts',
    'src/tasks/normalizeProductAttributeValues.ts',
  ],
  outdir: 'dist/tasks',
}).catch(() => process.exit(1));
