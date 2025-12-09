/**
 * Admin Lists Endpoints
 * Per AOSS Section 6 — API Contracts
 * 
 * Implements CRUD handlers for Lists (e.g., departments, categories).
 * All endpoints require admin authentication.
 */

import { requireAdmin } from '../../middleware/auth';
import type { Request, Response } from 'express';
import admin from 'firebase-admin';
import { getListByKey } from '../../services/listsService';

const db = () => admin.firestore();

/**
 * Format service error for HTTP response
 */
function handleServiceError(error: unknown, res: Response): void {
  console.error('Lists endpoint error:', error);
  res.status(500).json({
    error: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
  });
}

/**
 * GET /admin/settings/lists
 * List all available lists
 */
export async function listListsHandler(req: Request, res: Response) {
  await requireAdmin(req, res, async () => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const pageToken = req.query.pageToken as string | undefined;
      
      let query = db().collection('settings').doc('lists').collection('keys').limit(limit);
      
      if (pageToken) {
        const snapshot = await db().collection('settings').doc('lists').collection('keys').doc(pageToken).get();
        if (snapshot.exists) {
          query = query.startAfter(snapshot);
        }
      }
      
      const snapshot = await query.get();
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      
      const nextPageToken = snapshot.docs.length === limit 
        ? snapshot.docs[snapshot.docs.length - 1].id 
        : undefined;
      
      res.status(200).json({
        items,
        nextPageToken,
      });
    } catch (error) {
      handleServiceError(error, res);
    }
  });
}

/**
 * GET /admin/settings/lists/:key
 * Get a single list by key - returns normalized {items, values} structure
 */
export async function getListHandler(req: Request, res: Response) {
  await requireAdmin(req, res, async () => {
    try {
      const listId = req.params.listId;
      if (!listId) {
        res.status(400).json({
          error: 'INVALID_REQUEST',
          message: 'List ID is required',
        });
        return;
      }
      
      const list = await getListByKey(listId);
      if (!list) {
        res.status(404).json({
          error: 'NOT_FOUND',
          message: `List with ID '${listId}' not found`,
        });
        return;
      }
      
      // Normalize response: return both items array and values array
      const items = list.items || [];
      const values = items.map((item: any) => 
        typeof item === 'string' ? item : item.value
      );
      
      res.status(200).json({
        items,
        values,
      });
    } catch (error) {
      handleServiceError(error, res);
    }
  });
}

/**
 * POST /admin/settings/lists
 * Create a new list
 */
export async function createListHandler(req: Request, res: Response) {
  await requireAdmin(req, res, async () => {
    try {
      const { key, items } = req.body;
      
      if (!key || !items || !Array.isArray(items)) {
        res.status(400).json({
          error: 'INVALID_REQUEST',
          message: 'List key and items array are required',
        });
        return;
      }
      
      // Check if list already exists
      const existing = await getListByKey(key);
      if (existing) {
        res.status(409).json({
          error: 'CONFLICT',
          message: `List with key '${key}' already exists`,
        });
        return;
      }
      
      const listDoc = {
        key,
        items,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      
      await db().collection('settings').doc('lists').collection('keys').doc(key).set(listDoc);
      
      res.status(201).json({
        id: key,
        ...listDoc,
      });
    } catch (error) {
      handleServiceError(error, res);
    }
  });
}

/**
 * PUT /admin/settings/lists/:key
 * Update an existing list
 */
export async function updateListHandler(req: Request, res: Response) {
  await requireAdmin(req, res, async () => {
    try {
      const listId = req.params.listId;
      if (!listId) {
        res.status(400).json({
          error: 'INVALID_REQUEST',
          message: 'List ID is required',
        });
        return;
      }
      
      const { items } = req.body;
      if (!items || !Array.isArray(items)) {
        res.status(400).json({
          error: 'INVALID_REQUEST',
          message: 'Items array is required',
        });
        return;
      }
      
      // Check if list exists
      const existing = await getListByKey(listId);
      if (!existing) {
        res.status(404).json({
          error: 'NOT_FOUND',
          message: `List with ID '${listId}' not found`,
        });
        return;
      }
      
      const updateDoc = {
        items,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      
      await db().collection('settings').doc('lists').collection('keys').doc(listId).update(updateDoc);
      
      const updated = await getListByKey(listId);
      res.status(200).json(updated);
    } catch (error) {
      handleServiceError(error, res);
    }
  });
}

/**
 * DELETE /admin/settings/lists/:key
 * Delete a list
 */
export async function deleteListHandler(req: Request, res: Response) {
  await requireAdmin(req, res, async () => {
    try {
      const listId = req.params.listId;
      if (!listId) {
        res.status(400).json({
          error: 'INVALID_REQUEST',
          message: 'List ID is required',
        });
        return;
      }
      
      // Check if list exists
      const existing = await getListByKey(listId);
      if (!existing) {
        res.status(404).json({
          error: 'NOT_FOUND',
          message: `List with ID '${listId}' not found`,
        });
        return;
      }
      
      await db().collection('settings').doc('lists').collection('keys').doc(listId).delete();
      
      res.status(204).send();
    } catch (error) {
      handleServiceError(error, res);
    }
  });
}
