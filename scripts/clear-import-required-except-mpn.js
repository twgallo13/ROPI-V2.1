/**
 * LP-1.3.3: Migration script to clear import_required except for MPN
 * 
 * This script generates a migration file — it does NOT modify the live registry.
 * After review, apply the migration through the registry admin API or Firestore console.
 */
const fs = require('fs');
const path = require('path');

const registryPath = path.resolve(__dirname, '../evidence/importer-mapping-recon/attribute-registry.json');
const outPath = path.resolve(__dirname, '../evidence/importer-mapping-recon/attribute-registry-migration.json');

try {
  const registryContent = fs.readFileSync(registryPath, 'utf8');
  const registry = JSON.parse(registryContent);
  
  // Handle both array format and { items: [...] } or { attributes: [...] } format
  const attrs = registry.items || registry.attributes || registry;
  
  if (!Array.isArray(attrs)) {
    console.error('Error: Registry data is not in expected format (array, {items: []}, or {attributes: []})');
    process.exit(1);
  }
  
  // MPN attribute IDs that should keep import_required=true
  const mpnIds = ['mpn', 'sku_core.mpn'];
  
  let changedCount = 0;
  
  const modified = attrs.map(a => {
    const isMpn = mpnIds.includes(a.attribute_id);
    
    if (isMpn) {
      // Ensure MPN has import_required: true
      if (a.import_required !== true) {
        changedCount++;
        return { ...a, import_required: true };
      }
      return a;
    } else {
      // Clear import_required for everything else
      if (a.import_required === true) {
        changedCount++;
        return { ...a, import_required: false };
      }
      return a;
    }
  });
  
  // Preserve original structure
  let output;
  if (Array.isArray(registry)) {
    output = modified;
  } else if (registry.items) {
    output = { ...registry, items: modified };
  } else if (registry.attributes) {
    output = { ...registry, attributes: modified };
  } else {
    output = modified;
  }
  
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  
  console.log('=== LP-1.3.3 Import Required Migration ===');
  console.log('Source:', registryPath);
  console.log('Output:', outPath);
  console.log('');
  console.log('Changes:', changedCount, 'attribute(s) modified');
  console.log('');
  
  // List what would change
  const clearList = attrs.filter(a => !mpnIds.includes(a.attribute_id) && a.import_required === true);
  const setList = attrs.filter(a => mpnIds.includes(a.attribute_id) && a.import_required !== true);
  
  if (clearList.length > 0) {
    console.log('Will CLEAR import_required for:');
    clearList.forEach(a => console.log(`  - ${a.attribute_id}`));
  }
  
  if (setList.length > 0) {
    console.log('Will SET import_required=true for:');
    setList.forEach(a => console.log(`  - ${a.attribute_id}`));
  }
  
  console.log('');
  console.log('⚠️  Migration file written. Review and apply manually to Firestore.');
  console.log('');
  console.log('To apply:');
  console.log('  1. Review the migration file');
  console.log('  2. Use Firebase console or admin API to update registry');
  console.log('  3. Re-run audit-import-required.js to verify');
  
} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
}
