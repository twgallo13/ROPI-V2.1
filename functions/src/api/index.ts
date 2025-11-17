/**
 * Consolidated API Router
 * Exposes all API endpoints under /api/* with unified CORS and error handling
 */
import express from 'express';
import smartDetectHandler from '../handlers/smartDetect';
import validateHandler from '../handlers/validate';
import describeHandler from '../handlers/describe';
import importRouter from '../routes/import';
import exporterRouter from '../routes/exporter';
import describeStartRouter from '../routes/describeStart';
import describeStatusRouter from '../routes/describeStatus';

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
  if (origin && (allowedOrigins.includes(origin) || /\.app\.github\.dev$/.test(origin))) {
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

// Parse JSON
app.use(express.json());

// Mount routes - wrap handlers to catch promise rejections
app.post('/api/smart-detect', (req, res, next) => {
  Promise.resolve(smartDetectHandler(req, res)).catch(next);
});

app.post('/api/validate', (req, res, next) => {
  Promise.resolve(validateHandler(req, res)).catch(next);
});

app.post('/api/describe', (req, res, next) => {
  Promise.resolve(describeHandler(req, res)).catch(next);
});

// Async describe endpoints (job queue)
app.use('/api/describe-start', describeStartRouter);
app.use('/api/describe-status', describeStatusRouter);

// Mount import and exporter subrouters
app.use('/api/import', importRouter);
app.use('/api/exporter', exporterRouter);

// Root endpoint for health checks
app.all('/', (req, res) => {
  res.status(200).json({ 
    ok: true,
    endpoints: [
      '/api/smart-detect',
      '/api/validate',
      '/api/describe',
      '/api/describe-start',
      '/api/describe-status',
      '/api/import',
      '/api/exporter'
    ]
  });
});

// Error handler
app.use((err: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const error = err as Error;
  console.error('[api] Error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: error.message || 'Unknown error'
  });
});

export default app;
