const admin = require('firebase-admin');

// Initialize Firebase Admin using Application Default Credentials
admin.initializeApp();
const db = admin.firestore();

async function updateMaterialsFitSegment() {
  try {
    console.log('Fetching current completion rules...');
    const docRef = db.collection('settings').doc('exportSettings');
    const doc = await docRef.get();
    
    if (!doc.exists) {
      console.log('❌ No exportSettings document found');
      process.exit(1);
    }
    
    const data = doc.data();
    console.log('\nDocument data keys:', Object.keys(data));
    console.log('\ncompletionRules type:', typeof data.completionRules);
    console.log('\ncompletionRules value:', JSON.stringify(data.completionRules, null, 2));
    
    let rules = data.completionRules;
    
    // Handle if it's an object instead of array
    if (rules && typeof rules === 'object' && !Array.isArray(rules)) {
      console.log('\n⚠️  completionRules is an object, converting to array...');
      rules = Object.values(rules);
    } else if (!rules) {
      rules = [];
    }
    
    console.log(`\nFound ${rules.length} segments`);
    
    // Find the materials-fit segment (Technical segment)
    const technicalSegmentIdx = rules.findIndex(r => 
      r.segmentId === 'materials-fit' || 
      r.name?.toLowerCase().includes('technical') ||
      r.name?.toLowerCase().includes('material')
    );
    
    if (technicalSegmentIdx === -1) {
      console.log('❌ Could not find materials-fit/Technical segment');
      console.log('\nAvailable segments:');
      rules.forEach((r, idx) => {
        console.log(`  ${idx}: ${r.segmentId || 'no-id'} - ${r.name || 'no-name'}`);
        if (r.attributeSelector?.staticAttributeIds) {
          console.log(`     Static IDs: ${r.attributeSelector.staticAttributeIds.join(', ')}`);
        }
      });
      process.exit(1);
    }
    
    const segment = rules[technicalSegmentIdx];
    console.log(`\n✅ Found segment at index ${technicalSegmentIdx}:`);
    console.log(`   Name: ${segment.name}`);
    console.log(`   Segment ID: ${segment.segmentId}`);
    console.log(`   Current config:`, JSON.stringify(segment.attributeSelector, null, 2));
    
    // Update to use REGISTRY with Technical category
    const updatedSelector = {
      source: 'REGISTRY',
      categories: ['Technical'],
      requirementFlag: 'required_for_completion',
      siteAware: false,
      includeInternalOnly: false
    };
    
    rules[technicalSegmentIdx].attributeSelector = updatedSelector;
    
    console.log(`\n🔄 Updating segment configuration to use REGISTRY...`);
    console.log(`   New config:`, JSON.stringify(updatedSelector, null, 2));
    
    await docRef.update({
      completionRules: rules,
      lastModified: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log('\n✅ Successfully updated materials-fit segment!');
    console.log('\nThe segment will now dynamically include all attributes with:');
    console.log('  - Category: "Technical"');
    console.log('  - required_for_completion: true');
    console.log('\nThis includes: height, length, width, weight, and fit');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
  
  process.exit(0);
}

updateMaterialsFitSegment();
