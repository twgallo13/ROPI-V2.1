import express from 'express';
import * as admin from 'firebase-admin';

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
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

app.use(express.json());

/**
 * HTTP endpoint to create an async describe job
 * Returns a jobId immediately, then worker processes in background
 */
app.post('*', async (req, res) => {
  try {
    const body = req.body || {};
    // Validate basic shape (you can add stronger validation)
    const productId = body.productId || null;
    const channel = body.channel || 'web';
    const attributes = Array.isArray(body.attributes) ? body.attributes : [];
    const facts = body.facts || {};
    const aiContext = body.aiContext || {};
    const tone = body.tone || 'Clean';
    const length = body.length || 'Medium';
    const temperature = body.temperature;
    const templateOverride = body.templateOverride;

    const jobs = admin.firestore().collection('descriptionJobs');
    const jobRef = jobs.doc();

    const jobData = {
      productId,
      channel,
      attributes,
      facts,
      aiContext,
      tone,
      length,
      temperature,
      templateOverride,
      status: 'pending',    // pending -> processing -> done/error
      result: null,
      error: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await jobRef.set(jobData);
    console.log(`[describeStart] Created job ${jobRef.id} for product ${productId}`);
    
    res.status(200).json({ jobId: jobRef.id, status: 'pending' });
  } catch (err: unknown) {
    const error = err as Error;
    console.error('[describeStart] error', error);
    res.status(500).json({ error: error.message || String(err) });
  }
});

// Health check
app.get('*', (_req, res) => {
  res.json({ ok: true, route: 'describeStart', message: 'Async describe job creation endpoint ready' });
});

export default app;
