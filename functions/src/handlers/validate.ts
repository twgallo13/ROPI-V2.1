/**
 * Validate Handler
 * Extracted core logic for product validation
 */
import type { Request, Response } from 'express';
import * as admin from 'firebase-admin';
import { validateProduct, ValidationResult } from '../validator';
import { legacyToNew } from '../utils/schemaAdapter';

interface ValidateRequest {
  productId?: string;
  product?: any;
}

export async function validateHandler(req: Request, res: Response): Promise<void> {
  try {
    const { productId, product }: ValidateRequest = req.body;
    
    let productData = product;
    
    // If productId provided, fetch from Firestore
    if (productId && !product) {
      const db = admin.firestore();
      const productDoc = await db.collection('products').doc(productId).get();
      
      if (!productDoc.exists) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }
      
      productData = { id: productDoc.id, ...productDoc.data() };
      
      // Convert legacy schema to new schema if needed
      if (!productData?.sku_core) {
        console.log('[legacyToNew] conversion applied for product', productData.id);
        productData = legacyToNew(productData);
      }
    }
    
    if (!productData) {
      res.status(400).json({ error: 'Product data or productId required' });
      return;
    }
    
    const result: ValidationResult = validateProduct(productData);
    
    res.json(result);
  } catch (error) {
    console.error('Validator API error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export default validateHandler;
