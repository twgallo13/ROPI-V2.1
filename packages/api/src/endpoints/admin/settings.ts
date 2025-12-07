import { requireAdmin } from '../../middleware/auth';
import { Request, Response } from 'express';
import { validateAttribute } from '../schemas/attributeSchema';
// NOTE: adapt imports to your runtime/export style. This file is an endpoint skeleton.
// Example handlers: listAttributes, createAttribute, updateAttribute, deleteAttribute

export async function listAttributesHandler(req: Request, res: Response) {
  await requireAdmin(req, res, async () => {
    // TODO: Implement Firestore list read for settings/attributes/keys
    res.status(200).json({ message: 'listAttributes not implemented yet' });
  });
}

export async function createAttributeHandler(req: Request, res: Response) {
  await requireAdmin(req, res, async () => {
    const parsed = validateAttribute(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error });
      return;
    }
    // TODO: Persist to Firestore
    res.status(201).json({ message: 'createAttribute not implemented yet' });
  });
}

export async function updateAttributeHandler(req: Request, res: Response) {
  await requireAdmin(req, res, async () => {
    // TODO: validate & update
    res.status(200).json({ message: 'updateAttribute not implemented yet' });
  });
}

export async function deleteAttributeHandler(req: Request, res: Response) {
  await requireAdmin(req, res, async () => {
    // TODO: delete
    res.status(200).json({ message: 'deleteAttribute not implemented yet' });
  });
}
