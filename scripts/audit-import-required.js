/**
 * LP-1.3.3: Registry audit script
 * Dump attributes with import_required:true to audit-import-required.json
 */
const fs = require('fs');
const path = require('path');

const registryPath = path.resolve(__dirname, '../evidence/importer-mapping-recon/attribute-registry.json');
const outPath = path.resolve(__dirname, '../evidence/importer-mapping-recon/audit-import-required.json');

try {
  const registryContent = fs.readFileSync(registryPath, 'utf8');
  const registry = JSON.parse(registryContent);
  
  // Handle both array format and { items: [...] } or { attributes: [...] } format
  const attrs = registry.items || registry.attributes || registry;
  
  if (!Array.isArray(attrs)) {
    console.error('Error: Registry data is not in expected format (array, {items: []}, or {attributes: []})');
    process.exit(1);
  }
  
  // Find attributes with import_required: true
  const flagged = attrs.filter(a => a.import_required === true);
  
  const auditReport = {
    generatedAt: new Date().toISOString(),
    source: registryPath,
    totalAttributes: attrs.length,
    importRequiredCount: flagged.length,
    importRequiredAttributes: flagged.map(a => ({
      attribute_id: a.attribute_id,
      label: a.label,
      import_required: a.import_required,
      required_for_completion: a.required_for_completion,
      usage: a.usage,
    })),
  };
  
  fs.writeFileSync(outPath, JSON.stringify(auditReport, null, 2));
  
  console.log('=== LP-1.3.3 Import Required Audit ===');
  console.log('Registry:', registryPath);
  console.log('Total attributes:', attrs.length);
  console.log('Attributes with import_required=true:', flagged.length);
  console.log('');
  console.log('Flagged attributes:');
  flagged.forEach(a => {
    console.log(`  - ${a.attribute_id} (${a.label})`);
  });
  console.log('');
  console.log('Wrote audit report to:', outPath);
  
  // Exit with code based on expected state
  // Expected: only 'mpn' or 'sku_core.mpn' should have import_required=true
  const expectedIds = ['mpn', 'sku_core.mpn'];
  const unexpected = flagged.filter(a => !expectedIds.includes(a.attribute_id));
  
  if (unexpected.length > 0) {
    console.log('');
    console.log('⚠️  WARNING: Unexpected attributes with import_required=true:');
    unexpected.forEach(a => {
      console.log(`  - ${a.attribute_id}`);
    });
    console.log('');
    console.log('Consider running clear-import-required-except-mpn.js migration after approval.');
  } else {
    console.log('');
    console.log('✅ Only MPN has import_required=true (as expected)');
  }
  
} catch (err) {
  console.error('Error reading registry:', err.message);
  process.exit(1);
}
