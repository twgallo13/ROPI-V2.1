const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

async function createShippingRules() {
  const rulesCollection = db.collection('settings/smartRules/rules');
  
  const baseRule = {
    name: '',
    description: 'Footwear Mens shipping dimensions',
    enabled: true,
    priority: 900,
    condition: {
      source: 'rics_category',
      matchType: 'contains',
      value: 'Footwear',
      options: []
    },
    // Will add second condition via conditions array
    conditions: [
      {
        source: 'rics_category',
        matchType: 'contains',
        value: 'Footwear',
        options: []
      },
      {
        source: 'rics_category',
        matchType: 'contains',
        value: 'Mens',
        options: []
      }
    ],
    action: {},
    autoApply: true,
    autoApplyConfidence: 0.95,
    tags: ['shipping', 'footwear-mens'],
    createdBy: 'homer-admin',
    createdAt: new Date().toISOString(),
    updatedBy: 'homer-admin',
    updatedAt: new Date().toISOString(),
  };

  const rules = [
    {
      ...baseRule,
      name: 'Footwear Mens - Set Weight 5oz',
      action: {
        targetField: 'weight',
        valueTemplate: '5',
        setOnlyIfEmpty: true
      }
    },
    {
      ...baseRule,
      name: 'Footwear Mens - Set Length 14',
      action: {
        targetField: 'length',
        valueTemplate: '14',
        setOnlyIfEmpty: true
      }
    },
    {
      ...baseRule,
      name: 'Footwear Mens - Set Width 12',
      action: {
        targetField: 'width',
        valueTemplate: '12',
        setOnlyIfEmpty: true
      }
    },
    {
      ...baseRule,
      name: 'Footwear Mens - Set Height 6',
      action: {
        targetField: 'height',
        valueTemplate: '6',
        setOnlyIfEmpty: true
      }
    },
  ];

  console.log('\n📋 Creating 4 Smart Rules for Footwear Mens shipping:\n');

  for (const rule of rules) {
    const docRef = await rulesCollection.add(rule);
    console.log(`✅ Created: ${rule.name}`);
    console.log(`   Rule ID: ${docRef.id}`);
    console.log(`   Action: ${rule.action.targetField} = ${rule.action.valueTemplate}`);
    console.log('');
  }

  console.log('✅ All 4 rules created successfully!\n');
}

createShippingRules().then(() => process.exit(0)).catch(console.error);
