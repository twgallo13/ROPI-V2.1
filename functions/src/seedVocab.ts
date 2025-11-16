import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Vocab sets to seed
const sets: Record<string, string[]> = {
  primaryColors: ['Black', 'White', 'Red', 'Blue'],
  descriptiveColors: ['Rose Gold', 'Patent-leather'],
  cutTypes: ['Low', 'Mid', 'High'],
  closureTypes: ['Lace-up', 'Buckle', 'Zip-up'],
  heelHeights: ['0–1"', '2–3"', '4–5"', '5"+'],
  platformHeights: ['Flat', 'Medium (1–2")', 'High (2–3")'],
  collections: [
    'Air Force 1',
    'Air Jordan 1',
    'Air Jordan 2',
    'Air Jordan 3',
    'Air Jordan 4',
    'Air Jordan 5',
    'Air Jordan 6',
    'Air Jordan 11',
    'Air Jordan 12',
    'Air Jordan 13',
    'Jumpman MVP',
    'Air Max 90',
    'Air Max 95',
    'Air Max 97',
    'Air Max Plus',
    'Dunk Low',
    'Dunk High',
    'Blazer',
    'Cortez',
    'React',
    'Vomero',
    'VaporMax',
    'New Balance 550',
    'New Balance 574',
    'New Balance 327',
    'New Balance 2002R',
    'New Balance 9060',
    'Adidas Campus',
    'Adidas Gazelle',
    'Adidas Samba',
    'Adidas Superstar',
    'Yeezy Boost 350',
    'Yeezy Boost 700',
    'Yeezy Slides',
    'Puma Suede',
    'Puma Lamelo Ball',
    'Converse All Star',
    'Vans Old Skool',
    'Other',
  ],
  madeIn: [
    'China',
    'Vietnam',
    'Indonesia',
    'Thailand',
    'India',
    'Bangladesh',
    'Cambodia',
    'USA',
    'Mexico',
    'Italy',
    'Portugal',
    'Spain',
    'Turkey',
    'Other',
  ],
  heelTypes: [
    'Stiletto',
    'Block',
    'Wedge',
    'Kitten',
    'Cone',
    'Platform',
    'Chunky',
  ],
  soleMaterials: [
    'Rubber',
    'TPU',
    'Vibram',
    'Cork',
    'Crepe',
    'Leather',
    'EVA',
    'Manmade',
  ],
  shoeHeightMaps: [
    'Low',
    'Mid',
    'High',
  ],
  taxClasses: [
    'Standard',
    'Apparel',
    'Exempt',
  ],
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

    const db = admin.firestore();
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
