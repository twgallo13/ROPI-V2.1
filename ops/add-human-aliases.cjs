// Adds human-friendly importer aliases to scripts/attribute-registry-normalized.json
const fs = require('fs');
const path = 'scripts/attribute-registry-normalized.json';
const reg = JSON.parse(fs.readFileSync(path,'utf8'));

const additions = {
  "technical.lastReceived": ["Last Received"],
  "sku_core.department": ["Group"],
  "descriptive.primaryColor": ["Primary Color"],
  "descriptive.descriptiveColor": ["Descriptive Color"],
  "sku_core.productIsActive": ["Product Is Active"],
  "technical.mediaStatus": ["Media"],
  "launch.newCollection": ["New Collection"],
  "launch.klPostDate": ["KL Post Date"],
  "technical.hideImageDate": ["Hide Image Until Date"],
  "rics_source.color": ["RICS Color"],
  "rics_source.shortDescription": ["RICS Short Description"],
  "technical.storeInv": ["Store Inv"],
  "technical.warehouseInv": ["Warehouse Inv"],
  "technical.variantCount": ["Variant Count"],
  "technical.whsInv": ["WHS inv"],
  "launch.launchDate": ["Launch Date"],
  "descriptive.custom2": ["Custom 2"],
  "descriptive.custom3": ["Custom 3"],
  "pricing.scomRegularPrice": ["SCOM Regular Price"],
  "pricing.scomSalePrice": ["SCOM Sale Price"],
  "sku_core.dropshipName": ["Product Is Dropship.Name"]
};

// Helper: find index by canonicalPath
const findIndexByCanonical = cp => reg.findIndex(r=>r.canonicalPath === cp);

for (const [canonical, aliases] of Object.entries(additions)) {
  const idx = findIndexByCanonical(canonical);
  if (idx >= 0) {
    const obj = reg[idx];
    obj.importerColumns = obj.importerColumns || [];
    for (const a of aliases) {
      if (!obj.importerColumns.includes(a)) obj.importerColumns.push(a);
    }
    if (obj.canonicalPath === 'descriptive.primaryColor') {
      obj.importerColumns = obj.importerColumns.filter(c => c !== 'rics_color');
    }
  } else {
    const key = canonical.split('.').pop();
    console.log('CREATING missing attribute for', canonical);
    reg.push({
      key: key,
      canonicalPath: canonical,
      label: key,
      category: canonical.split('.')[0] || 'Uncategorized',
      dataType: 'string',
      required: false,
      export: true,
      description: `Added human alias for ${canonical}`,
      systemFlag: false,
      legacyPaths: [],
      importerColumns: aliases,
      rules: [],
      usage: []
    });
  }
}

fs.writeFileSync(path, JSON.stringify(reg, null, 2) + '\n', 'utf8');
console.log('WROTE', path);
