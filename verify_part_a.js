// Test UI Rule Fetch to verify Rule Editor loading
const https = require('https');

async function testUIRuleFetch() {
    console.log("🔍 Testing UI Rule Fetch endpoint...");
    
    try {
        // Test the getProductSuggestions endpoint that the Rule Editor uses
        const response = await fetch('https://us-central1-project-ropi-v2.cloudfunctions.net/api/getProductSuggestions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer fake-token-for-test'
            },
            body: JSON.stringify({
                ruleId: 'test-autoapply-sampling',
                product: {
                    id: '8-test',
                    attributes: {
                        rics_category: 'sampling test product',
                        gender: ''
                    }
                }
            })
        });
        
        const data = await response.json();
        
        console.log("📊 UI Fetch Response:");
        console.log("Status:", response.status);
        console.log("Data:", JSON.stringify(data, null, 2));
        
        // Save the response
        const fs = require('fs');
        const path = require('path');
        
        const responseData = {
            status: response.status,
            headers: Object.fromEntries(response.headers.entries()),
            data: data,
            timestamp: new Date().toISOString(),
            endpoint: 'getProductSuggestions',
            testRule: 'test-autoapply-sampling'
        };
        
        fs.writeFileSync(
            path.join(__dirname, 'artifacts', 'ui_rule_fetch_verification.json'),
            JSON.stringify(responseData, null, 2)
        );
        
        console.log("✅ Response saved to artifacts/ui_rule_fetch_verification.json");
        
        // Verify the response structure
        if (response.ok && data.suggestions) {
            console.log("✅ UI endpoint working correctly");
            console.log("Suggestions found:", data.suggestions.length);
            
            data.suggestions.forEach((suggestion, i) => {
                console.log(`  [${i}] ${suggestion.field} = ${suggestion.value} (confidence: ${suggestion.confidence})`);
            });
        } else {
            console.log("❌ UI endpoint issue:", data.error || 'No suggestions returned');
        }
        
        return responseData;
        
    } catch (error) {
        console.error("❌ Error testing UI fetch:", error.message);
        return null;
    }
}

// Also test a direct rule fetch if there's an endpoint for it
async function testDirectRuleFetch() {
    console.log("\n🔍 Testing direct rule fetch...");
    
    try {
        // This would be the endpoint the Rule Editor uses to load rule data
        // Let's check if we can construct the URL from the admin UI
        console.log("ℹ️  Note: Direct rule fetch would require Rule Editor endpoint");
        console.log("ℹ️  Typically: GET /api/smartRules/rule/{ruleId}");
        
        // For now, let's verify the rule structure from our existing data
        const fs = require('fs');
        const path = require('path');
        
        const ruleData = JSON.parse(fs.readFileSync(
            path.join(__dirname, 'artifacts', 'test_autoapply_rule_dump.json'),
            'utf8'
        ));
        
        console.log("📋 Verifying rule structure from Firestore dump:");
        console.log("- Has conditions array:", Array.isArray(ruleData.data?.conditions));
        console.log("- Has actions array:", Array.isArray(ruleData.data?.actions));
        console.log("- Target field present:", ruleData.data?.actions?.[0]?.targetField);
        console.log("- Value template present:", ruleData.data?.actions?.[0]?.valueTemplate);
        
        if (ruleData.data?.conditions?.[0] && ruleData.data?.actions?.[0]) {
            console.log("✅ Rule has proper conditions and actions structure");
            
            const condition = ruleData.data.conditions[0];
            const action = ruleData.data.actions[0];
            
            console.log("📋 Condition Details:");
            console.log(`  Field: ${condition.field}`);
            console.log(`  Operator: ${condition.operator}`);
            console.log(`  Value: ${condition.value}`);
            
            console.log("📋 Action Details:");
            console.log(`  Target Field: ${action.targetField}`);
            console.log(`  Value Template: ${action.valueTemplate}`);
            console.log(`  Only If Empty: ${action.onlyIfEmpty}`);
            
            return true;
        } else {
            console.log("❌ Rule missing required structure");
            return false;
        }
        
    } catch (error) {
        console.error("❌ Error testing direct rule fetch:", error.message);
        return false;
    }
}

async function runPartA() {
    console.log("🚀 Part A: Verify Canonical Rule Doc and UI Fetch");
    console.log("=" + "=".repeat(50));
    
    await testUIRuleFetch();
    await testDirectRuleFetch();
    
    console.log("\n✅ Part A verification complete");
    console.log("📄 Check artifacts/ for detailed responses");
}

runPartA().then(() => process.exit(0));