import { initializeApp, getApp, getApps, type FirebaseOptions } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
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

// Production guard: warn if running prod build with demo credentials
if (import.meta.env.PROD && (!firebaseConfig.apiKey || firebaseConfig.apiKey === 'demo-api-key')) {
  console.error('[ROPI] Missing/invalid VITE_FIREBASE_API_KEY at build time.');
}

// Initialize (idempotent across HMR)
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Modular exports
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  useFetchStreams: false,
} as any);
const storage = getStorage(app);

// Expose debug handle for DevTools inspection
if (typeof window !== 'undefined') {
  (window as any).__ROPI = {
    app,
    auth,
    db,
    options: (app as any).options,
  };
}

export { app, auth, provider, db, storage };
