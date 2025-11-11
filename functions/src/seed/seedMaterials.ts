import { getFirestore } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions';
import materialsData from './materials.json';

/**
 * Seed Materials vocabulary into Firestore
 * Path: /settings/materials/items/{id}
 */
async function seedMaterialsData() {
  const db = getFirestore();
  console.log('[seedMaterials] Starting materials vocabulary seed...');

  let added = 0;
  let skipped = 0;

  for (const item of materialsData.items) {
    try {
      // Normalize name: lowercase, trim, replace spaces with hyphens
      const slug = item.name
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');

      const docRef = db.collection('settings').doc('materials').collection('items').doc(slug);

      // Check if exists
      const exists = await docRef.get();
      if (exists.exists) {
        skipped++;
        continue;
      }

      // Write vocab item
      await docRef.set({
        value: slug,
        label: item.name,
        active: item.active !== false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      added++;
    } catch (error) {
      console.error(`[seedMaterials] Failed to seed material "${item.name}":`, error);
    }
  }

  console.log(`[seedMaterials] Complete. Added: ${added}, Skipped: ${skipped}`);
  return { added, skipped };
}

/**
 * Cloud function to seed materials vocabulary
 * Requires x-seed-token header for security
 */
export const seedMaterials = functions.https.onRequest(async (req, res) => {
  try {
    const token = req.header('x-seed-token');
    if (token !== process.env.SEED_TOKEN) {
      res.status(401).json({ ok: false, error: 'unauthorized' });
      return;
    }

    const result = await seedMaterialsData();
    res.json({ ok: true, ...result });
  } catch (e: any) {
    console.error('[seedMaterials] Error:', e);
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});
