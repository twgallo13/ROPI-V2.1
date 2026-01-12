/**
 * esbuild configuration for Firebase Functions
 * 
 * Bundles the API code with @ropi-aoss/sdk included inline
 * to avoid module resolution issues in Cloud Functions.
 */

const esbuild = require('esbuild');
const path = require('path');

esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  outfile: 'dist/index.js',
  format: 'cjs',
  sourcemap: true,
  alias: {
    '@ropi-aoss/sdk': path.resolve(__dirname, '../sdk/src/index.ts'),
    '@ropi-aoss/shared': path.resolve(__dirname, '../shared/src/index.ts'),
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
}).catch(() => process.exit(1));
