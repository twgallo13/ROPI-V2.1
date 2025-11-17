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
 * HTTP endpoint to read async describe job status/result
 */
app.get('*', async (req, res) => {
  try {
    const jobId = (req.query.jobId || req.body.jobId) as string;
    if (!jobId) {
      return res.status(400).json({ error: 'jobId required' });
    }

    const doc = await admin.firestore().collection('descriptionJobs').doc(jobId).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const data = doc.data();
    res.status(200).json({ jobId: doc.id, ...data });
  } catch (err: unknown) {
    const error = err as Error;
    console.error('[describeStatus] error', error);
    res.status(500).json({ error: error.message || String(err) });
  }
});

// Also support POST for consistency
app.post('*', async (req, res) => {
  try {
    const jobId = (req.query.jobId || req.body.jobId) as string;
    if (!jobId) {
      return res.status(400).json({ error: 'jobId required' });
    }

    const doc = await admin.firestore().collection('descriptionJobs').doc(jobId).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const data = doc.data();
    res.status(200).json({ jobId: doc.id, ...data });
  } catch (err: unknown) {
    const error = err as Error;
    console.error('[describeStatus] error', error);
    res.status(500).json({ error: error.message || String(err) });
  }
});

export default app;
