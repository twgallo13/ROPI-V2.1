const fs = require('fs');
const path = require('path');

// Read the CSV file
const csvPath = path.join(__dirname, 'shipping-test-import.csv');
const csvContent = fs.readFileSync(csvPath, 'utf-8');

const admin = require('firebase-admin');
admin.initializeApp();

console.log('\n📦 Starting import of shipping test products...\n');

// We'll use a different approach - write to Firestore directly to simulate the import
// Then call processImportBatch

async function runTest() {
  const db = admin.firestore();
  
  try {
    // Parse CSV manually
    const lines = csvContent.trim().split('\n');
    const headers = lines[0].split(',');
    
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      const row = {};
      headers.forEach((header, idx) => {
        row[header.trim()] = values[idx]?.trim() || '';
      });
      rows.push(row);
    }
    
    // Create import batch
    const batchData = {
      fileName: 'shipping-test-import.csv',
      status: 'pending',
      rowCount: rows.length,
      createdAt: new Date().toISOString(),
      createdBy: 'test-admin',
      processedAt: null,
      processedBy: null,
      createdCount: 0,
      updatedCount: 0,
      blockedCount: 0,
      errorCount: 0,
      warningCount: 0,
    };
    
    const batchRef = await db.collection('import_batches').add(batchData);
    const batchId = batchRef.id;
    
    console.log(`✅ Created batch: ${batchId}`);
    console.log(`📊 ${rows.length} rows ready for processing\n`);
    
    // Add rows
    for (let i = 0; i < rows.length; i++) {
      await batchRef.collection('rows').add({
        ...rows[i],
        batchId,
        rowId: `row-${i}`,
        meta: {
          rowId: `row-${i}`,
          importedAt: new Date().toISOString(),
          batchId,
          status: 'pending',
          productId: rows[i].mpn,
        }
      });
    }
    
    console.log('📋 Rows added to batch');
    console.log(`\n🚀 Batch ID for testing: ${batchId}`);
    console.log('\nNow triggering processImportBatch...\n');
    
    // Call processImportBatch
    const callable = admin.functions().httpsCallable('processImportBatch');
    const result = await callable({
      batchId: batchId,
      processSmartRules: true
    });
    
    console.log('✅ Import processed!');
    console.log('Result:', JSON.stringify(result.data, null, 2));
    
    return batchId;
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

runTest().then(() => process.exit(0)).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
