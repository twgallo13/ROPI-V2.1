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
import { normalizeMpn } from '@ropi-aoss/sdk';
import { 
  calculateCompletionDrivenExportReadiness,
  type CompletionDrivenExportReadiness
} from '../services/completionDrivenExportReadiness';

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
 * - limit: Max items per page (default 25, max 100)
 * - pageToken: Pagination cursor (document ID)
 * - page: Page number for client-side pagination tracking
 * - q: Search query (searches SKU, MPN, name, brand, category)
 * - sortBy: Field to sort by (name, sku, updatedAt, createdAt) - default: updatedAt
 * - sortDir: Sort direction (asc, desc) - default: desc
 * - brand: Filter by brand (exact match)
 * - status: Filter by status (exact match)
 * - category: Filter by category (exact match)
 * - department: Filter by department (exact match)
 * - dateFrom: Filter by createdAt >= value (ISO date string)
 * - dateTo: Filter by createdAt <= value (ISO date string)
 * 
 * Returns:
 * - items: Array of products
 * - hasMore: Boolean indicating if more results available
 * - nextPageToken: Cursor for next page (always included when hasMore is true)
 * - total: Total count (estimated, only returned on first page)
 * - page: Current page number
 * 
 * LP-1.3.5: Enhanced filters & pagination
 */
export async function listProductsHandler(req: Request, res: Response) {
  await requireAdmin(req, res, async () => {
    const db = admin.firestore();
    const limit = Math.min(parseInt(req.query.limit as string) || 25, 100);
    const pageToken = req.query.pageToken as string | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const searchQuery = (req.query.q as string || '').toLowerCase().trim();
    
    // Sorting parameters
    const sortBy = (req.query.sortBy as string) || 'updatedAt';
    const sortDir = (req.query.sortDir as string) === 'asc' ? 'asc' : 'desc';
    
    // Filter parameters
    const brandFilter = req.query.brand as string | undefined;
    const statusFilter = req.query.status as string | undefined;
    const categoryFilter = req.query.category as string | undefined;
    const departmentFilter = req.query.department as string | undefined;
    
    // Date range filter (LP-1.3.5)
    const dateFrom = req.query.dateFrom as string | undefined;
    const dateTo = req.query.dateTo as string | undefined;

    // Validate sortBy field
    const allowedSortFields = ['name', 'sku', 'updatedAt', 'createdAt', 'brand', 'status'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'updatedAt';
    
    // Check if any filters are applied
    const hasFilters = brandFilter || statusFilter || categoryFilter || departmentFilter || dateFrom || dateTo;

    try {
      let query: admin.firestore.Query = db.collection('products');

      // Apply filters
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

      // IMPORTANT: Do NOT use server-side orderBy with filters
      // This avoids requiring composite indexes (filter + sort field)
      // Instead, we fetch filtered docs and sort client-side
      // This is fine for small catalogs (<1000 products)
      
      // Only use server sort when no filters and no search (simple pagination case)
      const useServerSort = !hasFilters && !searchQuery && !pageToken;
      
      // For filtered/search queries, fetch more documents
      // For simple list, use normal pagination
      const fetchLimit = (hasFilters || searchQuery) ? 500 : (limit + 1);
      query = query.limit(fetchLimit);

      // Note: Pagination with startAfter requires orderBy, which we avoid for filters
      // For filtered queries, we return all matching docs (up to fetchLimit)
      // Client-side pagination can be implemented in the UI if needed

      const snapshot = await query.get();
      let docs = snapshot.docs;

      // Always sort client-side to ensure consistent ordering
      // and to include documents that may lack the sort field
      if (docs.length > 1) {
        docs = [...docs].sort((a, b) => {
          const aData = a.data();
          const bData = b.data();
          let aVal = aData[sortField];
          let bVal = bData[sortField];
          
          // Handle Firestore Timestamp objects for date fields
          if (sortField === 'updatedAt' || sortField === 'createdAt') {
            // Convert to milliseconds for numeric comparison
            const aTime = aVal?.toMillis?.() ?? aVal?.getTime?.() ?? (aVal ? new Date(aVal).getTime() : 0);
            const bTime = bVal?.toMillis?.() ?? bVal?.getTime?.() ?? (bVal ? new Date(bVal).getTime() : 0);
            return sortDir === 'asc' ? aTime - bTime : bTime - aTime;
          }
          
          // String comparison for text fields
          const aStr = String(aVal || '');
          const bStr = String(bVal || '');
          
          if (sortDir === 'asc') {
            return aStr.localeCompare(bStr);
          } else {
            return bStr.localeCompare(aStr);
          }
        });
      }

      // Client-side date range filtering (LP-1.3.5)
      // Firestore doesn't allow range queries on different fields without composite indexes
      if (dateFrom || dateTo) {
        docs = docs.filter(doc => {
          const data = doc.data();
          const createdAt = data.createdAt;
          if (!createdAt) return false;
          
          // Handle both Timestamp objects and ISO strings
          const docDate = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
          
          if (dateFrom) {
            const fromDate = new Date(dateFrom);
            fromDate.setHours(0, 0, 0, 0);
            if (docDate < fromDate) return false;
          }
          
          if (dateTo) {
            const toDate = new Date(dateTo);
            toDate.setHours(23, 59, 59, 999);
            if (docDate > toDate) return false;
          }
          
          return true;
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

      // Client-side pagination: skip documents before the pageToken
      if (pageToken) {
        const tokenIndex = docs.findIndex(doc => doc.id === pageToken);
        if (tokenIndex >= 0) {
          // Skip all documents up to and including the one with this ID
          docs = docs.slice(tokenIndex + 1);
        }
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
        total = docs.length; // Use actual filtered count
      }

      // LP-1.3.5: Always include nextPageToken for consistency
      const nextPageToken = hasMore ? resultDocs[resultDocs.length - 1]?.id : undefined;

      res.status(200).json({
        items,
        hasMore,
        nextPageToken, // LP-1.3.5: renamed from pageToken for clarity
        pageToken: nextPageToken, // Keep backward compatibility
        total,
        page, // LP-1.3.5: echo back current page
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
 * LP-smart-rules-mpn-1.0.0: Retrieve a product by MPN using normalized_mpn for reliable lookups.
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
      // LP-smart-rules-mpn-1.0.0: Use canonical normalizer for reliable lookups
      const normalizedMpn = normalizeMpn(mpn);
      
      console.log(`🔍 MPN lookup: raw="${mpn}" normalized="${normalizedMpn}"`);
      
      // Primary lookup: query on core.normalized_mpn (new canonical field)
      let snapshot = await db
        .collection('products')
        .where('core.normalized_mpn', '==', normalizedMpn)
        .limit(1)
        .get();

      // Fallback 1: Try top-level normalized_mpn (for products without nested core)
      if (snapshot.empty) {
        console.log('   Fallback 1: trying top-level normalized_mpn');
        snapshot = await db
          .collection('products')
          .where('normalized_mpn', '==', normalizedMpn)
          .limit(1)
          .get();
      }

      // Fallback 2: Try legacy mpn field with uppercase match (pre-normalized data)
      if (snapshot.empty) {
        console.log('   Fallback 2: trying legacy mpn field');
        snapshot = await db
          .collection('products')
          .where('mpn', '==', normalizedMpn)
          .limit(1)
          .get();
      }
      
      // Fallback 3: Try core.mpn with uppercase match
      if (snapshot.empty) {
        console.log('   Fallback 3: trying core.mpn field');
        snapshot = await db
          .collection('products')
          .where('core.mpn', '==', normalizedMpn)
          .limit(1)
          .get();
      }

      // Fallback 4: Try original case mpn (for exact match legacy data)
      if (snapshot.empty && mpn !== normalizedMpn) {
        console.log('   Fallback 4: trying original case mpn');
        snapshot = await db
          .collection('products')
          .where('mpn', '==', mpn)
          .limit(1)
          .get();
      }

      if (snapshot.empty) {
        console.log(`   ❌ Product not found for MPN "${mpn}"`);
        res.status(404).json({ 
          error: 'PRODUCT_NOT_FOUND', 
          message: `Product with MPN '${mpn}' not found`,
          searchedNormalized: normalizedMpn,
        });
        return;
      }

      const doc = snapshot.docs[0];
      const data = doc.data();
      
      // Extract fields from nested or flat structure
      const productMpn = data.core?.mpn || data.mpn || mpn;
      const title = data.core?.title || data.name || data.title || 'Untitled Product';
      const brand = data.core?.brand || data.brand || null;
      const sku = data.core?.sku || data.sku || null;

      console.log(`   ✅ Found product: id="${doc.id}" mpn="${productMpn}"`);

      // Return minimal product view for mobile capture
      res.status(200).json({
        id: doc.id,
        productId: doc.id,
        product_mpn: productMpn,
        title,
        thumbnail: data.images?.[0]?.thumb || data.images?.[0]?.url || data.thumbnail || data.media?.primaryImage || null,
        brand,
        sku,
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
 * POST /products/:productId/suggestions
 * 
 * LP-obs-studio-cleanup-1.4.0: Generate suggestions from observations.
 * Analyzes recent observations and tags to suggest attribute values.
 * 
 * Request body:
 * - autoResolve: boolean (default false) - Auto-apply high-confidence suggestions
 * 
 * Returns:
 * - suggestions: Array of { attributeId, currentValue, suggestedValue, confidence, rationale }
 * - meta: { observationsCount, tagsCount, generatedAt }
 */
export async function generateSuggestionsHandler(req: Request, res: Response) {
  await requireAdmin(req, res, async () => {
    const productId = req.params.productId;
    const autoResolve = req.body?.autoResolve === true;
    
    if (!productId) {
      res.status(400).json({ 
        error: 'MISSING_PRODUCT_ID', 
        message: 'Product ID is required' 
      });
      return;
    }

    const db = admin.firestore();

    try {
      // Fetch product
      const productDoc = await db.collection('products').doc(productId).get();
      if (!productDoc.exists) {
        res.status(404).json({ 
          error: 'PRODUCT_NOT_FOUND', 
          message: `Product '${productId}' not found` 
        });
        return;
      }

      const productData = productDoc.data()!;
      const productMpn = productData.mpn || productId;

      // Fetch recent observations for this product (last 10)
      const obsSnapshot = await db
        .collection('observations')
        .where('product_mpn', '==', productMpn)
        .orderBy('createdAt', 'desc')
        .limit(10)
        .get();

      const observations = obsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Collect all tags from observations
      const allTags: string[] = [];
      for (const obs of observations) {
        const tags = (obs as Record<string, unknown>).tags;
        if (Array.isArray(tags)) {
          allTags.push(...tags);
        }
      }

      // Count unique tags
      const tagCounts = new Map<string, number>();
      for (const tag of allTags) {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      }

      // Generate suggestions based on tag patterns
      // This is a heuristic approach - tags often indicate missing or incorrect attributes
      const suggestions: Array<{
        id: string;
        attributeId: string;
        currentValue: unknown;
        suggestedValue: unknown;
        confidence: number;
        rationale: string;
        source: 'observation-tags';
      }> = [];

      const attributes = productData.attributes || {};
      let suggestionIndex = 0;

      // Tag-to-attribute mapping heuristics
      const tagPatterns: Array<{
        pattern: RegExp;
        attributeId: string;
        extractor: (tag: string) => unknown;
        rationale: (tag: string, count: number) => string;
      }> = [
        {
          pattern: /^color[:\-_]?(.+)$/i,
          attributeId: 'color_primary',
          extractor: (tag) => tag.replace(/^color[:\-_]?/i, '').trim(),
          rationale: (tag, count) => `Tag "${tag}" appeared ${count} time(s) in observations`,
        },
        {
          pattern: /^material[:\-_]?(.+)$/i,
          attributeId: 'material_primary',
          extractor: (tag) => tag.replace(/^material[:\-_]?/i, '').trim(),
          rationale: (tag, count) => `Tag "${tag}" appeared ${count} time(s) in observations`,
        },
        {
          pattern: /^size[:\-_]?(.+)$/i,
          attributeId: 'size_display',
          extractor: (tag) => tag.replace(/^size[:\-_]?/i, '').trim(),
          rationale: (tag, count) => `Tag "${tag}" appeared ${count} time(s) in observations`,
        },
        {
          pattern: /^style[:\-_]?(.+)$/i,
          attributeId: 'style_type',
          extractor: (tag) => tag.replace(/^style[:\-_]?/i, '').trim(),
          rationale: (tag, count) => `Tag "${tag}" appeared ${count} time(s) in observations`,
        },
        {
          pattern: /^gender[:\-_]?(.+)$/i,
          attributeId: 'gender',
          extractor: (tag) => tag.replace(/^gender[:\-_]?/i, '').trim(),
          rationale: (tag, count) => `Tag "${tag}" appeared ${count} time(s) in observations`,
        },
      ];

      for (const [tag, count] of tagCounts.entries()) {
        for (const { pattern, attributeId, extractor, rationale } of tagPatterns) {
          if (pattern.test(tag)) {
            const suggestedValue = extractor(tag);
            const currentValue = attributes[attributeId];
            
            // Only suggest if different from current value
            if (suggestedValue !== currentValue) {
              // Confidence based on tag frequency
              const confidence = Math.min(50 + count * 15, 95);
              
              suggestions.push({
                id: `obs-sug-${++suggestionIndex}`,
                attributeId,
                currentValue: currentValue ?? null,
                suggestedValue,
                confidence,
                rationale: rationale(tag, count),
                source: 'observation-tags',
              });
            }
            break; // Only match first pattern per tag
          }
        }
      }

      // Sort by confidence descending, limit to 5
      suggestions.sort((a, b) => b.confidence - a.confidence);
      const topSuggestions = suggestions.slice(0, 5);

      // Auto-resolve high-confidence suggestions if enabled
      const autoApplied: string[] = [];
      if (autoResolve) {
        const authReq = req as AuthenticatedRequest;
        const actor = authReq.auth?.uid || 'system';
        const now = new Date().toISOString();
        const updates: Record<string, unknown> = {
          updatedBy: actor,
          updatedAt: now,
        };

        for (const suggestion of topSuggestions) {
          if (suggestion.confidence >= 85) {
            updates[`attributes.${suggestion.attributeId}`] = suggestion.suggestedValue;
            autoApplied.push(suggestion.id);
          }
        }

        if (autoApplied.length > 0) {
          await productDoc.ref.update(updates);
        }
      }

      res.status(200).json({
        suggestions: topSuggestions.map(s => ({
          ...s,
          applied: autoApplied.includes(s.id),
        })),
        meta: {
          observationsCount: observations.length,
          tagsCount: allTags.length,
          uniqueTagsCount: tagCounts.size,
          autoAppliedCount: autoApplied.length,
          generatedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Error generating suggestions:', error);
      res.status(500).json({ 
        error: 'INTERNAL_ERROR', 
        message: 'Failed to generate suggestions' 
      });
    }
  });
}

/**
 * POST /products/:productId/apply-suggestion
 * 
 * LP-obs-studio-cleanup-1.4.0: Apply a specific suggestion to a product.
 * 
 * Request body:
 * - suggestionId: string
 * - attributeId: string
 * - value: unknown
 * - rationale: string (optional, for audit)
 */
export async function applySuggestionHandler(req: Request, res: Response) {
  await requireAdmin(req, res, async () => {
    const productId = req.params.productId;
    const { suggestionId, attributeId, value, rationale } = req.body || {};
    
    if (!productId) {
      res.status(400).json({ 
        error: 'MISSING_PRODUCT_ID', 
        message: 'Product ID is required' 
      });
      return;
    }

    if (!attributeId || value === undefined) {
      res.status(400).json({ 
        error: 'MISSING_FIELDS', 
        message: 'attributeId and value are required' 
      });
      return;
    }

    const db = admin.firestore();

    try {
      const productRef = db.collection('products').doc(productId);
      const productDoc = await productRef.get();
      
      if (!productDoc.exists) {
        res.status(404).json({ 
          error: 'PRODUCT_NOT_FOUND', 
          message: `Product '${productId}' not found` 
        });
        return;
      }

      const authReq = req as AuthenticatedRequest;
      const actor = authReq.auth?.uid || 'system';
      const now = new Date().toISOString();

      // Apply the suggestion
      await productRef.update({
        [`attributes.${attributeId}`]: value,
        updatedBy: actor,
        updatedAt: now,
        // Track applied suggestion in activity log
        _activityLog: admin.firestore.FieldValue.arrayUnion({
          actor,
          action: 'apply_suggestion',
          timestamp: now,
          details: {
            suggestionId,
            attributeId,
            value,
            rationale: rationale || 'User applied observation-based suggestion',
          },
        }),
      });

      // Fetch and return updated product
      const updatedDoc = await productRef.get();
      res.status(200).json({
        id: updatedDoc.id,
        ...updatedDoc.data(),
        _appliedSuggestion: {
          suggestionId,
          attributeId,
          value,
          appliedAt: now,
          appliedBy: actor,
        },
      });
    } catch (error) {
      console.error('Error applying suggestion:', error);
      res.status(500).json({ 
        error: 'INTERNAL_ERROR', 
        message: 'Failed to apply suggestion' 
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

/**
 * GET /products/:productId/completion
 * 
 * Returns product completion readiness for export gating.
 * Evaluates product against configured completion rules and returns
 * operator-visible explanation payload.
 * 
 * Response:
 * - 200: CompletionDrivenExportReadiness
 * - 400: Missing productId
 * - 404: Product not found
 * - 500: Internal error
 */
export async function getProductCompletionHandler(req: Request, res: Response) {
  try {
    const productId = req.params.productId;
    
    if (!productId) {
      res.status(400).json({ 
        error: 'MISSING_PRODUCT_ID', 
        message: 'Product ID is required' 
      });
      return;
    }

    // Fetch product from Firestore
    const db = admin.firestore();
    const productDoc = await db.collection('products').doc(productId).get();

    if (!productDoc.exists) {
      res.status(404).json({ 
        error: 'PRODUCT_NOT_FOUND', 
        message: `Product ${productId} not found` 
      });
      return;
    }

    const productData = productDoc.data();

    // Calculate completion-driven export readiness
    // LP-export-site-triage-1.0.0: Pass ProductDocument (not productId string)
    // Ensure id is included as ProductDocument requires it
    const productWithId = { id: productId, ...productData } as import('../services/exportService').ProductDocument;
    const readiness = await calculateCompletionDrivenExportReadiness(productWithId);

    // Return readiness payload
    res.status(200).json(readiness);
  } catch (error) {
    console.error('Error evaluating product completion:', error);
    res.status(500).json({ 
      error: 'INTERNAL_ERROR', 
      message: 'Failed to evaluate product completion' 
    });
  }
}
