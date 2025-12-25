/**
 * Products Endpoints
 * 
 * Server-side validated product operations.
 * 
 * Lisa v1.0.0
 * 
 * References:
 * - Product Completion Workflows (W2): https://www.notion.so/2ba45ee1ec5a80698690f9492961ed8b
 * - Attribute Validation Schema: https://www.notion.so/2b845ee1ec5a805fba0ef665dfb17396
 */

import * as admin from 'firebase-admin';
import { requireAdmin, type AuthenticatedRequest } from '../middleware/auth';
import type { Request, Response } from 'express';
import { getAttribute, ServiceError } from '../services/attributesService';

/**
 * PATCH /products/:productId/attributes
 * 
 * Server-side validated update of product attributes.
 * Validates incoming keys against the attribute registry.
 */
export async function patchProductAttributesHandler(req: Request, res: Response) {
  await requireAdmin(req, res, async () => {
    const productId = req.params.productId;
    
    if (!productId) {
      res.status(400).json({ 
        error: 'MISSING_PRODUCT_ID', 
        message: 'Product ID is required' 
      });
      return;
    }

    const attrs = req.body?.attributes;
    
    if (!attrs || typeof attrs !== 'object' || Array.isArray(attrs)) {
      res.status(400).json({ 
        error: 'INVALID_ATTRIBUTES', 
        message: 'Request body must contain an "attributes" object' 
      });
      return;
    }

    // Validate that all attribute keys exist in the registry
    const invalidKeys: string[] = [];
    const validatedAttrs: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(attrs)) {
      try {
        const attrDef = await getAttribute(key);
        
        // Optional: Validate value against data_type
        if (attrDef.data_type === 'enum' && attrDef.allowed_values) {
          if (typeof value === 'string' && !attrDef.allowed_values.includes(value)) {
            invalidKeys.push(`${key}: value "${value}" not in allowed values`);
            continue;
          }
        }
        
        if (attrDef.data_type === 'boolean' && typeof value !== 'boolean') {
          invalidKeys.push(`${key}: expected boolean, got ${typeof value}`);
          continue;
        }
        
        if (attrDef.data_type === 'number' && typeof value !== 'number') {
          invalidKeys.push(`${key}: expected number, got ${typeof value}`);
          continue;
        }
        
        if (attrDef.data_type === 'multiSelect' && !Array.isArray(value)) {
          invalidKeys.push(`${key}: expected array for multiSelect`);
          continue;
        }
        
        validatedAttrs[key] = value;
      } catch (error) {
        if (error instanceof ServiceError && error.code === 'ATTRIBUTE_NOT_FOUND') {
          // Allow unknown attributes but flag them
          console.warn(`Unknown attribute key: ${key}`);
          validatedAttrs[key] = value;
        } else {
          throw error;
        }
      }
    }

    if (invalidKeys.length > 0) {
      res.status(400).json({ 
        error: 'INVALID_ATTRIBUTE_VALUES', 
        message: 'Some attribute values are invalid',
        details: invalidKeys 
      });
      return;
    }

    const db = admin.firestore();
    const productRef = db.collection('products').doc(productId);

    try {
      // Check if product exists
      const productDoc = await productRef.get();
      if (!productDoc.exists) {
        res.status(404).json({ 
          error: 'PRODUCT_NOT_FOUND', 
          message: `Product '${productId}' not found` 
        });
        return;
      }

      // Get actor from auth context
      const authReq = req as AuthenticatedRequest;
      const actor = authReq.auth?.uid || 'system';
      const now = new Date().toISOString();

      // Build update payload with dot notation for nested attributes
      const updatePayload: Record<string, unknown> = {
        updatedBy: actor,
        updatedAt: now,
      };
      
      for (const [key, value] of Object.entries(validatedAttrs)) {
        updatePayload[`attributes.${key}`] = value;
      }

      await productRef.update(updatePayload);

      // Fetch and return updated product
      const updatedDoc = await productRef.get();
      res.status(200).json({
        id: updatedDoc.id,
        ...updatedDoc.data(),
      });
    } catch (error) {
      console.error('Error updating product attributes:', error);
      res.status(500).json({ 
        error: 'INTERNAL_ERROR', 
        message: 'Failed to update product attributes' 
      });
    }
  });
}

/**
 * GET /products/:productId
 * 
 * Retrieve a single product by ID.
 */
export async function getProductHandler(req: Request, res: Response) {
  await requireAdmin(req, res, async () => {
    const productId = req.params.productId;
    
    if (!productId) {
      res.status(400).json({ 
        error: 'MISSING_PRODUCT_ID', 
        message: 'Product ID is required' 
      });
      return;
    }

    const db = admin.firestore();
    const productRef = db.collection('products').doc(productId);

    try {
      const productDoc = await productRef.get();
      
      if (!productDoc.exists) {
        res.status(404).json({ 
          error: 'PRODUCT_NOT_FOUND', 
          message: `Product '${productId}' not found` 
        });
        return;
      }

      res.status(200).json({
        id: productDoc.id,
        ...productDoc.data(),
      });
    } catch (error) {
      console.error('Error fetching product:', error);
      res.status(500).json({ 
        error: 'INTERNAL_ERROR', 
        message: 'Failed to fetch product' 
      });
    }
  });
}

/**
 * GET /products
 * 
 * List products with pagination, search, filtering, and sorting.
 * 
 * Query params:
 * - limit: Max items per page (default 50, max 100)
 * - pageToken: Pagination cursor (document ID)
 * - q: Search query (searches SKU, MPN, name, brand, category)
 * - sortBy: Field to sort by (name, sku, updatedAt, createdAt) - default: updatedAt
 * - sortDir: Sort direction (asc, desc) - default: desc
 * - brand: Filter by brand (exact match)
 * - status: Filter by status (exact match)
 * - category: Filter by category (exact match)
 * - department: Filter by department (exact match)
 * 
 * Returns:
 * - items: Array of products
 * - hasMore: Boolean indicating if more results available
 * - pageToken: Cursor for next page
 * - total: Total count (estimated, only returned on first page)
 */
export async function listProductsHandler(req: Request, res: Response) {
  await requireAdmin(req, res, async () => {
    const db = admin.firestore();
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const pageToken = req.query.pageToken as string | undefined;
    const searchQuery = (req.query.q as string || '').toLowerCase().trim();
    
    // Sorting parameters
    const sortBy = (req.query.sortBy as string) || 'updatedAt';
    const sortDir = (req.query.sortDir as string) === 'asc' ? 'asc' : 'desc';
    
    // Filter parameters
    const brandFilter = req.query.brand as string | undefined;
    const statusFilter = req.query.status as string | undefined;
    const categoryFilter = req.query.category as string | undefined;
    const departmentFilter = req.query.department as string | undefined;

    // Validate sortBy field
    const allowedSortFields = ['name', 'sku', 'updatedAt', 'createdAt', 'brand', 'status'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'updatedAt';
    
    // Check if any filters are applied
    const hasFilters = brandFilter || statusFilter || categoryFilter || departmentFilter;

    try {
      let query: admin.firestore.Query = db.collection('products');

      // Apply filters (must be done before sorting for composite indexes)
      if (brandFilter) {
        query = query.where('brand', '==', brandFilter);
      }
      if (statusFilter) {
        query = query.where('status', '==', statusFilter);
      }
      if (categoryFilter) {
        query = query.where('category', '==', categoryFilter);
      }
      if (departmentFilter) {
        query = query.where('department', '==', departmentFilter);
      }

      // IMPORTANT: Firestore excludes documents that don't have the orderBy field
      // Only apply orderBy if we have filters (which require indexes) or explicit sort request
      // For the default case, fetch all documents and sort client-side
      const useServerSort = hasFilters || (req.query.sortBy as string);
      
      if (useServerSort) {
        // Apply sorting (requires documents to have the sort field)
        query = query.orderBy(sortField, sortDir);
        
        // Add secondary sort by ID for stable pagination
        if (sortField !== 'updatedAt') {
          query = query.orderBy('updatedAt', 'desc');
        }
      }
      
      // For search queries, fetch more documents to search across
      // This is a workaround for Firestore's lack of full-text search
      const fetchLimit = searchQuery ? 500 : (limit + 1);
      query = query.limit(fetchLimit);

      // Apply pagination cursor
      if (pageToken) {
        const lastDoc = await db.collection('products').doc(pageToken).get();
        if (lastDoc.exists) {
          query = query.startAfter(lastDoc);
        }
      }

      const snapshot = await query.get();
      let docs = snapshot.docs;

      // Client-side sorting when server sort was not applied
      // This ensures all documents are included even if they lack the sort field
      if (!useServerSort && docs.length > 1) {
        docs = [...docs].sort((a, b) => {
          const aData = a.data();
          const bData = b.data();
          const aVal = aData[sortField] || '';
          const bVal = bData[sortField] || '';
          
          if (sortDir === 'asc') {
            return String(aVal).localeCompare(String(bVal));
          } else {
            return String(bVal).localeCompare(String(aVal));
          }
        });
      }

      // Client-side search filtering (Firestore limitations)
      // For production scale (>5k products), migrate to Algolia or Elasticsearch
      if (searchQuery) {
        docs = docs.filter(doc => {
          const data = doc.data();
          const searchFields = [
            data.sku,
            data.mpn,
            data.name,
            data.brand,
            data.category,
            data.department,
            data.class,
            doc.id, // Also search by document ID
          ].filter(Boolean).map(v => String(v).toLowerCase());

          return searchFields.some(field => field.includes(searchQuery));
        });
      }

      const hasMore = docs.length > limit;
      const resultDocs = hasMore ? docs.slice(0, limit) : docs;

      const items = resultDocs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Estimate total count on first page (no pageToken)
      let total: number | undefined;
      if (!pageToken && items.length > 0) {
        // For filtered queries, count is approximate
        // For exact counts, consider caching or using aggregation queries
        total = items.length + (hasMore ? limit : 0);
      }

      res.status(200).json({
        items,
        hasMore,
        pageToken: hasMore ? resultDocs[resultDocs.length - 1]?.id : undefined,
        total,
      });
    } catch (error) {
      console.error('Error listing products:', error);
      
      // Check for Firestore composite index errors
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('requires an index') || msg.includes('create a composite index') || msg.includes('FAILED_PRECONDITION')) {
        // Extract index URL if present in error message
        const indexUrlMatch = msg.match(/https?:\/\/[^\s)]+/);
        const indexUrl = indexUrlMatch ? indexUrlMatch[0] : undefined;
        
        console.error('Missing Firestore composite index. URL:', indexUrl || 'not provided');
        
        res.status(400).json({ 
          error: 'MISSING_INDEX', 
          message: 'This query requires a Firestore composite index. Please create the index and retry.',
          indexUrl,
          hint: 'Try removing filters or contact admin to create the required index.'
        });
        return;
      }
      
      res.status(500).json({ 
        error: 'INTERNAL_ERROR', 
        message: 'Failed to list products' 
      });
    }
  });
}

/**
 * GET /products/by-mpn/:mpn
 * 
 * LP-1.1.1: Retrieve a product by MPN for mobile observations capture.
 * Returns minimal product view: { product_mpn, title, thumbnail, id }
 */
export async function getProductByMpnHandler(req: Request, res: Response) {
  await requireAdmin(req, res, async () => {
    const mpn = req.params.mpn;
    
    if (!mpn) {
      res.status(400).json({ 
        error: 'MISSING_MPN', 
        message: 'MPN is required' 
      });
      return;
    }

    const db = admin.firestore();

    try {
      // Query products by MPN
      const snapshot = await db
        .collection('products')
        .where('mpn', '==', mpn)
        .limit(1)
        .get();

      if (snapshot.empty) {
        res.status(404).json({ 
          error: 'PRODUCT_NOT_FOUND', 
          message: `Product with MPN '${mpn}' not found` 
        });
        return;
      }

      const doc = snapshot.docs[0];
      const data = doc.data();

      // Return minimal product view for mobile capture
      res.status(200).json({
        id: doc.id,
        product_mpn: data.mpn || mpn,
        title: data.name || data.title || 'Untitled Product',
        thumbnail: data.images?.[0]?.thumb || data.images?.[0]?.url || data.thumbnail || null,
        brand: data.brand || null,
        sku: data.sku || null,
      });
    } catch (error) {
      console.error('Error fetching product by MPN:', error);
      res.status(500).json({ 
        error: 'INTERNAL_ERROR', 
        message: 'Failed to fetch product' 
      });
    }
  });
}

/**
 * GET /products/search-mpn
 * 
 * LP-1.1.10: Search products by partial MPN match.
 * Supports autocomplete/typeahead for MPN input in mobile capture.
 * 
 * Query params:
 * - q: Partial MPN string (minimum 2 characters)
 * - limit: Max results (default 10, max 50)
 */
export async function searchProductsByMpnHandler(req: Request, res: Response) {
  await requireAdmin(req, res, async () => {
    const query = (req.query.q as string || '').trim().toLowerCase();
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    
    if (!query || query.length < 2) {
      res.status(400).json({ 
        error: 'INVALID_QUERY', 
        message: 'Search query must be at least 2 characters' 
      });
      return;
    }

    const db = admin.firestore();

    try {
      // Fetch products and filter client-side for partial match
      // For production scale, use Algolia or dedicated search index
      const snapshot = await db
        .collection('products')
        .orderBy('mpn')
        .limit(500) // Fetch more to allow client-side filtering
        .get();

      const results: Array<{
        id: string;
        product_mpn: string;
        title: string;
        thumbnail: string | null;
        brand: string | null;
        sku: string | null;
      }> = [];

      for (const doc of snapshot.docs) {
        const data = doc.data();
        const mpn = (data.mpn || '').toLowerCase();
        const sku = (data.sku || '').toLowerCase();
        const name = (data.name || data.title || '').toLowerCase();
        
        // Match against MPN, SKU, or name
        if (mpn.includes(query) || sku.includes(query) || name.includes(query)) {
          results.push({
            id: doc.id,
            product_mpn: data.mpn || '',
            title: data.name || data.title || 'Untitled Product',
            thumbnail: data.images?.[0]?.thumb || data.images?.[0]?.url || data.thumbnail || null,
            brand: data.brand || null,
            sku: data.sku || null,
          });
          
          if (results.length >= limit) break;
        }
      }

      res.status(200).json({
        results,
        count: results.length,
        query,
      });
    } catch (error) {
      console.error('Error searching products by MPN:', error);
      res.status(500).json({ 
        error: 'INTERNAL_ERROR', 
        message: 'Failed to search products' 
      });
    }
  });
}
