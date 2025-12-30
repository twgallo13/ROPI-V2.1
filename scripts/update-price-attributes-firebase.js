#!/usr/bin/env node
/**
 * Update price and shipping attributes in Firebase
 * Usage: node scripts/update-price-attributes-firebase.js
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!serviceAccountPath) {
  console.error('❌ GOOGLE_APPLICATION_CREDENTIALS environment variable not set');
  console.error('   Please set this to path of your Firebase service account JSON');
  process.exit(1);
}

const serviceAccount = require(path.resolve(serviceAccountPath));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: serviceAccount.project_id,
});

const db = admin.firestore();

const PRICE_ATTRIBUTES = [
  { attribute_id: 'scom_regular_price', data_type: 'money' },
  { attribute_id: 'scom_sale_price', data_type: 'money' },
  { attribute_id: 'standard_shipping_override', data_type: 'money' },
  { attribute_id: 'expedited_override_shipping', data_type: 'money' },
];

async function updateAttributes() {
  console.log('\n🔄 Updating Firebase attributes...\n');

  try {
    for (const attr of PRICE_ATTRIBUTES) {
      const attrRef = db.collection('attributes').doc(attr.attribute_id);
      
      await attrRef.set(
        {
          data_type: attr.data_type,
          required_for_completion: false,
          required_for_export: false,
          import_required: false,
          status: 'active',
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      console.log(`✅ ${attr.attribute_id}: updated to data_type="${attr.data_type}"`);
    }

    console.log('\n✨ All price attributes updated in Firebase!\n');
  } catch (error) {
    console.error('❌ Error updating attributes:', error.message);
    process.exit(1);
  } finally {
    await admin.app().delete();
  }
}

updateAttributes();
