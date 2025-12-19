/**
 * Attributes Service
 * Per AOSS Section 2.2 — Attribute Validation Schema
 * 
 * Implements CRUD operations for product attributes in Firestore.
 * Path: settings/attributes/keys/{attributeId}
 */

import * as admin from 'firebase-admin';
import { AttributeSchema, type AttributeType } from '@ropi-aoss/sdk';

// Firestore collection paths
const ATTRIBUTES_COLLECTION = 'settings/attributes/keys';

// Default pagination limit
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

/**
 * Service error with HTTP status code
 */
export class ServiceError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}

/**
 * Pagination result
 */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  pageToken?: string;
  hasMore: boolean;
}

/**
 * List attributes query options
 */
export interface ListAttributesOptions {
  limit?: number;
  pageToken?: string;
  q?: string; // Search query for label or attribute_id
}

/**
 * Get Firestore instance
 */
function getDb(): admin.firestore.Firestore {
  return admin.firestore();
}

/**
 * Convert Zod-validated attribute to Firestore payload
 */
function toFirestorePayload(
  attribute: AttributeType,
  actor: string,
  isCreate: boolean
): Record<string, unknown> {
  const now = new Date().toISOString();
  const payload: Record<string, unknown> = { ...attribute };
  
  if (isCreate) {
    payload.createdBy = actor;
    payload.createdAt = now;
  }
  payload.updatedBy = actor;
  payload.updatedAt = now;
  
  return payload;
}

/**
 * Convert Firestore document to AttributeType
 * Normalizes legacy field names (camelCase) to canonical (snake_case)
 * and applies schema defaults via Zod validation.
 * 
 * PVS-0.2.2: Fix blank-on-load by normalizing on GET
 */
function fromFirestore(doc: admin.firestore.DocumentSnapshot): AttributeType | null {
  if (!doc.exists) return null;
  const data = doc.data();
  if (!data) return null;
  
  // Normalize legacy field names to canonical schema
  const normalized: Record<string, unknown> = {
    attribute_id: doc.id,
    // Core fields - normalize camelCase to snake_case
    label: data.label,
    data_type: data.data_type || data.dataType || 'string',
    status: data.status || 'active',
    category: data.category,
    // Array fields
    allowed_values: data.allowed_values || data.allowedValues,
    synonyms: data.synonyms,
    // Boolean flags with defaults
    required_for_completion: data.required_for_completion ?? false,
    required_for_export: data.required_for_export ?? data.export ?? false,
    import_required: data.import_required ?? data.required ?? false,
    // String fields
    external_header: data.external_header || (Array.isArray(data.importerColumns) && data.importerColumns[0]) || undefined,
    ai_usage_notes: data.ai_usage_notes || data.description,
    source: data.source,
    // Timestamps
    createdBy: data.createdBy,
    createdAt: data.createdAt,
    updatedBy: data.updatedBy,
    updatedAt: data.updatedAt,
  };
  
  // Remove undefined values
  Object.keys(normalized).forEach(key => {
    if (normalized[key] === undefined) {
      delete normalized[key];
    }
  });
  
  // Validate and apply defaults via Zod schema
  const result = AttributeSchema.safeParse(normalized);
  if (result.success) {
    return result.data;
  }
  
  // If validation fails, return with minimal normalization
  // (keeps backward compatibility for edge cases)
  console.warn(`Attribute ${doc.id} failed schema validation:`, result.error.errors);
  return {
    attribute_id: doc.id,
    label: data.label || doc.id,
    data_type: (data.data_type || data.dataType || 'string') as AttributeType['data_type'],
    status: (data.status || 'active') as AttributeType['status'],
    ...data,
  } as AttributeType;
}

/**
 * List attributes with optional search and pagination
 */
export async function listAttributes(
  options: ListAttributesOptions = {}
): Promise<PaginatedResult<AttributeType>> {
  const db = getDb();
  const limit = Math.min(options.limit || DEFAULT_LIMIT, MAX_LIMIT);
  
  let query: admin.firestore.Query = db.collection(ATTRIBUTES_COLLECTION)
    .orderBy('label')
    .limit(limit + 1); // Fetch one extra to detect hasMore
  
  // Apply pagination token (last document ID)
  if (options.pageToken) {
    const lastDoc = await db.collection(ATTRIBUTES_COLLECTION).doc(options.pageToken).get();
    if (lastDoc.exists) {
      query = query.startAfter(lastDoc);
    }
  }
  
  const snapshot = await query.get();
  const docs = snapshot.docs;
  
  // Determine if there are more results
  const hasMore = docs.length > limit;
  const resultDocs = hasMore ? docs.slice(0, limit) : docs;
  
  let items = resultDocs
    .map(doc => fromFirestore(doc))
    .filter((item): item is AttributeType => item !== null);
  
  // Apply client-side search filter if query provided
  // Note: For production, consider using a search service like Algolia or Elastic
  if (options.q) {
    const searchTerm = options.q.toLowerCase();
    items = items.filter(attr =>
      (attr.label || '').toLowerCase().includes(searchTerm) ||
      (attr.attribute_id || '').toLowerCase().includes(searchTerm)
    );
  }
  
  // Get total count (for small collections; optimize for large ones)
  const totalSnapshot = await db.collection(ATTRIBUTES_COLLECTION).count().get();
  const total = totalSnapshot.data().count;
  
  return {
    items,
    total,
    pageToken: hasMore ? resultDocs[resultDocs.length - 1]?.id : undefined,
    hasMore,
  };
}

/**
 * Get a single attribute by ID
 */
export async function getAttribute(attributeId: string): Promise<AttributeType> {
  const db = getDb();
  const doc = await db.collection(ATTRIBUTES_COLLECTION).doc(attributeId).get();
  
  const attribute = fromFirestore(doc);
  if (!attribute) {
    throw new ServiceError(
      `Attribute '${attributeId}' not found`,
      404,
      'ATTRIBUTE_NOT_FOUND'
    );
  }
  
  return attribute;
}

/**
 * Create a new attribute
 * Uses Firestore create() to ensure uniqueness (fails if doc exists)
 */
export async function createAttribute(
  attribute: AttributeType,
  actor: string
): Promise<AttributeType> {
  const db = getDb();
  const attributeId = attribute.attribute_id;
  if (!attributeId) {
    throw new ServiceError('attribute_id is required', 400, 'INVALID_REQUEST');
  }
  const docRef = db.collection(ATTRIBUTES_COLLECTION).doc(attributeId);
  
  const payload = toFirestorePayload(attribute, actor, true);
  
  try {
    // Use create() which fails if document already exists
    await docRef.create(payload);
  } catch (error: unknown) {
    // Check if it's a duplicate error
    if (error instanceof Error && error.message.includes('already exists')) {
      throw new ServiceError(
        `Attribute '${attribute.attribute_id}' already exists`,
        409,
        'ATTRIBUTE_EXISTS'
      );
    }
    throw error;
  }
  
  // Return the created attribute
  return {
    ...attribute,
    createdBy: payload.createdBy as string,
    createdAt: payload.createdAt as string,
    updatedBy: payload.updatedBy as string,
    updatedAt: payload.updatedAt as string,
  };
}

/**
 * Update an existing attribute
 */
export async function updateAttribute(
  attributeId: string,
  patch: Partial<AttributeType>,
  actor: string
): Promise<AttributeType> {
  const db = getDb();
  const docRef = db.collection(ATTRIBUTES_COLLECTION).doc(attributeId);
  
  // Check if document exists
  const existing = await docRef.get();
  if (!existing.exists) {
    throw new ServiceError(
      `Attribute '${attributeId}' not found`,
      404,
      'ATTRIBUTE_NOT_FOUND'
    );
  }
  
  // Prevent changing attribute_id
  const { attribute_id: _, ...patchWithoutId } = patch;
  
  const now = new Date().toISOString();
  const updatePayload = {
    ...patchWithoutId,
    updatedBy: actor,
    updatedAt: now,
  };
  
  await docRef.update(updatePayload);
  
  // Fetch and return updated document
  const updatedDoc = await docRef.get();
  const result = fromFirestore(updatedDoc);
  if (!result) {
    throw new ServiceError('Failed to retrieve updated attribute', 500, 'INTERNAL_ERROR');
  }
  
  return result;
}

/**
 * Delete an attribute
 */
export async function deleteAttribute(attributeId: string): Promise<void> {
  const db = getDb();
  const docRef = db.collection(ATTRIBUTES_COLLECTION).doc(attributeId);
  
  // Check if document exists
  const existing = await docRef.get();
  if (!existing.exists) {
    throw new ServiceError(
      `Attribute '${attributeId}' not found`,
      404,
      'ATTRIBUTE_NOT_FOUND'
    );
  }
  
  await docRef.delete();
}

/**
 * Get usage information for an attribute
 * Returns count of products using the attribute and sample products
 */
export async function getAttributeUsage(attributeId: string, sampleLimit = 10) {
  const db = getDb();
  
  // Sample products where attributes.<attributeId> exists and is not null
  const sampleQuery = db.collection('products').where(`attributes.${attributeId}`, '!=', null).limit(sampleLimit);
  const sampleSnap = await sampleQuery.get();
  const samples = sampleSnap.docs.map(d => ({
    id: d.id,
    sku: (d.data() as any).sku || null,
    value: (d.data() as any).attributes ? ((d.data() as any).attributes[attributeId]) : null,
  }));
  
  // Get count (use aggregation/count if available)
  let count = 0;
  try {
    const countSnap = await db.collection('products').where(`attributes.${attributeId}`, '!=', null).count().get();
    count = countSnap.data().count;
  } catch (e) {
    // Fallback: retrieve size (for small staging volumes)
    const fullSnap = await db.collection('products').where(`attributes.${attributeId}`, '!=', null).get();
    count = fullSnap.size;
  }
  
  return { count, samples };
}

/**
 * Validate attribute data using Zod schema
 * Returns validation result with parsed data or error details
 */
export function validateAttributeData(data: unknown): {
  success: boolean;
  data?: AttributeType;
  errors?: Array<{ path: string; message: string }>;
} {
  const result = AttributeSchema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  return {
    success: false,
    errors: result.error.errors.map(err => ({
      path: err.path.join('.'),
      message: err.message,
    })),
  };
}
