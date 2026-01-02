/**
 * Reset test product for UI verification
 */
import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({ projectId: 'ropi-bccee' });
}

const db = admin.firestore();

// Reset gender back to Smart Rule state
await db.collection('products').doc('s5-test-product-provenance').update({
  'attributes.gender': 'Men',
  'provenance.attributes_gender': {
    source: 'smartRule',
    ruleId: 'rule_gender_from_rics',
    ruleName: 'Gender from RICS Category',
    appliedAt: new Date().toISOString(),
    input: { ricsCategory: "Men's Athletic Footwear" },
    reason: "Matched RICS category pattern: 'Men's' prefix detected"
  }
});

console.log('✅ Product reset to Smart Rule state for UI verification');
console.log('🔗 Refresh: https://ropi-aoss-staging.web.app/products/s5-test-product-provenance');
