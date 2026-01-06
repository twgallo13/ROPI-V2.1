#!/usr/bin/env node
/**
 * VVP Test: Verify extractSelectedSites() returns ["shiekh.com"] for product 211737-90h1-8
 * This test simulates the product's attributes.website string case
 */

// Simulated extractSelectedSites function matching current implementation
function extractSelectedSites(product) {
  if (Array.isArray(product.websites) && product.websites.length > 0) {
    return product.websites;
  }
  if (Array.isArray(product.sites) && product.sites.length > 0) {
    return product.sites;
  }
  if (product.website && typeof product.website === 'string' && product.website.trim()) {
    return [product.website.trim()];
  }
  
  // Support attributes.website as array or string (CSV imports)
  const attrSite = product.attributes?.website;
  if (Array.isArray(attrSite) && attrSite.length > 0) {
    return attrSite;
  }
  if (typeof attrSite === 'string' && attrSite.trim()) {
    return [attrSite.trim()];
  }
  
  return [];
}

// Test 1: Product with attributes.website as string (CSV import case)
const product211737 = {
  id: '211737-90h1-8',
  attributes: {
    website: 'shiekh.com'
  }
};

const result1 = extractSelectedSites(product211737);
console.log('Test 1: CSV-imported product with attributes.website="shiekh.com"');
console.log(`  Input: ${JSON.stringify(product211737)}`);
console.log(`  Result: ${JSON.stringify(result1)}`);
console.log(`  Expected: ["shiekh.com"]`);
console.log(`  Status: ${JSON.stringify(result1) === JSON.stringify(['shiekh.com']) ? '✅ PASS' : '❌ FAIL'}`);
console.log('');

// Test 2: Product with whitespace in string
const productWithWhitespace = {
  id: 'test-product-2',
  attributes: {
    website: '  shiekh.com  '
  }
};

const result2 = extractSelectedSites(productWithWhitespace);
console.log('Test 2: CSV-imported product with whitespace: "  shiekh.com  "');
console.log(`  Input: ${JSON.stringify(productWithWhitespace)}`);
console.log(`  Result: ${JSON.stringify(result2)}`);
console.log(`  Expected: ["shiekh.com"]`);
console.log(`  Status: ${JSON.stringify(result2) === JSON.stringify(['shiekh.com']) ? '✅ PASS' : '❌ FAIL'}`);
console.log('');

// Test 3: Precedence test - websites array takes priority
const productWithPrecedence = {
  id: 'test-product-3',
  websites: ['primary-site.com'],
  attributes: {
    website: 'shiekh.com'
  }
};

const result3 = extractSelectedSites(productWithPrecedence);
console.log('Test 3: Precedence - websites array over attributes.website');
console.log(`  Input: websites=["primary-site.com"], attributes.website="shiekh.com"`);
console.log(`  Result: ${JSON.stringify(result3)}`);
console.log(`  Expected: ["primary-site.com"]`);
console.log(`  Status: ${JSON.stringify(result3) === JSON.stringify(['primary-site.com']) ? '✅ PASS' : '❌ FAIL'}`);
console.log('');

// Test 4: Array case in attributes.website (alternative CSV format)
const productWithArrayAttribute = {
  id: 'test-product-4',
  attributes: {
    website: ['mltd.com', 'sangremia.com']
  }
};

const result4 = extractSelectedSites(productWithArrayAttribute);
console.log('Test 4: attributes.website as array (alternative CSV format)');
console.log(`  Input: attributes.website=["mltd.com", "sangremia.com"]`);
console.log(`  Result: ${JSON.stringify(result4)}`);
console.log(`  Expected: ["mltd.com", "sangremia.com"]`);
console.log(`  Status: ${JSON.stringify(result4) === JSON.stringify(['mltd.com', 'sangremia.com']) ? '✅ PASS' : '❌ FAIL'}`);
console.log('');

// Summary
console.log('='.repeat(80));
console.log('SUMMARY: All 4 test cases should PASS for LP-export-site-extract-1.0.0');
console.log('='.repeat(80));
