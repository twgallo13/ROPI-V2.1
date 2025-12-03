/**
 * ROPI AOSS API
 * Firebase Cloud Functions
 * 
 * Per AOSS Section 6 — API Contracts
 */

import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
admin.initializeApp();

// Export API endpoints
export { importCSV } from './endpoints/import';
