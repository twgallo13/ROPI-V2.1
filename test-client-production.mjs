/**
 * Test Firebase Client SDK against production Firestore
 * This mimics what the web app does
 */
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, addDoc, Timestamp, doc, deleteDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDpqQlVNQwm2xTK-Bq6eNYB7bGVxc9j6Hk",
  authDomain: "ropi-bccee.firebaseapp.com",
  projectId: "ropi-bccee",
  storageBucket: "ropi-bccee.firebasestorage.app",
  messagingSenderId: "892791174441",
  appId: "1:892791174441:web:5c3e1e0e4f6c7a8b9c0d1e"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function test() {
  try {
    // Sign in with test user credentials
    console.log('Signing in as test user...');
    const cred = await signInWithEmailAndPassword(auth, 'user@shiekh.com', 'testPassword123');
    console.log(`✅ Signed in as ${cred.user.email}, UID: ${cred.user.uid}`);
    
    // Force token refresh
    console.log('Force refreshing token...');
    await cred.user.getIdToken(true);
    console.log('✅ Token refreshed');
    
    // Create the exact payload
    const payload = {
      launchId: 'test_client_sdk_launch',
      productId: 'test_product',
      userUid: cred.user.uid,
      createdAt: Timestamp.now(),
      source: 'aoss-web',
      status: 'active',
    };
    
    console.log('\nAttempting to write to launchSignups...');
    console.log('Payload:', JSON.stringify(payload, null, 2));
    
    const docRef = await addDoc(collection(db, 'launchSignups'), payload);
    console.log(`\n✅ SUCCESS! Document written with ID: ${docRef.id}`);
    
    // Clean up
    await deleteDoc(doc(db, 'launchSignups', docRef.id));
    console.log('Cleaned up test document');
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.code, '-', error.message);
    
    if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
      console.log('\n⚠️ Need valid test user credentials to test production');
    }
  }
  
  process.exit(0);
}

test();
