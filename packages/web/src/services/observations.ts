/**
 * Observations Service for ROPI AOSS
 * 
 * Handles CRUD operations for observations with Firestore backend
 * and localStorage fallback when Firebase is unavailable.
 * 
 * LP-1.0.1: Added support for structured fieldLink objects.
 * Server-side validation via validateFieldLink() ensures canonical keys.
 * 
 * LP-1.1.15: Cleaned up debug logging, improved error handling.
 * 
 * Related Notion docs:
 * - Workflow W1 — Observations: https://www.notion.so/2b845ee1ec5a81b5a4a6d3ea439ec277
 * - Observations Overview: https://www.notion.so/2b845ee1ec5a81e1aeeae43318b38039
 * - Product Completion Workflows: https://www.notion.so/2ba45ee1ec5a80698690f9492961ed8b
 * 
 * TODO: Configure Firebase Storage for production image uploads
 * TODO: Implement proper security rules before production deploy
 * TODO: Add retry logic for failed Firestore operations
 */

import {
  collection,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
  onSnapshot,
  Timestamp,
  getDocs,
  Unsubscribe,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, isFirebaseAvailable, isStorageAvailable } from '../firebaseConfig';
import { Observation, CreateObservationInput, ObservationCreator } from '../types/observation';
import type { FieldLink } from '../types/fieldLink';
import attributeRegistry from '@/../../sdk/config/attributeRegistry.json';

const COLLECTION_NAME = 'observations';
const STORAGE_KEY_PREFIX = 'aoss:observations:';

// Valid top-level product fields
const VALID_PRODUCT_FIELDS = ['mpn', 'sku', 'title', 'name', 'brand', 'category', 'department', 'status', 'style_id'];

// Get valid attribute IDs from registry
const validAttributeIds = new Set(
  (attributeRegistry as { attributes: Array<{ attribute_id: string }> }).attributes.map(
    (attr) => attr.attribute_id
  )
);

/**
 * Validates a fieldLink object against the attribute registry and product fields.
 * 
 * LP-1.0.1: Server-side validation for canonical field links.
 * Returns an error object if invalid, null if valid.
 */
export function validateFieldLink(
  fieldLink: FieldLink | null | undefined,
  _productMpn?: string
): { valid: boolean; error?: string } {
  // Null/undefined fieldLink is allowed (optional field)
  if (!fieldLink) {
    return { valid: true };
  }

  // Validate type
  if (!['product', 'attribute'].includes(fieldLink.type)) {
    return {
      valid: false,
      error: `Invalid fieldLink type: ${fieldLink.type}. Must be 'product' or 'attribute'.`,
    };
  }

  // Validate key format
  if (!fieldLink.key || typeof fieldLink.key !== 'string') {
    return {
      valid: false,
      error: 'fieldLink.key is required and must be a string.',
    };
  }

  if (fieldLink.type === 'product') {
    // Validate product field
    const key = fieldLink.key.replace(/^product\./, '').toLowerCase();
    if (!VALID_PRODUCT_FIELDS.includes(key)) {
      return {
        valid: false,
        error: `Invalid product field: ${key}. Valid fields: ${VALID_PRODUCT_FIELDS.join(', ')}.`,
      };
    }
  } else if (fieldLink.type === 'attribute') {
    // Validate attribute field against registry
    const key = fieldLink.key.replace(/^attributes\./, '').toLowerCase();
    if (!validAttributeIds.has(key)) {
      return {
        valid: false,
        error: `Invalid attribute: ${key}. Not found in attribute registry.`,
      };
    }
  }

  return { valid: true };
}

/**
 * Convert Firestore document to Observation object
 */
function firestoreToObservation(id: string, data: any): Observation {
  return {
    id,
    productId: data.productId,
    title: data.title,
    body: data.body,
    severity: data.severity,
    status: data.status,
    linkedField: data.linkedField || null,
    fieldLink: data.fieldLink || null,
    images: data.images || [],
    createdBy: data.createdBy,
    createdAt: data.createdAt?.toDate() || new Date(),
    resolvedBy: data.resolvedBy || null,
    resolvedAt: data.resolvedAt?.toDate() || null,
  };
}

/**
 * Convert Observation to Firestore document format
 */
function observationToFirestore(obs: Partial<Observation>) {
  const data: any = { ...obs };
  
  // Convert Date objects to Firestore Timestamps
  if (data.createdAt instanceof Date) {
    data.createdAt = Timestamp.fromDate(data.createdAt);
  }
  if (data.resolvedAt instanceof Date) {
    data.resolvedAt = Timestamp.fromDate(data.resolvedAt);
  }
  
  // Remove id field as it's stored separately
  delete data.id;
  
  return data;
}

/**
 * Get localStorage key for a product's observations
 */
function getLocalStorageKey(productId: string): string {
  return `${STORAGE_KEY_PREFIX}${productId}`;
}

/**
 * Load observations from localStorage
 */
function loadFromLocalStorage(productId: string): Observation[] {
  try {
    const key = getLocalStorageKey(productId);
    const data = localStorage.getItem(key);
    if (!data) return [];
    
    const observations = JSON.parse(data);
    // Convert date strings back to Date objects and sort by creation date (newest first)
    const parsed = observations.map((obs: any) => ({
      ...obs,
      createdAt: new Date(obs.createdAt),
      resolvedAt: obs.resolvedAt ? new Date(obs.resolvedAt) : null,
    }));
    
    // Sort by creation date (newest first)
    parsed.sort((a: Observation, b: Observation) => b.createdAt.getTime() - a.createdAt.getTime());
    
    return parsed;
  } catch (error) {
    console.error('Failed to load observations from localStorage:', error);
    return [];
  }
}

/**
 * Save observations to localStorage
 */
function saveToLocalStorage(productId: string, observations: Observation[]): void {
  try {
    const key = getLocalStorageKey(productId);
    localStorage.setItem(key, JSON.stringify(observations));
  } catch (error) {
    console.error('Failed to save observations to localStorage:', error);
  }
}

/**
 * Upload image file to Firebase Storage
 * Returns storage path if successful, or data URL as fallback
 * 
 * TODO: Implement proper security rules for storage uploads
 * TODO: Add image compression/resizing before upload
 * TODO: Generate thumbnails for large images
 */
export async function uploadImage(
  productId: string,
  file: File
): Promise<string> {
  if (isStorageAvailable() && storage) {
    try {
      // Generate unique filename with timestamp
      const timestamp = Date.now();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const storagePath = `observations/${productId}/${timestamp}_${sanitizedName}`;
      
      // Upload to Firebase Storage
      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, file);
      
      // Get public URL
      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL;
    } catch (error) {
      console.error('Failed to upload image to Storage:', error);
      console.warn('Falling back to data URL for image');
    }
  }
  
  // Fallback: Convert to data URL
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * List all observations for a product
 * Uses Firestore if available, otherwise localStorage
 */
export async function listObservations(productId: string): Promise<Observation[]> {
  console.log('[DEBUG listObservations] Querying for productId:', productId);
  
  if (isFirebaseAvailable() && db) {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('productId', '==', productId)
      );
      
      const querySnapshot = await getDocs(q);
      const observations: Observation[] = [];
      
      console.log('[DEBUG listObservations] Found', querySnapshot.size, 'observations for productId:', productId);
      
      querySnapshot.forEach((doc) => {
        observations.push(firestoreToObservation(doc.id, doc.data()));
      });
      
      // Sort by creation date (newest first)
      observations.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      
      return observations;
    } catch (error) {
      console.error('Failed to load observations from Firestore:', error);
      // Fall back to localStorage silently
    }
  }
  
  // Fallback to localStorage
  return loadFromLocalStorage(productId);
}

/**
 * Add a new observation
 * Uploads images if provided, then creates Firestore document
 * Falls back to localStorage if Firestore unavailable
 * 
 * LP-1.0.1: Validates fieldLink before persisting. Returns 400-equivalent
 * error if fieldLink is invalid.
 */
export async function addObservation(
  input: CreateObservationInput,
  imageFiles?: File[]
): Promise<Observation> {
  // LP-1.0.1: Validate fieldLink if provided
  if (input.fieldLink) {
    const validation = validateFieldLink(input.fieldLink);
    if (!validation.valid) {
      throw new Error(`Invalid fieldLink: ${validation.error}`);
    }
  }
  
  // Upload images if provided
  let imagePaths: string[] = [];
  if (imageFiles && imageFiles.length > 0) {
    imagePaths = await Promise.all(
      imageFiles.map((file) => uploadImage(input.productId, file))
    );
  }
  
  const newObservation: Omit<Observation, 'id'> = {
    ...input,
    status: 'open',
    images: input.images || imagePaths,
    createdAt: new Date(),
    resolvedBy: null,
    resolvedAt: null,
  };
  
  if (isFirebaseAvailable() && db) {
    try {
      // DEBUG: Log before Firestore write
      console.log('[DEBUG addObservation] About to write to Firestore:', {
        productId: input.productId,
        title: input.title,
        status: newObservation.status,
        createdById: input.createdBy?.uid,
      });
      
      const docRef = await addDoc(
        collection(db, COLLECTION_NAME),
        observationToFirestore(newObservation)
      );
      
      console.log('[DEBUG addObservation] Successfully created observation:', docRef.id);
      
      return {
        ...newObservation,
        id: docRef.id,
      };
    } catch (error) {
      console.error('Failed to add observation to Firestore:', error);
      // Fall back to localStorage silently
    }
  }
  
  // Fallback to localStorage
  const id = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const observation: Observation = { ...newObservation, id };
  
  const existing = loadFromLocalStorage(input.productId);
  saveToLocalStorage(input.productId, [...existing, observation]);
  
  return observation;
}

/**
 * Resolve an observation
 * Updates status to 'resolved' and records who resolved it
 */
export async function resolveObservation(
  observationId: string,
  productId: string,
  resolvedBy: ObservationCreator
): Promise<void> {
  const resolvedAt = new Date();
  
  if (isFirebaseAvailable() && db && !observationId.startsWith('local_')) {
    try {
      const docRef = doc(db, COLLECTION_NAME, observationId);
      await updateDoc(docRef, {
        status: 'resolved',
        resolvedBy,
        resolvedAt: Timestamp.fromDate(resolvedAt),
      });
      return;
    } catch (error) {
      console.error('Failed to resolve observation in Firestore:', error);
      // Fall back to localStorage silently
    }
  }
  
  // Fallback to localStorage
  const observations = loadFromLocalStorage(productId);
  const updated = observations.map((obs) =>
    obs.id === observationId
      ? { ...obs, status: 'resolved' as const, resolvedBy, resolvedAt }
      : obs
  );
  saveToLocalStorage(productId, updated);
}

/**
 * Listen to real-time updates for observations
 * Returns unsubscribe function
 * If Firestore unavailable, returns a no-op unsubscribe
 */
export function listenToObservations(
  productId: string,
  onUpdate: (observations: Observation[]) => void
): Unsubscribe {
  if (isFirebaseAvailable() && db) {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('productId', '==', productId)
      );
      
      return onSnapshot(
        q,
        (querySnapshot) => {
          const observations: Observation[] = [];
          querySnapshot.forEach((doc) => {
            observations.push(firestoreToObservation(doc.id, doc.data()));
          });
          
          // Sort by creation date (newest first)
          observations.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
          
          onUpdate(observations);
        },
        (error) => {
          console.error('Error listening to observations:', error);
        }
      );
    } catch (error) {
      console.error('Failed to set up observations listener:', error);
    }
  }
  
  // Fallback: Load once from localStorage and return no-op unsubscribe
  const observations = loadFromLocalStorage(productId);
  onUpdate(observations);
  return () => {}; // No-op unsubscribe
}

/**
 * Product observation structure (SRoT on product document)
 * LP-observations-consolidation-1.0.0: Canonical source of truth for product-scoped observations
 * LP-observations-consolidation-1.1.0: Added for mobile/desktop parity hydration
 */
export interface ProductObservation {
  tags: string[];
  images: string[];
  updatedAt: string | null;
  updatedBy: string | null;
  source?: string;
}

/**
 * Listen to real-time updates for product-level observation (SRoT)
 * LP-observations-consolidation-1.0.0: Subscribes to product.observation field
 * LP-observations-consolidation-1.1.0: Used by mobile capture for rehydration on product select
 * 
 * This is the canonical listener for product-scoped observation data.
 * UIs should use this instead of listenToObservations() for product-specific displays.
 * 
 * @param productId - The product document ID
 * @param onUpdate - Callback when observation data changes
 * @returns Unsubscribe function
 */
export function listenToProductObservation(
  productId: string,
  onUpdate: (observation: ProductObservation) => void
): Unsubscribe {
  const emptyObservation: ProductObservation = {
    tags: [],
    images: [],
    updatedAt: null,
    updatedBy: null,
  };

  if (isFirebaseAvailable() && db) {
    try {
      const productRef = doc(db, 'products', productId);
      
      return onSnapshot(
        productRef,
        (docSnapshot) => {
          if (!docSnapshot.exists()) {
            onUpdate(emptyObservation);
            return;
          }

          const data = docSnapshot.data();
          const observation = data?.observation || emptyObservation;
          
          onUpdate({
            tags: observation.tags || [],
            images: observation.images || [],
            updatedAt: observation.updatedAt || null,
            updatedBy: observation.updatedBy || null,
            source: observation.source,
          });
        },
        (error) => {
          console.error('Error listening to product observation:', error);
          onUpdate(emptyObservation);
        }
      );
    } catch (error) {
      console.error('Failed to set up product observation listener:', error);
    }
  }
  
  // Fallback: Return empty observation and no-op unsubscribe
  onUpdate(emptyObservation);
  return () => {};
}

/**
 * Sync local observations to Firestore
 * Used when connectivity is restored
 * 
 * TODO: Implement conflict resolution strategy
 * TODO: Add progress callback for UI feedback
 */
export async function syncLocalToFirestore(productId: string): Promise<{
  success: number;
  failed: number;
}> {
  if (!isFirebaseAvailable() || !db) {
    throw new Error('Firestore not available');
  }
  
  const localObservations = loadFromLocalStorage(productId);
  const localOnly = localObservations.filter((obs) => obs.id.startsWith('local_'));
  
  let success = 0;
  let failed = 0;
  
  for (const obs of localOnly) {
    try {
      const docRef = await addDoc(
        collection(db, COLLECTION_NAME),
        observationToFirestore(obs)
      );
      
      // Update local storage to use Firestore ID
      const updated = localObservations.map((o) =>
        o.id === obs.id ? { ...o, id: docRef.id } : o
      );
      saveToLocalStorage(productId, updated);
      
      success++;
    } catch (error) {
      console.error('Failed to sync observation:', obs.id, error);
      failed++;
    }
  }
  
  return { success, failed };
}
