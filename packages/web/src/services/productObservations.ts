/**
 * Product Observations Service
 * 
 * LP-observations-consolidation-1.4.0: Read observations from product.observation (SRoT).
 * 
 * This service provides functions to fetch and aggregate observations
 * from product documents rather than the legacy observations collection.
 * 
 * Data source: products/:productId.observation
 * 
 * References:
 * - LP-observations-consolidation-1.4.0: Migration to product.observation
 * - LP-obs-studio-cleanup-1.6.6: Product observation endpoint
 */

import {
  collection,
  getDocs,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db, isFirebaseAvailable } from '../firebaseConfig';

// ============================================
// Types
// ============================================

export interface ProductObservation {
  productId: string;
  mpn?: string;
  title?: string;
  tags: string[];
  images: string[];
  updatedAt: string;
  updatedBy: string;
  source: string;
}

export interface ObservationSummary {
  totalProducts: number;
  totalTags: number;
  uniqueTags: string[];
  products: ProductObservation[];
}

// ============================================
// Service Functions
// ============================================

/**
 * List all products with observations
 * 
 * LP-observations-consolidation-1.4.0: Uses product.observation field
 * instead of legacy observations collection.
 * 
 * @param maxProducts - Maximum number of products to fetch (default: 100)
 * @returns Promise<ProductObservation[]>
 */
export async function listProductObservations(maxProducts = 100): Promise<ProductObservation[]> {
  if (!isFirebaseAvailable() || !db) {
    console.warn('Firestore not available - returning empty observations');
    return [];
  }

  try {
    // LP-observations-consolidation-1.4.0: Use simple query + in-memory filter
    // to avoid composite index requirements on observation.* fields
    const snapshot = await getDocs(collection(db, 'products'));
    const observations: ProductObservation[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      const obs = data.observation;
      
      if (obs && obs.tags && obs.tags.length > 0) {
        observations.push({
          productId: doc.id,
          mpn: data.mpn,
          title: data.name || data.title,
          tags: obs.tags || [],
          images: obs.images || [],
          updatedAt: obs.updatedAt || data.updatedAt,
          updatedBy: obs.updatedBy || 'unknown',
          source: obs.source || 'unknown',
        });
      }
    });

    // Sort by updatedAt descending (newest first)
    observations.sort((a, b) => {
      const timeA = new Date(a.updatedAt).getTime() || 0;
      const timeB = new Date(b.updatedAt).getTime() || 0;
      return timeB - timeA;
    });

    // Apply limit
    return observations.slice(0, maxProducts);
  } catch (error) {
    console.error('Error fetching product observations:', error);
    throw error;
  }
}

/**
 * Get observation summary (aggregate stats)
 * 
 * @returns Promise<ObservationSummary>
 */
export async function getObservationSummary(): Promise<ObservationSummary> {
  const products = await listProductObservations(500);
  
  const allTags: string[] = [];
  products.forEach(p => {
    allTags.push(...p.tags);
  });
  
  const uniqueTags = [...new Set(allTags)].sort();
  
  return {
    totalProducts: products.length,
    totalTags: allTags.length,
    uniqueTags,
    products,
  };
}

/**
 * Get observation for a specific product
 * 
 * @param productId - Product ID to fetch observation for
 * @returns Promise<ProductObservation | null>
 */
export async function getProductObservation(productId: string): Promise<ProductObservation | null> {
  if (!isFirebaseAvailable() || !db) {
    console.warn('Firestore not available');
    return null;
  }

  try {
    const { doc, getDoc } = await import('firebase/firestore');
    const productRef = doc(db, 'products', productId);
    const productDoc = await getDoc(productRef);

    if (!productDoc.exists()) {
      return null;
    }

    const data = productDoc.data();
    const obs = data.observation;

    if (!obs || !obs.tags || obs.tags.length === 0) {
      return null;
    }

    return {
      productId,
      mpn: data.mpn,
      title: data.name || data.title,
      tags: obs.tags || [],
      images: obs.images || [],
      updatedAt: obs.updatedAt || data.updatedAt,
      updatedBy: obs.updatedBy || 'unknown',
      source: obs.source || 'unknown',
    };
  } catch (error) {
    console.error('Error fetching product observation:', error);
    throw error;
  }
}

/**
 * Search observations by tag
 * 
 * @param searchTag - Tag to search for (case-insensitive partial match)
 * @returns Promise<ProductObservation[]>
 */
export async function searchObservationsByTag(searchTag: string): Promise<ProductObservation[]> {
  const allObs = await listProductObservations(500);
  const lowerSearch = searchTag.toLowerCase();
  
  return allObs.filter(obs => 
    obs.tags.some(tag => tag.toLowerCase().includes(lowerSearch))
  );
}

/**
 * Listen to real-time updates for product observations
 * 
 * Note: This uses a broad query which may have performance implications
 * at scale. Consider using a denormalized observations_index collection
 * for production.
 * 
 * @param onUpdate - Callback when observations change
 * @returns Unsubscribe function
 */
export function listenToProductObservations(
  onUpdate: (observations: ProductObservation[]) => void
): Unsubscribe {
  if (!isFirebaseAvailable() || !db) {
    console.warn('Firestore not available');
    return () => {};
  }

  try {
    // LP-observations-consolidation-1.4.0: Use simple collection listener
    // and filter in memory to avoid composite index requirements
    const productsRef = collection(db, 'products');

    return onSnapshot(
      productsRef,
      (snapshot) => {
        const observations: ProductObservation[] = [];
        
        snapshot.forEach((doc) => {
          const data = doc.data();
          const obs = data.observation;
          
          if (obs && obs.tags && obs.tags.length > 0) {
            observations.push({
              productId: doc.id,
              mpn: data.mpn,
              title: data.name || data.title,
              tags: obs.tags || [],
              images: obs.images || [],
              updatedAt: obs.updatedAt || data.updatedAt,
              updatedBy: obs.updatedBy || 'unknown',
              source: obs.source || 'unknown',
            });
          }
        });
        
        // Sort by updatedAt descending
        observations.sort((a, b) => {
          const timeA = new Date(a.updatedAt).getTime() || 0;
          const timeB = new Date(b.updatedAt).getTime() || 0;
          return timeB - timeA;
        });
        
        onUpdate(observations.slice(0, 100));
      },
      (error) => {
        console.error('Error listening to product observations:', error);
      }
    );
  } catch (error) {
    console.error('Failed to set up product observations listener:', error);
    return () => {};
  }
}

/**
 * Check if using product.observation (new SRoT) vs legacy collection
 * 
 * LP-observations-consolidation-1.4.0: Feature flag for migration
 */
export function useProductObservationSRoT(): boolean {
  // Check for environment variable or feature flag
  // For now, default to true (use new SRoT)
  return true;
}
