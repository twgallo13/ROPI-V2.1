/**
 * Describe Handler
 * Reuses existing describe route logic
 */
import type { Request, Response } from 'express';
import describeApp from '../routes/describe';

// The describe app already has all the logic built in as an Express app
// We can just use it directly as a handler
export async function describeHandler(req: Request, res: Response): Promise<void> {
  // The describe route is already an Express app, so we pass through
  // This handler is a thin wrapper for consistency with other handlers
  return describeApp(req, res, () => {});
}

export default describeHandler;
