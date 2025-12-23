#!/usr/bin/env node
/**
 * LP-ATTR-1.1.0: Canonical Attribute Registry Sync Script
 * 
 * Usage:
 *   node scripts/lp-attr-1.1.0-sync.js --dry [--out <output.json>]
 *   node scripts/lp-attr-1.1.0-sync.js --apply [--out <output.json>]
 * 
 * Environment:
 *   GOOGLE_APPLICATION_CREDENTIALS - Path to service account JSON
 */

const fs = require('fs');
const path = require('path');

// Parse CLI args
const args = process.argv.slice(2);
const dryRun = args.includes('--dry');
const apply = args.includes('--apply');
const outIdx = args.indexOf('--out');
const outPath = outIdx !== -1 && args[outIdx + 1] ? args[outIdx + 1] : null;

if (!dryRun && !apply) {
  console.error('Usage: node scripts/lp-attr-1.1.0-sync.js [--dry|--apply] [--out <file.json>]');
  process.exit(1);
}

// Set credentials if not already set
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  const saPath = path.resolve(__dirname, '../service-account.json');
  if (fs.existsSync(saPath)) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = saPath;
    console.log(`[LP-ATTR-1.1.0] Using service account: ${saPath}`);
  } else {
    console.error('❌ No GOOGLE_APPLICATION_CREDENTIALS set and no service-account.json found');
    process.exit(1);
  }
}

async function main() {
  console.log(`\n========================================`);
  console.log(`LP-ATTR-1.1.0: Canonical Attribute Registry Sync`);
  console.log(`Mode: ${dryRun ? 'DRY-RUN (no writes)' : 'APPLY (will write to Firestore)'}`);
  console.log(`========================================\n`);

  // Import the compiled sync function
  const syncModulePath = path.resolve(__dirname, '../packages/api/dist/tasks/syncAttributeRegistry.js');
  if (!fs.existsSync(syncModulePath)) {
    console.error(`❌ Sync module not found at ${syncModulePath}. Run 'pnpm --filter @ropi-aoss/api build' first.`);
    process.exit(1);
  }

  const { runSyncAttributeRegistry } = require(syncModulePath);

  // The sync function takes an options object: { dryRun: boolean }
  const options = { dryRun: dryRun };
  console.log(`Invoking runSyncAttributeRegistry(options=${JSON.stringify(options)})...\n`);
  
  const startTime = Date.now();
  const result = await runSyncAttributeRegistry(options);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

  // Enhance result with LP metadata
  const output = {
    lp: 'LP-ATTR-1.1.0',
    mode: dryRun ? 'dry-run' : 'apply',
    timestamp: new Date().toISOString(),
    elapsedSeconds: parseFloat(elapsed),
    result: {
      created: result.created,
      updated: result.updated,
      skipped: result.skipped,
      errorsCount: result.errors.length,
      errors: result.errors,
      totalAttributes: result.attributes.length,
      attributes: result.attributes
    },
    collisions: [], // placeholder - sync doesn't track collisions yet
    protectedOverwrites: 0,
    status: result.errors.length === 0 ? 'PASS' : 'FAILED'
  };

  console.log(`\n========================================`);
  console.log(`LP-ATTR-1.1.0 Sync Result:`);
  console.log(`  Mode: ${output.mode}`);
  console.log(`  Created: ${output.result.created}`);
  console.log(`  Updated: ${output.result.updated}`);
  console.log(`  Skipped: ${output.result.skipped}`);
  console.log(`  Errors: ${output.result.errorsCount}`);
  console.log(`  Total Attributes: ${output.result.totalAttributes}`);
  console.log(`  Elapsed: ${elapsed}s`);
  console.log(`  Status: ${output.status}`);
  console.log(`========================================\n`);

  if (outPath) {
    fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
    console.log(`📄 Output saved to: ${outPath}`);
  } else {
    console.log(JSON.stringify(output, null, 2));
  }

  process.exit(output.status === 'PASS' ? 0 : 1);
}

main().catch(err => {
  console.error('Sync failed:', err);
  process.exit(1);
});
