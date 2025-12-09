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
 */
function fromFirestore(doc: admin.firestore.DocumentSnapshot): AttributeType | null {
  if (!doc.exists) return null;
  const data = doc.data();
  if (!data) return null;
  
  return {
    attribute_id: doc.id,
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
