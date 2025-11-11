import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import importer from './routes/import';
import describe from './routes/describe';
import exporter from './routes/exporter';
import { seedSettingsVocabHandler } from './seedVocab';

admin.initializeApp();

const r = functions.region('us-central1');

export const apiImport = functions.https.onRequest(importer);
export const apiDescribe = functions.https.onRequest(describe);
export const apiExporter = functions.https.onRequest(exporter);
export const seedSettingsVocab = r.https.onRequest(seedSettingsVocabHandler);

/**
 * Cloud function to set user role (admin or specialist)
 * Only callable by theo@shiekhshoes.org
 */
export const setUserRole = r.https.onCall(async (data, context) => {
  const callerEmail = context.auth?.token?.email?.toLowerCase();
  
  if (!callerEmail) {
    throw new functions.https.HttpsError('unauthenticated', 'Sign in required');
  }
  
  if (callerEmail !== 'theo@shiekhshoes.org') {
    throw new functions.https.HttpsError('permission-denied', 'Only Theo can modify roles');
  }

  const { uid, role } = data as { uid: string; role: 'admin' | 'specialist' };
  
  if (!uid || !['admin', 'specialist'].includes(role)) {
    throw new functions.https.HttpsError('invalid-argument', 'Bad params');
  }

  await admin.auth().setCustomUserClaims(uid, { admin: role === 'admin' });
  await admin.firestore().doc(`users/${uid}`).set(
    { 
      role, 
      updatedAt: admin.firestore.FieldValue.serverTimestamp() 
    }, 
    { merge: true }
  );
  
  return { ok: true };
});

/**
 * Cloud function to preview export rules
 * Returns sample product data with applied filters and transforms
 */
export const exportRulesPreview = r.https.onCall(async (data, _ctx) => {
  const { schema, filters, transforms, limit = 5 } = data as {
    schema: string[];
    filters?: Record<string, any>;
    transforms?: Array<{ type: 'uppercase' | 'lowercase' | 'trim' | 'map'; field?: string; map?: Record<string, string> }>;
    limit?: number;
  };

  const snap = await admin.firestore().collection('products').limit(limit).get();
  let rows = snap.docs.map(d => d.data() as Record<string, any>);

  if (filters && Object.keys(filters).length) {
    rows = rows.filter(r => Object.entries(filters).every(([k, v]) => r[k] === v));
  }

  if (Array.isArray(transforms)) {
    for (const t of transforms) {
      if (!t?.field) continue;
      const field = t.field;
      rows = rows.map(r => {
        const val = (r[field] ?? '').toString();
        if (t.type === 'uppercase') return { ...r, [field]: val.toUpperCase() };
        if (t.type === 'lowercase') return { ...r, [field]: val.toLowerCase() };
        if (t.type === 'trim') return { ...r, [field]: val.trim() };
        if (t.type === 'map' && t.map) return { ...r, [field]: t.map[val] ?? val };
        return r;
      });
    }
  }

  const output = rows.map(r => schema.reduce((acc, f) => ({ ...acc, [f]: r[f] ?? '' }), {} as Record<string, any>));
  return { rows: output };
});