// Dump canonical test rule from Firestore for verification
const admin = require('firebase-admin');

// Initialize Firebase Admin if not already done
if (admin.apps.length === 0) {
    admin.initializeApp({
        projectId: 'project-ropi-v2'
    });
}

const db = admin.firestore();

async function dumpTestRule() {
    console.log("🔍 Dumping canonical test rule from Firestore...");
    
    try {
        // Get the specific test rule
        const ruleId = "test-autoapply-sampling";
        const doc = await db.collection("settings/smartRules/rules").doc(ruleId).get();
        
        if (doc.exists) {
            const rule = doc.data();
            console.log("✅ Test rule found in Firestore");
            
            // Create the artifacts directory if it doesn't exist
            const fs = require('fs');
            const path = require('path');
            const artifactsDir = path.join(__dirname, 'artifacts');
            
            if (!fs.existsSync(artifactsDir)) {
                fs.mkdirSync(artifactsDir, { recursive: true });
            }
            
            // Save to artifacts file
            const filePath = path.join(artifactsDir, 'test_autoapply_rule_dump.json');
            fs.writeFileSync(filePath, JSON.stringify(rule, null, 2));
            
            console.log("📄 Rule saved to:", filePath);
            
            // Display key fields for verification
            console.log("\n🔍 Key Rule Structure:");
            console.log("- Name:", rule.name || "Not set");
            console.log("- Type:", rule.type || "Not set");
            console.log("- Enabled:", rule.enabled || false);
            console.log("- Auto Apply:", rule.autoApply || false);
            
            if (rule.conditions && Array.isArray(rule.conditions)) {
                console.log("- Conditions:", rule.conditions.length, "items");
                rule.conditions.forEach((condition, i) => {
                    console.log(`  [${i}] Field: ${condition.field}, Match: ${condition.matchType}, Value: ${condition.matchValue}`);
                });
            } else {
                console.log("- Conditions: Invalid format or missing");
            }
            
            if (rule.actions && Array.isArray(rule.actions)) {
                console.log("- Actions:", rule.actions.length, "items");
                rule.actions.forEach((action, i) => {
                    console.log(`  [${i}] Target: ${action.targetField}, Template: ${action.valueTemplate}, OnlyIfEmpty: ${action.onlyIfEmpty}`);
                });
            } else {
                console.log("- Actions: Invalid format or missing");
            }
            
            return rule;
        } else {
            console.log("❌ Test rule not found");
            return null;
        }
    } catch (error) {
        console.error("❌ Error dumping rule:", error.message);
        return null;
    }
}

dumpTestRule().then(rule => {
    if (rule) {
        console.log("\n✅ Rule dump complete - check artifacts/test_autoapply_rule_dump.json");
    }
    process.exit(0);
});