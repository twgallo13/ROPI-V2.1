/**
 * Staging Test Setup for S5 Verification
 * Creates a test product with Smart Rule provenance
 */

import admin from 'firebase-admin';

// Initialize with default credentials (uses gcloud auth or GOOGLE_APPLICATION_CREDENTIALS)
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'ropi-bccee'
  });
}

const db = admin.firestore();

// Test product with Smart Rule provenance
const TEST_PRODUCT_ID = 's5-test-product-provenance';

const testProduct = {
  id: TEST_PRODUCT_ID,
  name: 'S5 Test Product - Smart Rule Provenance',
  sku: 'S5-TEST-001',
  brand: 'Test Brand',
  status: 'in-progress',
  category: 'Footwear',
  department: 'Men',
  websites: ['shiekh.com'],
  
  // Attributes with Smart Rule provenance
  attributes: {
    gender: 'Men',
    age_group: 'Adult',
    primary_color: 'Black',
    material: 'Leather',
    fit: 'Regular'
  },
  
  // Provenance map showing Smart Rule auto-fill
  provenance: {
    // Gender was set by Smart Rule
    'attributes_gender': {
      source: 'smartRule',
      ruleId: 'rule_gender_from_rics',
      ruleName: 'Gender from RICS Category',
      appliedAt: new Date().toISOString(),
      input: {
        ricsCategory: "Men's Athletic Footwear"
      },
      reason: "Matched RICS category pattern: 'Men's' prefix detected"
    },
    // Age group was set by Smart Rule
    'attributes_age_group': {
      source: 'smartRule',
      ruleId: 'rule_age_group_default',
      ruleName: 'Default Age Group',
      appliedAt: new Date().toISOString(),
      input: {
        department: 'Men'
      },
      reason: 'Adult age group applied for Men department'
    },
    // Primary color was set by human
    'attributes_primary_color': {
      source: 'human',
      appliedAt: new Date().toISOString(),
      actor: 'test-setup@example.com'
    }
  },
  
  // Activity log
  activityLog: [
    {
      actor: 'smart-engine@system',
      action: 'smartrule_auto_apply',
      timestamp: new Date().toISOString(),
      details: {
        fieldPath: 'attributes.gender',
        ruleId: 'rule_gender_from_rics',
        newValue: 'Men'
      }
    },
    {
      actor: 'smart-engine@system',
      action: 'smartrule_auto_apply',
      timestamp: new Date().toISOString(),
      details: {
        fieldPath: 'attributes.age_group',
        ruleId: 'rule_age_group_default',
        newValue: 'Adult'
      }
    }
  ],
  
  // Required fields
  descriptions: {
    'shiekh.com': {
      main: 'Test product for S5 staging verification',
      seoTitle: 'S5 Test Product',
      metaDescription: 'Testing Smart Rule provenance display'
    }
  },
  media: {
    heroImage: '',
    gallery: []
  },
  exportReadiness: {
    overall: 50,
    byWebsite: {}
  },
  observations: [],
  smartSuggestions: [],
  aiHistory: [],
  
  createdAt: admin.firestore.FieldValue.serverTimestamp(),
  updatedAt: admin.firestore.FieldValue.serverTimestamp()
};

async function setupTestProduct() {
  console.log('Setting up test product for S5 staging verification...');
  console.log('Product ID:', TEST_PRODUCT_ID);
  
  try {
    await db.collection('products').doc(TEST_PRODUCT_ID).set(testProduct);
    console.log('✅ Test product created successfully');
    
    // Verify
    const doc = await db.collection('products').doc(TEST_PRODUCT_ID).get();
    const data = doc.data();
    
    console.log('\n📋 Product created with provenance:');
    console.log('  - attributes.gender:', data.attributes?.gender, '(Smart Rule)');
    console.log('  - attributes.age_group:', data.attributes?.age_group, '(Smart Rule)');
    console.log('  - attributes.primary_color:', data.attributes?.primary_color, '(Human)');
    
    console.log('\n🔗 Test URL:');
    console.log(`  https://ropi-aoss-staging.web.app/products/${TEST_PRODUCT_ID}`);
    
    console.log('\n📄 Provenance structure:');
    console.log(JSON.stringify(data.provenance, null, 2));
    
    return data;
  } catch (error) {
    console.error('❌ Error creating test product:', error);
    throw error;
  }
}

async function getProduct(productId) {
  const doc = await db.collection('products').doc(productId).get();
  if (!doc.exists) {
    console.log('Product not found:', productId);
    return null;
  }
  return { id: doc.id, ...doc.data() };
}

// Run setup
const result = await setupTestProduct();
console.log('\n✅ Setup complete. Ready for staging verification.');
