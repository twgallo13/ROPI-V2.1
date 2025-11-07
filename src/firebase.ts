import { initializeApp, getApp, getApps, type FirebaseOptions } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Build config from Vite env with sensible defaults for project ropi-bccee
const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID ?? 'ropi-bccee';

// Ensure storageBucket ends with .appspot.com
const envBucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined;
const storageBucket = envBucket
  ? (envBucket.endsWith('.appspot.com') ? envBucket : `${envBucket}.appspot.com`)
  : `${projectId}.appspot.com`;

const firebaseConfig: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? 'demo-api-key',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? `${projectId}.firebaseapp.com`,
  projectId,
  storageBucket,
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? 'demo-app-id',
  // Optional but commonly present; safe fallbacks provided
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '0',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Initialize (idempotent across HMR)
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Modular exports
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, provider, db, storage };
