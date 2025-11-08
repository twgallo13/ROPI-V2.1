import express from 'express';

const app = express();

app.get('*', (_req, res) => {
  res.json({ ok: true, route: 'describe', message: 'Describe (Gemini) endpoint ready' });
});

export default app;
