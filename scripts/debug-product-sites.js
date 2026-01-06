#!/usr/bin/env node
/**
 * LP-export-site-triage-1.0.0: Debug product site extraction
 * Fetches product 211737-90h1-8 from Firestore and analyzes site fields
 */
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const serviceAccount = require('../service-account.json');

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function main() {
  console.log('=== LP-export-site-triage-1.0.0: Product Site Analysis ===\n');
  
  const productId = '211737-90h1-8';
  const doc = await db.collection('products').doc(productId).get();
  
  if (!doc.exists) {
    console.error(`ERROR: Product ${productId} NOT FOUND`);
    process.exit(1);
  }
  
  const data = doc.data();
  
  // Critical fields for site extraction analysis
  const output = {
    _docId: doc.id,
    _capturedAt: new Date().toISOString(),
    _analysis: 'LP-export-site-triage-1.0.0',
    _topLevelKeys: Object.keys(data),
    
    // Top-level site fields (what extractSelectedSites checks first)
    websites: data.websites,
    sites: data.sites,
    website: data.website,
    
    // Attributes object analysis
    hasAttributes: !!data.attributes,
    attributesKeys: data.attributes ? Object.keys(data.attributes) : null,
    
    // Site-related values in attributes (check all variants)
    attributeSiteFields: {
      'website': data.attributes?.website,
      'websites': data.attributes?.websites,
      'Websites': data.attributes?.Websites,
      'Website': data.attributes?.Website,
      'Attributes': data.attributes?.Attributes,
      'webSite': data.attributes?.webSite,
      'WEBSITE': data.attributes?.WEBSITE
    },
    
    // Types for debugging
    types: {
      websitesType: typeof data.websites,
      sitesType: typeof data.sites,
      websiteType: typeof data.website,
      attributesType: typeof data.attributes,
      'attributes.websiteType': typeof data.attributes?.website,
      'attributes.websiteIsArray': Array.isArray(data.attributes?.website)
    },
    
    // Other relevant fields
    mpn: data.mpn,
    title: data.title,
    status: data.status,
    exportReadiness: data.exportReadiness
  };
  
  console.log('=== PRODUCT SITE FIELD ANALYSIS ===\n');
  console.log(JSON.stringify(output, null, 2));
  
  // Simulate extractSelectedSites logic
  console.log('\n=== SIMULATED extractSelectedSites() ===\n');
  
  const selectedSites = simulateExtractSelectedSites(data);
  console.log('Result:', JSON.stringify(selectedSites));
  console.log('Length:', selectedSites.length);
  
  if (selectedSites.length === 0) {
    console.log('\n⚠️  WARNING: extractSelectedSites() returns EMPTY ARRAY');
    console.log('This explains "No sites selected for product" error');
    
    // Additional debugging
    console.log('\n=== ADDITIONAL DEBUG ===\n');
    console.log('Full attributes object:');
    console.log(JSON.stringify(data.attributes, null, 2));
    
    // Check for case-insensitive keys
    if (data.attributes) {
      console.log('\nCase-insensitive website key search:');
      for (const key of Object.keys(data.attributes)) {
        if (key.toLowerCase().includes('website') || key.toLowerCase().includes('site')) {
          console.log(`  Found key: "${key}" = ${JSON.stringify(data.attributes[key])}`);
        }
      }
    }
  } else {
    console.log('\n✅ extractSelectedSites() returns:', selectedSites);
  }
  
  // Save to evidence file
  const evidenceDir = path.join(__dirname, '..', 'evidence', 'lp-export-site-triage');
  if (!fs.existsSync(evidenceDir)) {
    fs.mkdirSync(evidenceDir, { recursive: true });
  }
  
  const evidencePath = path.join(evidenceDir, 'product-211737-90h1-8-staging.json');
  fs.writeFileSync(evidencePath, JSON.stringify(output, null, 2));
  console.log(`\nEvidence saved to: ${evidencePath}`);
}

/**
 * Simulate extractSelectedSites from completionDrivenExportReadiness.ts
 */
function simulateExtractSelectedSites(product) {
  // LP-export-site-extract-1.0.0: Precedence order:
  // 1. product.websites (array)
  if (Array.isArray(product.websites) && product.websites.length > 0) {
    console.log('  Source: product.websites (array)');
    return product.websites;
  }
  // 2. product.sites (array)
  if (Array.isArray(product.sites) && product.sites.length > 0) {
    console.log('  Source: product.sites (array)');
    return product.sites;
  }
  // 3. product.website (string)
  if (product.website && typeof product.website === 'string' && product.website.trim()) {
    console.log('  Source: product.website (string)');
    return [product.website.trim()];
  }
  
  // 4. product.attributes.website (array or string)
  const attrSite = product.attributes?.website;
  if (Array.isArray(attrSite) && attrSite.length > 0) {
    console.log('  Source: product.attributes.website (array)');
    return attrSite;
  }
  if (typeof attrSite === 'string' && attrSite.trim()) {
    console.log('  Source: product.attributes.website (string)');
    return [attrSite.trim()];
  }
  
  console.log('  Source: NONE FOUND');
  return [];
}

main().then(() => process.exit(0)).catch(e => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
