// packages/shared/src/productKey.ts
import { Firestore } from '@google-cloud/firestore' // or firebase-admin types
import type { DocumentReference } from '@google-cloud/firestore'

export function normalizeMPN(raw?: string): string | null {
  if (!raw) return null
  // deterministic normalization:
  // 1) trim
  // 2) lower-case
  // 3) replace all non-alphanumeric sequences with hyphen
  // 4) collapse multiple hyphens to single hyphen, trim leading/trailing hyphens
  let s = String(raw).trim().toLowerCase()
  s = s.replace(/[\/\s_]+/g, '-')           // spaces/slashes/underscores -> hyphen
  s = s.replace(/[^a-z0-9-]+/g, '')         // remove other punctuation
  s = s.replace(/-+/g, '-')                 // collapse hyphens
  s = s.replace(/^-+|-+$/g, '')             // trim hyphens ends
  return s || null
}

export async function getProductDocRefByMPN(db: Firestore, mpn: string): Promise<DocumentReference | null> {
  const mpnNorm = normalizeMPN(mpn)
  if (!mpnNorm) return null

  // 1) check explicit mapping collection
  const mapRef = db.collection('product_mappings').doc(mpnNorm)
  const mapSnap = await mapRef.get()
  if (mapSnap.exists) {
    const docId = mapSnap.get('productDocId')
    if (docId) return db.collection('products').doc(docId)
  }

  // 2) fallback: query products by mpn_normalized
  const q = db.collection('products').where('mpn_normalized', '==', mpnNorm).limit(1)
  const snap = await q.get()
  if (!snap.empty) return snap.docs[0].ref

  // 3) not found
  return null
}