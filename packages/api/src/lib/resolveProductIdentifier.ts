// packages/api/src/lib/resolveProductIdentifier.ts
import { Request, Response, NextFunction } from 'express'
import admin from 'firebase-admin'
import { normalizeMPN } from '@ropi-aoss/shared'

/**
 * Resolves product identifier from request params to Firestore document reference.
 * 
 * Resolution strategy:
 * 1. Normalize the MPN from request (104-test → 104-TEST)
 * 2. Check product_mappings collection for canonical doc ID
 * 3. If no mapping, try direct document lookup with normalized MPN
 * 4. If still not found, return 404
 */
export async function resolveProductIdentifier(req: Request, res: Response, next: NextFunction) {
  const db = admin.firestore();
  try {
    const rawId = (req.params.mpn || req.params.id || req.query.id || '').toString()
    if (!rawId) return res.status(400).json({ error: 'Missing product identifier' })

    const mpnNormalized = normalizeMPN(rawId)
    
    console.log(`[resolveProductIdentifier] rawId="${rawId}", normalized="${mpnNormalized}"`);

    // Step 1: Try product_mappings lookup
    let productRef = null;
    try {
      const mappingDoc = await db.collection('product_mappings').doc(mpnNormalized).get();
      if (mappingDoc.exists) {
        const mapping = mappingDoc.data();
        if (mapping?.productDocId) {
          productRef = db.collection('products').doc(mapping.productDocId);
          console.log(`[resolveProductIdentifier] Found via mapping: ${mapping.productDocId}`);
        }
      }
    } catch (err) {
      console.warn('[resolveProductIdentifier] Error checking product_mappings:', err);
    }

    // Step 2: Try direct document lookup with normalized MPN
    if (!productRef) {
      const directDoc = await db.collection('products').doc(mpnNormalized).get();
      if (directDoc.exists) {
        productRef = directDoc.ref;
        console.log(`[resolveProductIdentifier] Found via direct lookup: ${mpnNormalized}`);
      }
    }

    // Step 3: Try direct lookup with original rawId (legacy support)
    if (!productRef && rawId !== mpnNormalized) {
      const legacyDoc = await db.collection('products').doc(rawId).get();
      if (legacyDoc.exists) {
        productRef = legacyDoc.ref;
        console.log(`[resolveProductIdentifier] Found via legacy lookup: ${rawId}`);
        
        // Create mapping for future use
        try {
          await db.collection('product_mappings').doc(mpnNormalized).set({ 
            productDocId: legacyDoc.id, 
            createdAt: admin.firestore.FieldValue.serverTimestamp(), 
            source: 'legacy-lookup' 
          }, { merge: true });
        } catch (err) {
          console.warn('[resolveProductIdentifier] Error creating mapping:', err);
        }
      }
    }

    if (!productRef) {
      console.warn(`[resolveProductIdentifier] Product not found: rawId="${rawId}", normalized="${mpnNormalized}"`);
      return res.status(404).json({ 
        error: `Product not found for identifier: ${rawId}`, 
        identifier: rawId, 
        mpn_normalized: mpnNormalized 
      })
    }

    // Attach resolved reference to response locals
    res.locals.productDocRef = productRef
    res.locals.mpn_normalized = mpnNormalized
    return next()
  } catch (err) {
    console.error('[resolveProductIdentifier] Error:', err)
    return res.status(500).json({ error: 'internal resolver error' })
  }
}