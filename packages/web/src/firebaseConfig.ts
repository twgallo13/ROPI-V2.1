/**
 * Firebase Configuration for ROPI AOSS
 * 
 * Configuration for Firebase client SDK (Firestore, Storage, Auth).
 * Uses environment variables for sensitive config values.
 * 
 * Related Notion docs:
 * - Section 9 — Security & IAM: https://www.notion.so/2b845ee1ec5a81739de7fc1743de9a33
 * - Product Completion Workflows (W1): https://www.notion.so/2b845ee1ec5a81b5a4a6d3ea439ec277
 */

import { initializeApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getAuth, Auth } from 'firebase/auth';

// Firebase configuration
// In production, these should come from environment variables
// For now, we use the known project ID from .firebaserc
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyDummy_ReplaceInProduction',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'ropi-bccee.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'ropi-bccee',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'ropi-bccee.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

// Initialize Firebase
let app: FirebaseApp;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;
let auth: Auth | null = null;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  storage = getStorage(app);
  auth = getAuth(app);
  console.log('✅ Firebase initialized successfully');
} catch (error) {
  console.error('❌ Firebase initialization failed:', error);
  console.warn('⚠️ Running in offline mode - using localStorage fallback');
}

export { app, db, storage, auth };

/**
 * Check if Firebase services are available
 */
export const isFirebaseAvailable = (): boolean => {
  return db !== null;
};

export const isStorageAvailable = (): boolean => {
  return storage !== null;
};

export const isAuthAvailable = (): boolean => {
  return auth !== null;
};
