// Check for user's observation rule using Firebase Admin SDK
const admin = require('firebase-admin');

// Initialize Firebase Admin
if (admin.apps.length === 0) {
    admin.initializeApp({
        projectId: 'project-ropi-v2'
    });
}

const db = admin.firestore();

async function checkUserRule() {
    console.log("Checking user's observation rule...");
    
    try {
        // Check if the specific rule exists
        const ruleId = "rule_1767353025831_ap2zq7";
        const doc = await db.collection("settings/smartRules/rules").doc(ruleId).get();
        
        if (doc.exists) {
            const rule = doc.data();
            console.log("✅ User's rule found:");
            console.log(JSON.stringify(rule, null, 2));
            
            // Check if it's the "Men 2 Gender" rule
            if (rule.name && rule.name.includes("Gender")) {
                console.log("✅ Confirmed this is the Gender-related rule");
            }
            
            return true;
        } else {
            console.log("❌ User's rule not found with ID:", ruleId);
            
            // Let's check all rules to see what's available
            const snapshot = await db.collection("settings/smartRules/rules").get();
            
            console.log("\n📋 Available rules:");
            snapshot.forEach(doc => {
                const data = doc.data();
                console.log(`- ${doc.id}: ${data.name || 'No name'} (type: ${data.type || 'Unknown'})`);
            });
            
            return false;
        }
    } catch (error) {
        console.error("Error checking rule:", error);
        return false;
    }
}

checkUserRule().then(found => {
    console.log(`\n${found ? '✅' : '❌'} User rule check complete`);
    process.exit(0);
});