import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Ensure default app is initialized elsewhere (index.ts). Using the default app here.
const db = admin.firestore();

// Tiny slug helper: lowercase, trim, replace non-alphanumerics with hyphens
function slugify(input: string): string {
  return (input || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function seedSettingsVocabHandler(req: functions.https.Request, res: functions.Response): Promise<void> {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ ok: false, error: 'Method Not Allowed' });
      return;
    }

    const token = req.header('x-seed-token');
    if (!token || token !== process.env.SEED_TOKEN) {
      res.status(401).json({ ok: false });
      return;
    }

    // Defaults to seed
    const payload: Record<string, string[]> = {
      primaryColors: ['Black', 'White', 'Red', 'Blue'],
      descriptiveColors: ['Rose Gold', 'Patent-leather'],
      cutTypes: ['Low', 'Mid', 'High'],
      closureTypes: ['Lace-up', 'Buckle', 'Zip-up'],
      heelHeights: ['0–1"', '2–3"', '4–5"', '5"+'],
      platformHeights: ['Flat', 'Medium (1–2")', 'High (2–3")'],
    };

    const counts: Record<string, number> = {};

    for (const [key, values] of Object.entries(payload)) {
      let n = 0;
      for (const label of values) {
        const value = label; // Store as-is
        const slug = slugify(value);
        const ref = db.doc(`settings/${key}/items/${slug}`);
        await ref.set(
          {
            value,
            label,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
        n += 1;
      }
      counts[key] = n;
    }

    res.json({ ok: true, counts });
    return;
  } catch (err) {
    console.error('[seedSettingsVocab] Error:', err);
    res.status(500).json({ ok: false, error: 'Internal Error' });
    return;
  }
}
