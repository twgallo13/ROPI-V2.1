import express from 'express';
const app = express();
app.use(express.json());

app.post('*', (req, res) => {
  const { productId, channel, tone, length } = req.body ?? {};
  if (!productId) return res.status(400).json({ error: 'productId required' });

  // TODO: call Gemini here; for now, return a placeholder string
  const text = `(${channel}/${tone}/${length}) Auto description for ${productId}: premium materials, comfortable fit, and everyday performance.`;
  res.json({ text });
});

// keep a simple GET for health checks
app.get('*', (_req, res) => {
  res.json({ ok: true, route: 'describe', message: 'Describe (Gemini) endpoint ready' });
});

export default app;
