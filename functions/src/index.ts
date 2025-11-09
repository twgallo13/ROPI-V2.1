import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import importer from './routes/import';
import describe from './routes/describe';
import exporter from './routes/exporter';

admin.initializeApp();

export const apiImport = functions.https.onRequest(importer);
export const apiDescribe = functions.https.onRequest(describe);
export const apiExporter = functions.https.onRequest(exporter);

/**
 * Cloud function to set user role (admin or specialist)
 * Only callable by theo@shiekhshoes.org
 */
export const setUserRole = functions.https.onCall(async (data, context) => {
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
export const exportRulesPreview = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Sign in required');
  }

  const { schema, filters, transforms, limit = 5 } = data as {
    schema: string[];
    filters?: Record<string, any>;
    transforms?: Array<{ type: string; field?: string; from?: any; to?: any }>;
    limit?: number;
  };

  if (!schema || !Array.isArray(schema)) {
    throw new functions.https.HttpsError('invalid-argument', 'Schema must be an array of field names');
  }

  // Fetch sample products
  const snap = await admin.firestore().collection('products').limit(limit).get();
  let rows = snap.docs.map(d => d.data());

  // Apply filters
  if (filters && Object.keys(filters).length > 0) {
    rows = rows.filter(row => 
      Object.entries(filters).every(([k, v]) => row[k] === v)
    );
  }

  // Apply transforms
  if (transforms && Array.isArray(transforms)) {
    for (const t of transforms) {
      if (t.type === 'uppercase' && t.field) {
        const field = t.field;
        rows = rows.map(r => ({ ...r, [field]: (r[field] || '').toString().toUpperCase() }));
      } else if (t.type === 'lowercase' && t.field) {
        const field = t.field;
        rows = rows.map(r => ({ ...r, [field]: (r[field] || '').toString().toLowerCase() }));
      } else if (t.type === 'trim' && t.field) {
        const field = t.field;
        rows = rows.map(r => ({ ...r, [field]: (r[field] || '').toString().trim() }));
          } else if (t.type === 'map' && t.field) {
            const field = t.field;
            // support either explicit from/to or a map object
            if ((t as any).map && typeof (t as any).map === 'object') {
              const mapObj = (t as any).map as Record<string, string>;
              rows = rows.map(r => {
                const val = (r[field] ?? '').toString();
                return { ...r, [field]: mapObj[val] ?? val };
              });
            } else if ((t as any).from !== undefined && (t as any).to !== undefined) {
              const { from, to } = t as any;
              rows = rows.map(r => ({ ...r, [field]: r[field] === from ? to : r[field] }));
            }
          }
    }
  }

  // Project only requested fields
  const output = rows.map(r => 
    schema.reduce((acc, f) => ({ ...acc, [f]: r[f] ?? '' }), {} as Record<string, any>)
  );

  return { rows: output };
});
