import express from 'express';

const app = express();

app.get('*', (_req, res) => {
  res.json({ ok: true, route: 'exporter', message: 'Exporter endpoint ready' });
});

export default app;
