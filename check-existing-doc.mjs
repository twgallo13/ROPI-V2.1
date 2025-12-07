import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyD1aYB4AfqU5n1YfSOtLX5nbEYbnlTfcZ8",
  authDomain: "ropi-bccee.firebaseapp.com",
  projectId: "ropi-bccee",
  storageBucket: "ropi-bccee.appspot.com",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkDoc() {
  // Check the E2E test document
  const docId = "launch_2025_q1_ropi_runner_37d692a11c7a4d592cd66310cc02304825d9813ba4ee5924f6ff57e10058274d";
  const docRef = doc(db, 'launchSignups', docId);
  
  try {
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      console.log("Document EXISTS:", docSnap.data());
    } else {
      console.log("Document does NOT exist");
    }
  } catch (error) {
    console.log("Error reading document:", error.message);
  }
  
  process.exit(0);
}

checkDoc();
