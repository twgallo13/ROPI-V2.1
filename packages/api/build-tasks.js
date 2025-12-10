/**
 * Build script for API tasks
 * Compiles TypeScript task files to JavaScript
 */

const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

const tasksDir = path.resolve(__dirname, 'src/tasks');
const outDir = path.resolve(__dirname, 'dist/tasks');

// Ensure output directory exists
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Get all .ts files in tasks directory
const taskFiles = fs.readdirSync(tasksDir)
  .filter(file => file.endsWith('.ts'))
  .map(file => path.join(tasksDir, file));

console.log(`Building ${taskFiles.length} task files...`);

esbuild.build({
  entryPoints: taskFiles,
  bundle: true,
  platform: 'node',
  target: 'node20',
  outdir: outDir,
  format: 'cjs',
  sourcemap: true,
  alias: {
    '@ropi-aoss/sdk': path.resolve(__dirname, '../sdk/src/index.ts'),
  },
  external: [
    'firebase-admin',
    'firebase-functions',
    '@google-cloud/firestore',
    '@notionhq/client',
  ],
  logLevel: 'info',
}).then(() => {
  console.log('✅ Tasks built successfully');
}).catch((err) => {
  console.error('❌ Task build failed:', err);
  process.exit(1);
});
