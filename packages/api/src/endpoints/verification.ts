import type { Request, Response } from 'express';
import { requireAdmin } from '../middleware/auth';
import { getLatestVerificationRun, runVerification } from '../services/svsVerification';

function parseProductIds(req: Request): string[] {
  if (Array.isArray(req.body?.productIds)) return req.body.productIds as string[];
  if (typeof req.body?.productIds === 'string' && req.body.productIds.trim().length > 0) {
    return req.body.productIds.split(',').map(s => s.trim()).filter(Boolean);
  }
  if (typeof req.query.productIds === 'string') {
    return (req.query.productIds as string).split(',').map(s => s.trim()).filter(Boolean);
  }
  return ['prod_sampling'];
}

export async function runVerificationHandler(req: Request, res: Response) {
  await requireAdmin(req, res, async () => {
    try {
      const productIds = parseProductIds(req);
      const actor = (req.body?.actor as string) || 'svs-api';
      const summary = await runVerification(productIds, actor);
      res.status(200).json({ ok: true, summary });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ ok: false, error: 'VERIFICATION_FAILED', message });
    }
  });
}

export async function latestVerificationHandler(_req: Request, res: Response) {
  try {
    const latest = await getLatestVerificationRun();
    res.status(200).json({ latest });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: 'VERIFICATION_READ_FAILED', message });
  }
}
