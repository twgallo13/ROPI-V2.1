/**
 * Smart Detect API Endpoint
 */
import express from 'express';
import * as admin from 'firebase-admin';
import { runSmartDetect, SmartDetectResult } from './smartDetect';

const app = express();

// Debug logging middleware - log incoming paths first
app.use((req, res, next) => {
  console.log('HOSTING DEBUG - PATHS:', {
    originalUrl: req.originalUrl,
    url: req.url,
    path: req.path,
    method: req.method,
    headers: {
      host: req.headers.host,
      'x-forwarded-host': req.headers['x-forwarded-host'],
      'x-original-url': req.headers['x-original-url'] || null
    }
  });
  next();
});

// CORS for dev environments
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://ropi-bccee.web.app',
    'https://ropi-bccee.firebaseapp.com',
  ];
  
  // Allow any *.app.github.dev origin (Codespaces)
  if (origin && (allowedOrigins.includes(origin) || /\\.app\\.github\\.dev$/.test(origin))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

app.use(express.json());

interface SmartDetectRequest {
  productId?: string;
  product?: any;
}

app.post('/', async (req, res) => {
  try {
    const { productId, product }: SmartDetectRequest = req.body;
    
    let productData = product;
    
    // If productId provided, fetch from Firestore
    if (productId && !product) {
      const db = admin.firestore();
      const productDoc = await db.collection('products').doc(productId).get();
      
      if (!productDoc.exists) {
        return res.status(404).json({ error: 'Product not found' });
      }
      
      productData = { id: productDoc.id, ...productDoc.data() };
    }
    
    if (!productData) {
      return res.status(400).json({ error: 'Product data or productId required' });
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
});

export default app;