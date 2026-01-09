#!/usr/bin/env node
/**
 * Fix completion rules requirement flags in Firestore
 * Problem: demographics-color and materials-fit segments have invalid requirementFlag values
 * Fix: Set correct values or remove for optional segments
 */

const admin = require('firebase-admin');
const sa = require('/tmp/sa.json');

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(sa) });
}

const db = admin.firestore();

async function fixCompletionRules() {
  try {
    console.log('📝 Fetching current completion rules...');
    const settingsRef = db.doc('settings/exportSettings');
    const snapshot = await settingsRef.get();
    
    if (!snapshot.exists) {
      throw new Error('settings/exportSettings not found');
    }
    
    const data = snapshot.data();
    const rules = data.completionRules;
    
    console.log(`Current rulesVersion: ${rules.rulesVersion}`);
    console.log('\nCurrent segment requirementFlags:');
    rules.segments.forEach(seg => {
      console.log(`  ${seg.id}: "${seg.attributeSelector.requirementFlag}"`);
    });
    
    // Fix the segments
    const updatedSegments = rules.segments.map(seg => {
      const updated = { ...seg };
      
      // Fix demographics-color segment
      if (seg.id === 'demographics-color') {
        console.log(`\n🔧 Fixing ${seg.id}: "ai_describe" → null (optional ANY_REQUIRED)`);
        updated.attributeSelector = {
          ...seg.attributeSelector,
          requirementFlag: null  // Optional attributes, just check categories
        };
      }
      
      // Fix materials-fit segment
      if (seg.id === 'materials-fit') {
        console.log(`🔧 Fixing ${seg.id}: "Technical" → null (optional ANY_REQUIRED)`);
        updated.attributeSelector = {
          ...seg.attributeSelector,
          requirementFlag: null,  // Optional attributes
          categories: ['materials_construction']  // Also fix category name
        };
      }
      
      return updated;
    });
    
    const updatedRules = {
      ...rules,
      segments: updatedSegments,
      rulesVersion: rules.rulesVersion + 1,
      updatedAt: new Date().toISOString(),
      updatedBy: 'fix-requirement-flags-script'
    };
    
    console.log(`\n✅ Updating to rulesVersion ${updatedRules.rulesVersion}`);
    console.log('\nUpdated segment requirementFlags:');
    updatedRules.segments.forEach(seg => {
      console.log(`  ${seg.id}: ${JSON.stringify(seg.attributeSelector.requirementFlag)}`);
      console.log(`    categories: ${JSON.stringify(seg.attributeSelector.categories)}`);
    });
    
    await settingsRef.update({
      completionRules: updatedRules
    });
    
    console.log('\n✅ Firestore updated successfully!');
    console.log('\n📋 Expected behavior after fix:');
    console.log('  - Product Core (core-identifiers): Check sku_core with required_for_completion flag');
    console.log('  - Attribute Details (classification): Check classification with required_for_completion flag');
    console.log('  - AI Describe (demographics-color): Check identity_demographic + color categories (ANY present)');
    console.log('  - Technical (materials-fit): Check materials_construction category (ANY present)');
    console.log('\n  Product 14-test should now show:');
    console.log('    - Product Core: ~50% (has mpn, missing sku and other required sku_core attrs)');
    console.log('    - Attribute Details: 100% (has category, department, class)');
    console.log('    - AI Describe: 100% (has gender, age_group)');
    console.log('    - Technical: 0% (missing material, fit, etc.)');
    console.log('    - Total: ~62% (weighted average)');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    process.exit(1);
  }
}

fixCompletionRules();
