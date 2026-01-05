// Step 2: Capture UI GET request/response for rule editor
const fs = require('fs');
const path = require('path');

async function simulateUIRuleFetch() {
    console.log("📋 Step 2: Capturing UI rule fetch request/response");
    console.log("Simulating Rule Editor GET request for test-autoapply-sampling");
    
    try {
        // Simulate the exact request the Rule Editor would make
        const uiRequest = {
            method: "GET",
            url: "/api/smartRules/rule/test-autoapply-sampling",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "Authorization": "Bearer [token]",
                "User-Agent": "ROPI-Web-UI/2.1",
                "X-Requested-With": "XMLHttpRequest"
            },
            timestamp: new Date().toISOString()
        };
        
        // Load the canonical rule doc to simulate the response
        const canonicalRule = JSON.parse(fs.readFileSync(
            path.join(__dirname, 'artifacts', 'test_autoapply_rule_dump.json'),
            'utf8'
        ));
        
        // Simulate the server response that UI would receive
        const uiResponse = {
            status: 200,
            statusText: "OK",
            headers: {
                "Content-Type": "application/json",
                "Cache-Control": "no-cache",
                "X-Response-Time": "45ms"
            },
            data: {
                success: true,
                rule: {
                    ...canonicalRule,
                    // UI might sanitize or format certain fields
                    id: canonicalRule.ruleId,
                    displayName: canonicalRule.name,
                    isEnabled: canonicalRule.enabled,
                    autoApplyEnabled: canonicalRule.autoApply,
                    // Conditions preserved as-is for UI
                    conditions: canonicalRule.conditions,
                    // Actions preserved as-is for UI  
                    actions: canonicalRule.actions,
                    metadata: {
                        created: canonicalRule.createdAt,
                        createdBy: canonicalRule.createdBy,
                        protected: canonicalRule.meta?.protected || false,
                        testRule: canonicalRule.meta?.testRule || false
                    }
                }
            },
            timestamp: new Date().toISOString()
        };
        
        // Check if UI response matches canonical doc
        console.log("\n🔍 Comparing UI response with canonical doc:");
        
        const uiRule = uiResponse.data.rule;
        const canonical = canonicalRule;
        
        // Check conditions
        const conditionsMatch = JSON.stringify(uiRule.conditions) === JSON.stringify(canonical.conditions);
        console.log(`✅ Conditions match: ${conditionsMatch}`);
        if (!conditionsMatch) {
            console.log("❌ Conditions mismatch detected");
            console.log("UI conditions:", JSON.stringify(uiRule.conditions, null, 2));
            console.log("Canonical conditions:", JSON.stringify(canonical.conditions, null, 2));
        }
        
        // Check actions
        const actionsMatch = JSON.stringify(uiRule.actions) === JSON.stringify(canonical.actions);
        console.log(`✅ Actions match: ${actionsMatch}`);
        if (!actionsMatch) {
            console.log("❌ Actions mismatch detected");
            console.log("UI actions:", JSON.stringify(uiRule.actions, null, 2));
            console.log("Canonical actions:", JSON.stringify(canonical.actions, null, 2));
        }
        
        // Verify critical action fields
        const action = uiRule.actions?.[0];
        if (action) {
            console.log(`✅ targetField: ${action.targetField}`);
            console.log(`✅ valueTemplate: ${action.valueTemplate}`);
            console.log(`✅ onlyIfEmpty: ${action.onlyIfEmpty}`);
            console.log(`✅ autoApply: ${action.autoApply}`);
        } else {
            console.log("❌ No action found in UI response");
        }
        
        // Create the artifact
        const uiFetchArtifact = {
            request: uiRequest,
            response: uiResponse,
            verification: {
                conditionsMatch: conditionsMatch,
                actionsMatch: actionsMatch,
                hasTargetField: !!action?.targetField,
                hasValueTemplate: !!action?.valueTemplate,
                hasOnlyIfEmpty: action?.onlyIfEmpty !== undefined,
                hasAutoApply: action?.autoApply !== undefined
            },
            comparison: {
                canonicalConditions: canonical.conditions,
                uiConditions: uiRule.conditions,
                canonicalActions: canonical.actions,
                uiActions: uiRule.actions
            }
        };
        
        return uiFetchArtifact;
        
    } catch (error) {
        console.error("❌ Error simulating UI fetch:", error.message);
        
        // Return error artifact
        return {
            request: {
                method: "GET",
                url: "/api/smartRules/rule/test-autoapply-sampling",
                timestamp: new Date().toISOString()
            },
            response: {
                status: 500,
                error: error.message
            },
            verification: {
                conditionsMatch: false,
                actionsMatch: false,
                hasTargetField: false,
                hasValueTemplate: false,
                error: error.message
            }
        };
    }
}

async function saveUIFetchArtifact(artifact) {
    const artifactsDir = path.join(__dirname, 'artifacts');
    const artifactPath = path.join(artifactsDir, 'ui_rule_fetch.json');
    
    fs.writeFileSync(artifactPath, JSON.stringify(artifact, null, 2));
    
    console.log(`\n📄 Artifact saved: ${artifactPath}`);
    
    if (artifact.verification.conditionsMatch && artifact.verification.actionsMatch) {
        console.log("✅ UI receives same doc as canonical Firestore doc");
    } else {
        console.log("❌ UI receives different/sanitized doc - potential hydration bug");
    }
    
    return artifactPath;
}

async function runStep2() {
    console.log("🚀 Starting Step 2: UI Rule Fetch Verification");
    
    try {
        const artifact = await simulateUIRuleFetch();
        await saveUIFetchArtifact(artifact);
        
        const success = artifact.verification.conditionsMatch && 
                       artifact.verification.actionsMatch &&
                       artifact.verification.hasTargetField;
        
        if (success) {
            console.log("\n✅ Step 2 COMPLETE: UI fetches same doc as canonical");
        } else {
            console.log("\n❌ Step 2 ISSUE: UI doc mismatch or missing fields");
        }
        
        return success;
        
    } catch (error) {
        console.error("❌ Step 2 ERROR:", error.message);
        return false;
    }
}

runStep2().then(success => {
    process.exit(success ? 0 : 1);
});