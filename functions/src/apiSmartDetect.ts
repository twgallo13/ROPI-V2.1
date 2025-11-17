/**
 * Smart Detect API Endpoint
 * Refactored to use handler module for consistency
 */
import express from 'express';
import smartDetectHandler from './handlers/smartDetect';

const app = express();

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

// Register handler for all path variations from firebase.json
app.post('/', smartDetectHandler);
app.post('/apiSmartDetect', smartDetectHandler);
app.post('/api/smart-detect', smartDetectHandler);
app.post('/smart-detect', smartDetectHandler);

export default app;