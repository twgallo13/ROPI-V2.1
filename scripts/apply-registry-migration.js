/**
 * LP-1.3.4: Apply registry migration
 * 
 * This script applies the migration file to the local attribute registry.
 * 
 * Usage:
 *   node scripts/apply-registry-migration.js <migration-file>
 * 
 * Example:
 *   node scripts/apply-registry-migration.js evidence/importer-mapping-recon/attribute-registry-migration.json
 */
const fs = require('fs');
const path = require('path');

const migrationPath = process.argv[2];
if (!migrationPath) {
  console.error('Usage: node apply-registry-migration.js <migration-file>');
  process.exit(1);
}

const registryPath = path.resolve(__dirname, '../evidence/importer-mapping-recon/attribute-registry.json');
const fullMigrationPath = path.resolve(process.cwd(), migrationPath);

console.log('=== LP-1.3.4 Apply Registry Migration ===');
console.log('Migration file:', fullMigrationPath);
console.log('Target registry:', registryPath);
console.log('');

try {
  // Read migration file
  if (!fs.existsSync(fullMigrationPath)) {
    console.error('ERROR: Migration file not found:', fullMigrationPath);
    process.exit(1);
  }
  
  const migrationContent = fs.readFileSync(fullMigrationPath, 'utf8');
  const migration = JSON.parse(migrationContent);
  
  // Read current registry for comparison
  const currentContent = fs.readFileSync(registryPath, 'utf8');
  const current = JSON.parse(currentContent);
  
  // Get attributes from both
  const currentAttrs = current.items || current.attributes || current;
  const migrationAttrs = migration.items || migration.attributes || migration;
  
  if (!Array.isArray(currentAttrs) || !Array.isArray(migrationAttrs)) {
    console.error('ERROR: Invalid registry format');
    process.exit(1);
  }
  
  // Log changes being applied
  console.log('Changes to apply:');
  let changeCount = 0;
  
  migrationAttrs.forEach((mAttr, idx) => {
    const cAttr = currentAttrs.find(c => c.attribute_id === mAttr.attribute_id);
    if (cAttr && cAttr.import_required !== mAttr.import_required) {
      changeCount++;
      console.log(`  [${changeCount}] ${mAttr.attribute_id}: import_required ${cAttr.import_required} → ${mAttr.import_required}`);
    }
  });
  
  if (changeCount === 0) {
    console.log('  (no changes detected)');
  }
  
  console.log('');
  console.log('Applying migration...');
  
  // Write migration to registry
  fs.writeFileSync(registryPath, JSON.stringify(migration, null, 2));
  
  console.log('✅ Migration applied successfully');
  console.log('');
  console.log('Total changes:', changeCount);
  console.log('');
  console.log('Next steps:');
  console.log('  1. Run: node scripts/audit-import-required.js');
  console.log('  2. Verify only MPN has import_required:true');
  console.log('  3. Commit changes');
  
  process.exit(0);
} catch (err) {
  console.error('ERROR:', err.message);
  process.exit(1);
}
