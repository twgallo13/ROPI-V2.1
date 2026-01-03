#!/usr/bin/env node
/**
 * add-rics-category-to-firestore.mjs
 * 
 * One-time script to add rics_category attribute to Firestore registry.
 * 
 * Usage:
 *   node scripts/add-rics-category-to-firestore.mjs
 */

import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase
if (!admin.apps.length) {
  admin.initializeApp({ projectId: 'ropi-bccee' });
}
const db = getFirestore();

const ATTRIBUTES_COLLECTION = 'settings/attributes/keys';

async function addRicsCategory() {
  console.log('📝 Adding rics_category to Firestore attribute registry...\n');
  
  const attributeData = {
    attribute_id: 'rics_category',
    label: 'RICS Category',
    category: 'classification',
    description: "Canonical RICS category string used for Smart Rules condition matching (e.g., 'Men's Footwear > Athletic'). Read-only for Smart Rules.",
    data_type: 'text',
    import: true,
    exportable: false,
    internalOnly: false,
    requiredForExport: false,
    required_for_completion: false,
    required_for_export: false,
    import_required: false,
    status: 'active',
    normalization: {
      trim: true,
      lowercase: true
    }
  };
  
  try {
    // Check if it already exists
    const docRef = db.collection(ATTRIBUTES_COLLECTION).doc('rics_category');
    const existing = await docRef.get();
    
    if (existing.exists) {
      console.log('⚠️  rics_category already exists in Firestore. Updating...\n');
      await docRef.update(attributeData);
      console.log('✅ Updated rics_category in Firestore\n');
    } else {
      await docRef.set(attributeData);
      console.log('✅ Added rics_category to Firestore\n');
    }
    
    // Verify
    const verify = await docRef.get();
    console.log('📋 Verification:');
    console.log(JSON.stringify(verify.data(), null, 2));
    console.log('\n✅ SUCCESS - rics_category is now in the registry\n');
    
  } catch (error) {
    console.error('❌ Error adding rics_category:', error);
    process.exit(1);
  }
}

addRicsCategory()
  .then(() => {
    console.log('🎉 Complete! Run audit script again to verify.');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
