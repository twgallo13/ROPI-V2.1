#!/usr/bin/env node

/**
 * Test Rule Server Validation
 * Step 2.2: Server validate rule upserts
 * Tests POST /admin/rules with invalid payloads
 */

const API_BASE = process.env.ROPI_API_BASE || 'https://us-central1-ropi-bccee.cloudfunctions.net/api';
const SA_KEY_B64 = process.env.GCP_SA_KEY_BASE64;

if (!SA_KEY_B64) {
  console.error('❌ Error: GCP_SA_KEY_BASE64 environment variable not set');
  process.exit(1);
}

async function getAccessToken() {
  try {
    const { GoogleAuth } = await import('google-auth-library');
    const keyData = JSON.parse(Buffer.from(SA_KEY_B64, 'base64').toString('utf-8'));
    const auth = new GoogleAuth({
      credentials: keyData,
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });
    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();
    return accessToken.token;
  } catch (err) {
    console.error('❌ Error getting access token:', err.message);
    process.exit(1);
  }
}

async function testRuleValidation() {
  const token = await getAccessToken();
  console.log('🧪 Testing Rule Server Validation (Step 2.2)');
  console.log('='.repeat(50));
  
  const testCases = [
    {
      name: 'Missing targetField',
      payload: {
        title: 'Test Rule Missing targetField',
        condition: { type: 'always' },
        actions: [{
          valueTemplate: 'Men\'s Clothing',
          setOnlyIfEmpty: true
          // targetField missing
        }]
      },
      expectedError: 'RULE_INVALID_ACTION',
      expectedMessage: 'Action missing targetField'
    },
    {
      name: 'Missing valueTemplate',
      payload: {
        title: 'Test Rule Missing valueTemplate',
        condition: { type: 'always' },
        actions: [{
          targetField: 'attributes.gender',
          setOnlyIfEmpty: true
          // valueTemplate missing
        }]
      },
      expectedError: 'RULE_INVALID_ACTION',
      expectedMessage: 'Action missing valueTemplate'
    },
    {
      name: 'Invalid onlyIfEmpty type (string)',
      payload: {
        title: 'Test Rule Invalid onlyIfEmpty',
        condition: { type: 'always' },
        actions: [{
          targetField: 'attributes.gender',
          valueTemplate: 'Men\'s Clothing',
          setOnlyIfEmpty: 'true' // String instead of boolean
        }]
      },
      expectedError: 'RULE_INVALID_ACTION',
      expectedMessage: 'onlyIfEmpty must be boolean'
    },
    {
      name: 'Valid rule with onlyIfEmpty=true',
      payload: {
        title: 'Valid Test Rule',
        condition: { type: 'always' },
        actions: [{
          targetField: 'attributes.gender',
          valueTemplate: 'Men\'s Clothing',
          setOnlyIfEmpty: true
        }]
      },
      expectedStatus: 201,
      expectedSuccess: true
    }
  ];

  let results = [];
  
  for (const testCase of testCases) {
    try {
      console.log(`\n📝 Testing: ${testCase.name}`);
      
      const response = await fetch(`${API_BASE}/admin/rules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(testCase.payload)
      });
      
      const result = await response.json();
      console.log(`   Status: ${response.status}`);
      
      if (testCase.expectedStatus === 201) {
        // Expected success
        if (response.status === 201) {
          console.log(`   ✅ PASS: Rule created successfully`);
          console.log(`   Rule ID: ${result.ruleId}`);
          results.push({
            test: testCase.name,
            status: 'PASS',
            response: { status: response.status, body: result }
          });
        } else {
          console.log(`   ❌ FAIL: Expected 201, got ${response.status}`);
          console.log(`   Error: ${JSON.stringify(result, null, 2)}`);
          results.push({
            test: testCase.name,
            status: 'FAIL',
            expected: { status: 201 },
            actual: { status: response.status, body: result }
          });
        }
      } else {
        // Expected error
        if (response.status === 400) {
          if (result.error === testCase.expectedError && 
              result.message?.includes(testCase.expectedMessage)) {
            console.log(`   ✅ PASS: Correct validation error returned`);
            console.log(`   Error: ${result.error}`);
            console.log(`   Message: ${result.message}`);
            results.push({
              test: testCase.name,
              status: 'PASS',
              response: { status: response.status, body: result }
            });
          } else {
            console.log(`   ❌ FAIL: Wrong error message`);
            console.log(`   Expected: ${testCase.expectedError} containing "${testCase.expectedMessage}"`);
            console.log(`   Got: ${result.error} - ${result.message}`);
            results.push({
              test: testCase.name,
              status: 'FAIL',
              expected: { error: testCase.expectedError, message: testCase.expectedMessage },
              actual: { status: response.status, body: result }
            });
          }
        } else {
          console.log(`   ❌ FAIL: Expected 400, got ${response.status}`);
          console.log(`   Response: ${JSON.stringify(result, null, 2)}`);
          results.push({
            test: testCase.name,
            status: 'FAIL',
            expected: { status: 400, error: testCase.expectedError },
            actual: { status: response.status, body: result }
          });
        }
      }
      
    } catch (err) {
      console.log(`   ❌ ERROR: ${err.message}`);
      results.push({
        test: testCase.name,
        status: 'ERROR',
        error: err.message
      });
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 SUMMARY');
  console.log('='.repeat(50));
  
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status !== 'PASS').length;
  
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📋 Total: ${results.length}`);
  
  // Save detailed results
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputFile = `artifacts/rule_upsert_validation_test_${timestamp}.json`;
  
  const reportData = {
    timestamp: new Date().toISOString(),
    step: '2.2',
    description: 'Server validate rule upserts',
    apiBase: API_BASE,
    summary: {
      total: results.length,
      passed: passed,
      failed: failed,
      successRate: `${Math.round((passed / results.length) * 100)}%`
    },
    testResults: results
  };
  
  require('fs').writeFileSync(outputFile, JSON.stringify(reportData, null, 2));
  console.log(`\n💾 Detailed results saved to: ${outputFile}`);
  
  if (failed > 0) {
    console.log(`\n❌ Step 2.2 FAILED: ${failed} tests failed`);
    process.exit(1);
  } else {
    console.log(`\n✅ Step 2.2 PASSED: All server validation tests pass`);
  }
}

testRuleValidation().catch(err => {
  console.error('❌ Test script error:', err);
  process.exit(1);
});