import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Use default initialized app (initialized in index.ts)
const db = admin.firestore();

// Vocab sets to seed
const sets: Record<string, string[]> = {
  primaryColors: ['Black', 'White', 'Red', 'Blue'],
  descriptiveColors: ['Rose Gold', 'Patent-leather'],
  cutTypes: ['Low', 'Mid', 'High'],
  closureTypes: ['Lace-up', 'Buckle', 'Zip-up'],
  heelHeights: ['0–1"', '2–3"', '4–5"', '5"+'],
  platformHeights: ['Flat', 'Medium (1–2")', 'High (2–3")'],
};

// slug helper
const slug = (s: string) =>
  (s || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const seedSettingsVocab = functions.https.onRequest(async (req, res) => {
  try {
    const token = req.header('x-seed-token');
    if (token !== process.env.SEED_TOKEN) {
      res.status(401).json({ ok: false, error: 'unauthorized' });
      return;
    }

    const counts: Record<string, number> = {};

    for (const [key, items] of Object.entries(sets)) {
      let n = 0;
      for (const label of items) {
        const id = slug(label);
        await db.doc(`settings/${key}/items/${id}`).set(
          {
            value: label,
            label,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
        n++;
      }
      counts[key] = n;
    }

    res.json({ ok: true, counts });
    return;
  } catch (e: any) {
    res.status(500).json({ ok: false, error: String(e?.message || e) });
    return;
  }
});
