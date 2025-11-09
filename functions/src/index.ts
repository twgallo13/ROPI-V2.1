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
