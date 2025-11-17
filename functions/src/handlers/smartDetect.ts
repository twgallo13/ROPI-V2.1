/**
 * Smart Detect Handler
 * Extracted core logic for smart product detection
 */
import type { Request, Response } from 'express';
import * as admin from 'firebase-admin';
import { runSmartDetect, SmartDetectResult } from '../smartDetect';

interface SmartDetectRequest {
  productId?: string;
  product?: any;
}

export async function smartDetectHandler(req: Request, res: Response): Promise<void> {
  try {
    const { productId, product }: SmartDetectRequest = req.body;
    
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
    }
    
    if (!productData) {
      res.status(400).json({ error: 'Product data or productId required' });
      return;
    }
    
    const result: SmartDetectResult = runSmartDetect(productData);
    
    res.json(result);
  } catch (error) {
    console.error('Smart Detect API error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export default smartDetectHandler;
