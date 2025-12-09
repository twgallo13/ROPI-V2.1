/**
 * Audit Script: Find distinct product attribute values
 * 
 * Queries Firestore products collection and extracts unique values
 * for specified attributes with counts.
 * 
 * Usage: node scripts/distinctProductAttributeValues.js [attribute_keys...]
 * Example: node scripts/distinctProductAttributeValues.js department class category
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: process.env.GCLOUD_PROJECT || 'ropi-bccee'
  });
}

const db = admin.firestore();

/**
 * Get distinct values for a specific attribute across all products
 */
async function getDistinctValues(attributeKey, limit = 50) {
  console.log(`\n📊 Analyzing attribute: ${attributeKey}`);
  
  const valueCounts = new Map();
  let processedCount = 0;
  let lastDoc = null;
  const batchSize = 500;
  
  try {
    while (true) {
      let query = db.collection('products')
        .orderBy(admin.firestore.FieldPath.documentId())
        .limit(batchSize);
      
      if (lastDoc) {
        query = query.startAfter(lastDoc);
      }
      
      const snapshot = await query.get();
      
      if (snapshot.empty) break;
      
      snapshot.forEach(doc => {
        const data = doc.data();
        
        // Check both top-level and attributes map
        const topValue = data[attributeKey];
        const attrValue = data.attributes?.[attributeKey];
        const value = topValue || attrValue;
        
        if (value !== undefined && value !== null && value !== '') {
          const valueStr = String(value).trim();
          valueCounts.set(valueStr, (valueCounts.get(valueStr) || 0) + 1);
        }
        
        processedCount++;
      });
      
      lastDoc = snapshot.docs[snapshot.docs.length - 1];
      console.log(`  Processed ${processedCount} products...`);
      
      if (snapshot.size < batchSize) break;
    }
    
    // Sort by count descending and get top N
    const sorted = Array.from(valueCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);
    
    console.log(`  ✓ Found ${valueCounts.size} distinct values`);
    console.log(`  Top 10:`);
    sorted.slice(0, 10).forEach(([value, count]) => {
      console.log(`    "${value}": ${count}`);
    });
    
    return {
      attribute: attributeKey,
      totalDistinct: valueCounts.size,
      topValues: sorted.map(([value, count]) => ({ value, count }))
    };
    
  } catch (error) {
    console.error(`  ✗ Error analyzing ${attributeKey}:`, error.message);
    return {
      attribute: attributeKey,
      error: error.message,
      topValues: []
    };
  }
}

/**
 * Get allowed values from attribute registry
 */
async function getAllowedValues(attributeId) {
  try {
    const doc = await db.collection('settings')
      .doc('attributes')
      .collection('keys')
      .doc(attributeId)
      .get();
    
    if (!doc.exists) {
      return null;
    }
    
    const data = doc.data();
    return data.allowed_values || [];
  } catch (error) {
    console.error(`Error getting allowed values for ${attributeId}:`, error.message);
    return null;
  }
}

/**
 * Compare product values against registry allowed values
 */
function compareValues(productValues, allowedValues) {
  if (!allowedValues || allowedValues.length === 0) {
    return productValues.map(pv => ({
      ...pv,
      matched: false,
      matchedValue: null,
      matchType: 'NO_REGISTRY'
    }));
  }
  
  const allowedSet = new Set(allowedValues.map(v => 
    typeof v === 'string' ? v : v.value
  ));
  
  return productValues.map(pv => {
    const exactMatch = allowedSet.has(pv.value);
    
    if (exactMatch) {
      return {
        ...pv,
        matched: true,
        matchedValue: pv.value,
        matchType: 'EXACT'
      };
    }
    
    // Check for case-insensitive match
    const normalizedValue = pv.value.toLowerCase().trim();
    const caseMatch = Array.from(allowedSet).find(av => 
      av.toLowerCase().trim() === normalizedValue
    );
    
    if (caseMatch) {
      return {
        ...pv,
        matched: true,
        matchedValue: caseMatch,
        matchType: 'CASE_INSENSITIVE'
      };
    }
    
    // Check for fuzzy match (partial string match)
    const fuzzyMatch = Array.from(allowedSet).find(av =>
      av.toLowerCase().includes(normalizedValue) ||
      normalizedValue.includes(av.toLowerCase())
    );
    
    if (fuzzyMatch) {
      return {
        ...pv,
        matched: false,
        matchedValue: fuzzyMatch,
        matchType: 'FUZZY'
      };
    }
    
    return {
      ...pv,
      matched: false,
      matchedValue: null,
      matchType: 'NO_MATCH'
    };
  });
}

/**
 * Generate CSV report
 */
function generateCSV(results) {
  const rows = [
    ['attribute_id', 'product_value', 'count', 'matched', 'matched_allowed_value', 'match_type']
  ];
  
  results.forEach(result => {
    if (result.error) {
      rows.push([result.attribute, 'ERROR', 0, false, result.error, 'ERROR']);
      return;
    }
    
    result.comparison.forEach(item => {
      rows.push([
        result.attribute,
        item.value,
        item.count,
        item.matched,
        item.matchedValue || '',
        item.matchType
      ]);
    });
  });
  
  return rows.map(row => row.map(cell => {
    const str = String(cell);
    return str.includes(',') || str.includes('"') || str.includes('\n')
      ? `"${str.replace(/"/g, '""')}"`
      : str;
  }).join(',')).join('\n');
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  
  const defaultAttributes = [
    'department',
    'class',
    'category',
    'websites',
    'brand',
    'primaryColor',
    'descriptiveColor'
  ];
  
  const attributesToAnalyze = args.length > 0 ? args : defaultAttributes;
  
  console.log('🔍 Attribute Value Audit');
  console.log('========================\n');
  console.log(`Analyzing: ${attributesToAnalyze.join(', ')}`);
  
  const results = [];
  
  for (const attr of attributesToAnalyze) {
    const productValues = await getDistinctValues(attr, 50);
    
    if (productValues.error) {
      results.push(productValues);
      continue;
    }
    
    console.log(`\n📋 Comparing against registry for: ${attr}`);
    const allowedValues = await getAllowedValues(attr);
    
    if (allowedValues) {
      console.log(`  Registry has ${allowedValues.length} allowed values`);
    } else {
      console.log(`  ⚠️  No registry entry found`);
    }
    
    const comparison = compareValues(productValues.topValues, allowedValues);
    
    const matchedCount = comparison.filter(c => c.matched).length;
    const unmatchedCount = comparison.filter(c => !c.matched).length;
    
    console.log(`  Matched: ${matchedCount}, Unmatched: ${unmatchedCount}`);
    
    results.push({
      ...productValues,
      allowedValues,
      comparison
    });
  }
  
  // Generate reports
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputDir = path.join(__dirname, '..', 'artifacts', 'attribute-audit');
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // CSV report
  const csvPath = path.join(outputDir, `attribute-audit-${timestamp}.csv`);
  const csv = generateCSV(results);
  fs.writeFileSync(csvPath, csv);
  console.log(`\n✅ CSV report saved: ${csvPath}`);
  
  // JSON report (full data)
  const jsonPath = path.join(outputDir, `attribute-audit-${timestamp}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));
  console.log(`✅ JSON report saved: ${jsonPath}`);
  
  // Summary
  console.log('\n📊 Summary:');
  results.forEach(r => {
    if (r.error) {
      console.log(`  ${r.attribute}: ERROR - ${r.error}`);
      return;
    }
    
    const total = r.comparison.length;
    const matched = r.comparison.filter(c => c.matched).length;
    const percentage = total > 0 ? ((matched / total) * 100).toFixed(1) : 0;
    
    console.log(`  ${r.attribute}: ${matched}/${total} (${percentage}%) matched`);
  });
  
  console.log('\n✨ Audit complete!');
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
