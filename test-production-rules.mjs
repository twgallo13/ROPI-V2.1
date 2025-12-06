// Test Firestore rules against PRODUCTION (not emulator)
import { initializeApp } from 'firebase/app';
import { getFirestore, setDoc, doc, Timestamp } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

// Production Firebase config for ropi-bccee (from .env.production)
const firebaseConfig = {
  apiKey: "AIzaSyD1aYB4AfqU5n1YfSOtLX5nbEYbnlTfcZ8",
  authDomain: "ropi-bccee.firebaseapp.com",
  projectId: "ropi-bccee",
  storageBucket: "ropi-bccee.appspot.com",
  messagingSenderId: "892791174441",
  appId: "1:892791174441:web:2ea5843a253b167d12b338"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function testProductionRules() {
  console.log("Testing PRODUCTION Firestore rules for ropi-bccee...");
  console.log("Time:", new Date().toISOString());
  
  try {
    // Sign in with test user (password from trace)
    console.log("\n1. Signing in with test user...");
    const userCred = await signInWithEmailAndPassword(
      auth,
      "user@shiekh.com",
      "qB1IzKejtWSiCEynnpbm3ohN"
    );
    console.log(`   User UID: ${userCred.user.uid}`);
    console.log(`   Email verified: ${userCred.user.emailVerified}`);
    
    // Create test signup document
    console.log("\n2. Attempting to create launchSignup document...");
    const signupData = {
      launchId: "test_launch_prod_" + Date.now(),
      productId: "test_product_prod",
      userUid: userCred.user.uid,
      email: userCred.user.email,
      createdAt: Timestamp.now(),
      source: "aoss-web",
      status: "active"
    };
    
    console.log("   Payload:", JSON.stringify(signupData, (k, v) => v?.toDate ? v.toDate().toISOString() : v, 2));
    
    const signupId = `${signupData.launchId}_${userCred.user.uid}`;
    await setDoc(doc(db, 'launchSignups', signupId), signupData);
    
    console.log("\n✅ SUCCESS! Document created at launchSignups/" + signupId);
    console.log("   Rules are working correctly in production!");
    
    process.exit(0);
  } catch (error) {
    console.log("\n❌ FAILED:", error.message);
    console.log("   Error code:", error.code);
    if (error.message.includes("permission")) {
      console.log("\n   The rules are NOT allowing this write in production.");
      console.log("   This confirms the production rules may be cached or different.");
    }
    process.exit(1);
  }
}

testProductionRules().catch(console.error);
