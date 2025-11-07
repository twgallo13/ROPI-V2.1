import express from 'express';

const app = express();

app.get('*', (_req, res) => {
  res.json({ ok: true, route: 'import', message: 'Import endpoint ready' });
});

export default app;
