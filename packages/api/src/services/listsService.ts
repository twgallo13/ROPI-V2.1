import admin from 'firebase-admin';

const db = () => admin.firestore();

export async function getListByKey(key: string) {
  // lists are stored under settings/lists/keys/<key>
  const doc = await db().doc(`settings/lists/keys/${key}`).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}
