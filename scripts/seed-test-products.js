#!/usr/bin/env node

/**
 * Seed Test Products for E2E Tests
 * 
 * Creates test product fixtures in Firestore for E2E testing.
 * 
 * Usage:
 *   node scripts/seed-test-products.js                    # Staging, shiekh.com only
 *   node scripts/seed-test-products.js --env=staging      # Explicit staging
 *   node scripts/seed-test-products.js --dry-run          # Preview without writing
 *   node scripts/seed-test-products.js --yes              # Skip confirmation prompt
 * 
 * Environment Variables:
 *   GOOGLE_APPLICATION_CREDENTIALS - Path to service account JSON
 *   GCP_SA_KEY_BASE64              - Base64-encoded service account JSON
 *   SEED_INCLUDE_TEST_SITES        - 'true' to include shiekhshoes.com in all products
 * 
 * Behavior when SEED_INCLUDE_TEST_SITES=true:
 *   - ALL seeded products will have websites: ['shiekh.com', 'shiekhshoes.com']
 *   - Descriptions will be generated for BOTH websites
 *   - This ensures exportReadiness and downstream logic have deterministic values
 * 
 * LP-0.1.2: Consistent test-site gating with descriptions coverage
 * Lisa v1.0.1
 */

const admin = require('firebase-admin');
const fs = require('fs');
const readline = require('readline');

// Parse command line args
const args = process.argv.slice(2);
const envArg = args.find(a => a.startsWith('--env='));
const env = envArg ? envArg.split('=')[1] : 'staging';
const isDryRun = args.includes('--dry-run');
const skipConfirm = args.includes('--yes');

console.log(`🌱 Seeding test products for environment: ${env}`);
console.log(`📍 SEED_INCLUDE_TEST_SITES: ${process.env.SEED_INCLUDE_TEST_SITES || 'false (default)'}`);
console.log(`📍 Dry-run mode: ${isDryRun ? 'YES (no writes)' : 'NO (will write to Firestore)'}`);
console.log();

// Initialize Firebase Admin
if (!admin.apps.length) {
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const credBase64 = process.env.GCP_SA_KEY_BASE64;
  
  if (credPath && fs.existsSync(credPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(credPath, 'utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log(`✅ Initialized with credentials from ${credPath}`);
  } else if (credBase64) {
    const serviceAccount = JSON.parse(Buffer.from(credBase64, 'base64').toString('utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log('✅ Initialized with GCP_SA_KEY_BASE64');
  } else {
    console.error('❌ No credentials found. Set GOOGLE_APPLICATION_CREDENTIALS or GCP_SA_KEY_BASE64');
    process.exit(1);
  }
}

const db = isDryRun ? null : admin.firestore();

// LP-0.1.2: Gate shiekhshoes.com behind environment variable
// When true, ALL products get both websites and descriptions for consistency
const includeTestSites = process.env.SEED_INCLUDE_TEST_SITES === 'true';
const baseWebsites = ['shiekh.com'];
const testWebsites = includeTestSites ? ['shiekh.com', 'shiekhshoes.com'] : baseWebsites;

/**
 * LP-0.1.2: Generate descriptions for all included websites
 * Ensures exportReadiness and downstream logic have deterministic values
 */
function generateDescriptions(baseDescription) {
  const descriptions = {
    'shiekh.com': baseDescription,
  };
  
  if (includeTestSites) {
    descriptions['shiekhshoes.com'] = {
      main: `[ShiekhShoes] ${baseDescription.main}`,
      short: `[SS] ${baseDescription.short}`,
    };
  }
  
  return descriptions;
}

// Test products with canonical attribute structure
const testProducts = [
  {
    id: 'test-product-001',
    name: 'Test Running Shoe',
    sku: 'TEST-RUN-001',
    brand: 'TestBrand',
    category: 'Athletic',
    department: 'Footwear',
    status: 'active',
    isActive: true,
    websites: testWebsites, // LP-0.1.2: gated by SEED_INCLUDE_TEST_SITES
    media: {
      heroImage: 'https://via.placeholder.com/400x400?text=Test+Product+001',
      gallery: ['https://via.placeholder.com/400x400?text=Gallery+1'],
    },
    descriptions: generateDescriptions({
      main: 'This is a test running shoe for E2E testing. It has great cushioning and support.',
      short: 'Test running shoe',
    }),
    attributes: {
      gender: 'Men',
      ageGroup: 'Adult',
      primaryColor: 'Black',
      secondaryColor: 'White',
      material: 'Mesh',
      style: 'Athletic',
      category: 'Athletic',
      waterproof: false,
      sustainable: true,
    },
    price: {
      retail: 129.99,
      sale: 99.99,
    },
    observations: [],
    smartSuggestions: [],
    exportReadiness: {
      overall: 80,
      byWebsite: {},
    },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  },
  {
    id: 'test-product-002',
    name: 'Test Casual Sneaker',
    sku: 'TEST-SNK-002',
    brand: 'TestBrand',
    category: 'Casual',
    department: 'Footwear',
    status: 'active',
    isActive: true,
    websites: testWebsites, // LP-0.1.2: consistent gating for ALL products
    media: {
      heroImage: 'https://via.placeholder.com/400x400?text=Test+Product+002',
      gallery: [],
    },
    descriptions: generateDescriptions({
      main: 'A comfortable casual sneaker for everyday wear. Perfect for testing.',
      short: 'Test casual sneaker',
    }),
    attributes: {
      gender: 'Women',
      ageGroup: 'Adult',
      primaryColor: 'White',
      material: 'Leather',
      style: 'Casual',
      category: 'Casual',
      waterproof: false,
    },
    price: {
      retail: 89.99,
    },
    observations: [],
    smartSuggestions: [],
    exportReadiness: {
      overall: 70,
      byWebsite: {},
    },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  },
  {
    id: 'test-product-003',
    name: 'Test Boot',
    sku: 'TEST-BOOT-003',
    brand: 'TestBrand',
    category: 'Boots',
    department: 'Footwear',
    status: 'active',
    isActive: true,
    websites: testWebsites, // LP-0.1.2: gated by SEED_INCLUDE_TEST_SITES
    media: {
      heroImage: 'https://via.placeholder.com/400x400?text=Test+Product+003',
      gallery: ['https://via.placeholder.com/400x400?text=Boot+Gallery+1'],
    },
    descriptions: generateDescriptions({
      main: 'A sturdy test boot for winter weather. Waterproof and durable.',
      short: 'Test winter boot',
    }),
    attributes: {
      gender: 'Unisex',
      ageGroup: 'Adult',
      primaryColor: 'Brown',
      material: 'Leather',
      style: 'Boots',
      category: 'Boots',
      waterproof: true,
      sustainable: false,
      heel_height: '2 inches',
      heel_type: 'Block',
    },
    price: {
      retail: 159.99,
      sale: 129.99,
    },
    observations: [
      {
        id: 'obs-test-001',
        title: 'Test Observation',
        description: 'This is a test observation for E2E testing',
        severity: 'low',
        status: 'open',
        timestamp: new Date().toISOString(),
      },
    ],
    smartSuggestions: [
      {
        id: 'sug-test-001',
        type: 'description',
        targetField: 'descriptions.shiekh.com.main',
        currentValue: 'A sturdy test boot for winter weather. Waterproof and durable.',
        proposedValue: 'Stay warm and dry with this premium waterproof leather boot, perfect for winter weather.',
        confidence: 0.85,
        status: 'pending',
      },
    ],
    exportReadiness: {
      overall: 90,
      byWebsite: {},
    },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  },
];

/**
 * Prompt user for confirmation (unless --yes flag or dry-run)
 */
async function confirmSeed() {
  if (skipConfirm || isDryRun) return true;
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  return new Promise((resolve) => {
    rl.question('Are you sure you want to seed these products? (y/N): ', (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

async function seedTestProducts() {
  // Display what will be seeded
  console.log('─────────────────────────────────────');
  console.log('📋 SEED PREVIEW:');
  console.log(`   Websites to seed: ${testWebsites.join(', ')}`);
  console.log(`   Products to seed: ${testProducts.length}`);
  console.log('');
  
  for (const product of testProducts) {
    console.log(`   📦 ${product.id} (${product.name})`);
    console.log(`      websites: [${product.websites.join(', ')}]`);
    console.log(`      descriptions: [${Object.keys(product.descriptions).join(', ')}]`);
  }
  console.log('─────────────────────────────────────\n');
  
  if (isDryRun) {
    console.log('🔍 DRY-RUN MODE: No data was written to Firestore.');
    console.log('   Run without --dry-run to actually seed the products.\n');
    return;
  }
  
  // Confirm before writing
  const confirmed = await confirmSeed();
  if (!confirmed) {
    console.log('❌ Seeding cancelled by user.');
    process.exit(0);
  }

  console.log(`\n📦 Creating ${testProducts.length} test products...\n`);

  for (const product of testProducts) {
    try {
      const docRef = db.collection('products').doc(product.id);
      await docRef.set(product, { merge: true });
      console.log(`  ✓ Created: ${product.id} (${product.name})`);
    } catch (error) {
      console.error(`  ✗ Failed: ${product.id}:`, error.message);
    }
  }

  console.log('\n─────────────────────────────────────');
  console.log('📊 Seeding Complete:');
  console.log(`   Created: ${testProducts.length} test products`);
  console.log('─────────────────────────────────────\n');

  console.log('Test product IDs for E2E tests:');
  testProducts.forEach(p => console.log(`  - ${p.id}`));
}

seedTestProducts()
  .then(() => {
    console.log('\n✅ Seeding completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  });
