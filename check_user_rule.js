// Check for user's observation rule "Men 2 Gender"
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: "AIzaSyB3PcIf5oZBfSwYTrVYM7Z1YjEQZ9xg8lU",
    authDomain: "project-ropi-v2.firebaseapp.com",
    projectId: "project-ropi-v2",
    storageBucket: "project-ropi-v2.appspot.com",
    messagingSenderId: "1024234564567",
    appId: "1:1024234564567:web:abc123def456ghi789"
};

async function checkUserRule() {
    console.log("Checking user's observation rule...");
    
    try {
        const app = initializeApp(firebaseConfig);
        const db = getFirestore(app);
        
        // Check if the specific rule exists
        const ruleId = "rule_1767353025831_ap2zq7";
        const docRef = doc(db, "settings/smartRules/rules", ruleId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const rule = docSnap.data();
            console.log("✅ User's rule found:");
            console.log(JSON.stringify(rule, null, 2));
            
            // Check if it's the "Men 2 Gender" rule
            if (rule.name && rule.name.includes("Gender")) {
                console.log("✅ Confirmed this is the Gender-related rule");
            }
        } else {
            console.log("❌ User's rule not found");
            
            // Let's check all rules to see what's available
            const { collection, getDocs } = require('firebase/firestore');
            const rulesRef = collection(db, "settings/smartRules/rules");
            const snapshot = await getDocs(rulesRef);
            
            console.log("Available rules:");
            snapshot.forEach(doc => {
                const data = doc.data();
                console.log(`- ${doc.id}: ${data.name || 'No name'}`);
            });
        }
    } catch (error) {
        console.error("Error checking rule:", error);
    }
}

checkUserRule().then(() => process.exit(0));