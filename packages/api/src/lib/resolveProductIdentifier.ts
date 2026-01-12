// packages/api/src/lib/resolveProductIdentifier.ts
import { Request, Response, NextFunction } from 'express'
import admin from 'firebase-admin'
import { normalizeMPN, getProductDocRefByMPN } from '@ropi-aoss/shared'

export async function resolveProductIdentifier(req: Request, res: Response, next: NextFunction) {
  const db = admin.firestore();
  try {
    const rawId = (req.params.mpn || req.params.id || req.query.id || '').toString()
    if (!rawId) return res.status(400).json({ error: 'Missing product identifier' })

    const mpnNormalized = normalizeMPN(rawId)

    // Try canonical MPN resolution
    let productRef = mpnNormalized ? await getProductDocRefByMPN(db, mpnNormalized) : null

    // If not found, attempt legacy doc id lookup (explicit, logged)
    let legacyLookup = false
    if (!productRef) {
      const legacyDocSnap = await db.collection('products').doc(rawId).get()
      if (legacyDocSnap.exists) {
        legacyLookup = true
        // attempt to derive mpn from doc and create mapping
        const mpnField = legacyDocSnap.get('mpn') || legacyDocSnap.get('product_mpn') || legacyDocSnap.get('identifiers.mpn') // adapt as needed
        const mpnNormFromDoc = normalizeMPN(mpnField)
        if (mpnNormFromDoc) {
          // ensure mapping exists
          await db.collection('product_mappings').doc(mpnNormFromDoc).set({ 
            productDocId: legacyDocSnap.id, 
            createdAt: admin.firestore.FieldValue.serverTimestamp(), 
            source: 'legacy-lookup' 
          }, { merge: true })
        }
        productRef = legacyDocSnap.ref
        console.warn(`Legacy product lookup used for: ${rawId} (normalized: ${mpnNormalized})`)
      }
    }

    if (!productRef) {
      return res.status(404).json({ 
        error: `Product not found for identifier: ${rawId}`, 
        identifier: rawId, 
        mpn_normalized: mpnNormalized 
      })
    }

    // attach
    res.locals.productDocRef = productRef
    res.locals.mpn_normalized = mpnNormalized
    res.locals.legacy_lookup = legacyLookup
    return next()
  } catch (err) {
    console.error('resolveProductIdentifier', err)
    return res.status(500).json({ error: 'internal resolver error' })
  }
}