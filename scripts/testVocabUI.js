// Quick UI test script - paste this into browser DevTools Console at http://localhost:3000/settings/vocab-managed

// Test the three new shoe vocabs
const testVocabs = async () => {
  console.log('=== ROPI Vocab UI Test ===');
  
  // Check if useAttributesSettings hook data is populated
  const checkVocab = (vocabKey, expectedMin) => {
    // Access the hook data from the React component (if exposed via window.__ROPI)
    const items = window.__ROPI?.vocabData?.[vocabKey] || [];
    const pass = items.length >= expectedMin;
    console.log(`${vocabKey}: ${items.length} items (expected >= ${expectedMin}) - ${pass ? 'PASS' : 'FAIL'}`);
    if (items.length > 0) {
      console.log(`  Sample: ${items.slice(0, 3).join(', ')}`);
    }
    return pass;
  };
  
  const results = {
    heelTypes: checkVocab('heelTypes', 7),
    shoeHeightMaps: checkVocab('shoeHeightMaps', 3),
    soleMaterials: checkVocab('soleMaterials', 8),
  };
  
  console.log('\n=== Summary ===');
  console.log(results);
  
  return results;
};

// Run test
testVocabs();

// Instructions for manual CRUD test:
console.log('\n=== Manual CRUD Test Steps ===');
console.log('1. Scroll to "Shoe Attributes" section');
console.log('2. Find "Heel Types" card');
console.log('3. Add temporary item: type "TEMP_TEST_' + Date.now() + '" and click Add');
console.log('4. Edit that item: click edit icon, change to "TEMP_EDITED", save');
console.log('5. Delete that item: click × icon, confirm');
console.log('6. Repeat for "Shoe Height Maps" and "Sole Materials"');
console.log('7. Check console for any errors during CRUD operations');
