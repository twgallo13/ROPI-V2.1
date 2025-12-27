import { useState, useEffect, useRef } from 'react';
import type { Product, Observation, NewObservation } from '../types/product';
import { isFirebaseAvailable, db } from '../firebaseConfig';
import {
  doc,
  updateDoc,
  setDoc,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import mockProductData from '../data/mock-product.json';

/**
 * Registry attribute keys for compatibility mapping.
 * These are the canonical attribute keys from attributeRegistry.json.
 * Used to merge top-level product fields into product.attributes.
 */
const REGISTRY_ATTRIBUTE_KEYS = [
  'gender', 'age_group', 'ageGroup',
  'primary_color', 'primaryColor', 'secondary_color', 'secondaryColor',
  'material', 'materials',
  'pattern', 'style', 'occasion', 'season',
  'heel_height', 'heel_type', 'toe_style', 'closure_type',
  'width', 'waterproof', 'sustainable',
  'country_of_origin', 'care_instructions',
  'features', 'gtin', 'mpn', 'weight',
  'launch_date', 'end_of_life_date',
  // Additional common top-level keys from imported products
  'category', 'brand', 'department', 'class', 'fit',
];

/**
 * Merge top-level registry attribute keys into product.attributes
 * for backward compatibility with existing product schema.
 * 
 * Products imported from RetailOps store attributes at the top level,
 * but ProductAttributesTab expects them in product.attributes.
 */
function mergeTopLevelAttributesToAttributesMap(docData: Record<string, unknown>): Record<string, unknown> {
  const attributesMap: Record<string, unknown> = 
    (docData.attributes && typeof docData.attributes === 'object')
      ? { ...docData.attributes as Record<string, unknown> }
      : {};

  for (const key of REGISTRY_ATTRIBUTE_KEYS) {
    // Skip if already in attributes map or top-level value is undefined/null
    if (attributesMap[key] !== undefined || docData[key] === undefined || docData[key] === null) {
      continue;
    }
    attributesMap[key] = docData[key];
  }

  return attributesMap;
}

/**
 * useProduct Hook
 * 
 * Manages product data with Firestore persistence (when available) 
 * and localStorage fallback for offline development.
 * 
 * Lisa v1.0.0
 * 
 * Reference: Product Completion Workflows (W2)
 * https://www.notion.so/2ba45ee1ec5a80698690f9492961ed8b
 */
export function useProduct(productId: string) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  
  // LP-0.1.x: Track pending optimistic updates to prevent snapshot overwrite race
  // Using ref instead of state to avoid stale closure in onSnapshot callback
  const pendingUpdateRef = useRef<number | null>(null);

  // Load product data from Firestore or localStorage fallback
  useEffect(() => {
    if (!productId) {
      setProduct(null);
      setLoading(false);
      return;
    }

    let unsub: Unsubscribe | undefined;

    const loadProduct = async () => {
      console.debug(`[useProduct] Loading product ${productId}, Firebase available:`, isFirebaseAvailable());
      
      if (isFirebaseAvailable() && db) {
        try {
          const ref = doc(db, 'products', productId);
          console.debug(`[useProduct] Setting up Firestore listener for product ${productId}...`);
          
          // Use real-time listener for live updates
          unsub = onSnapshot(ref, (snap) => {
            // Debug: Log snapshot status
            console.debug(`[useProduct] Firestore snapshot for product ${productId}: exists=${snap.exists()}, pendingUpdate=`, pendingUpdateRef.current);
            
            // LP-0.1.x: Skip snapshot if there's a recent optimistic update (race prevention)
            // Allow snapshot after 2 seconds (enough time for write to propagate)
            if (pendingUpdateRef.current && Date.now() - pendingUpdateRef.current < 2000) {
              console.debug(`[useProduct] Skipping snapshot - optimistic update in flight (${Date.now() - pendingUpdateRef.current}ms ago)`);
              setLoading(false);
              return;
            }
            
            if (snap.exists()) {
              const docData = snap.data();
              console.debug(`[useProduct] Product data received, keys:`, Object.keys(docData).slice(0, 10));
              
              // Merge top-level attribute keys into attributes map for compatibility
              const mergedAttributes = mergeTopLevelAttributesToAttributesMap(docData);
              const productWithMergedAttrs = {
                id: snap.id,
                ...docData,
                attributes: mergedAttributes,
              } as Product;
              setProduct(productWithMergedAttrs);
            } else {
              // Fall back to mock data if product not found
              console.warn(`[useProduct] Product ${productId} not found in Firestore, using mock data`);
              setProduct(mockProductData as Product);
            }
            setLoading(false);
          }, (error) => {
            console.error('Firestore snapshot error:', error);
            // Fall back to localStorage on error
            loadFromLocalStorage();
          });
        } catch (error) {
          console.error('Failed to set up Firestore listener:', error);
          loadFromLocalStorage();
        }
      } else {
        loadFromLocalStorage();
      }
    };

    const loadFromLocalStorage = () => {
      try {
        const stored = localStorage.getItem(`aoss:product:${productId}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          // LP-0.1.1: Sanitize websites array to prevent ghost values
          if (Array.isArray(parsed.websites)) {
            parsed.websites = Array.from(new Set(
              parsed.websites
                .map((w: unknown) => (typeof w === 'string' ? w.trim() : w))
                .filter(Boolean)
            ));
          }
          // Audit marker for debugging — not persisted to Firestore
          parsed.__source = 'localStorage';
          console.warn(`[useProduct] Using localStorage fallback for ${productId} — sanitized websites:`, parsed.websites);
          setProduct(parsed as Product);
        } else {
          setProduct(mockProductData as Product);
        }
      } catch (error) {
        console.error('Error loading product from localStorage:', error);
        setProduct(mockProductData as Product);
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
    
    return () => {
      if (unsub) {
        unsub();
      }
    };
  }, [productId]);

  // Save product to Firestore or localStorage
  const saveProduct = async (updatedProduct: Product): Promise<boolean> => {
    try {
      if (isFirebaseAvailable() && db) {
        const ref = doc(db, 'products', updatedProduct.id);
        await setDoc(ref, updatedProduct, { merge: true });
      } else {
        localStorage.setItem(`aoss:product:${updatedProduct.id}`, JSON.stringify(updatedProduct));
      }
      setProduct(updatedProduct);
      return true;
    } catch (error) {
      console.error('Error saving product:', error);
      return false;
    }
  };

  // Update a single field in the product document
  const updateField = async (path: string, value: unknown): Promise<boolean> => {
    if (!product) return false;

    // Create a local copy with the updated value for immediate UI update
    const updatedProduct = JSON.parse(JSON.stringify(product));
    const keys = path.split('.');
    let current: Record<string, unknown> = updatedProduct;

    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]] as Record<string, unknown>;
    }
    current[keys[keys.length - 1]] = value;

    // Recalculate export readiness
    const newReadiness = calculateExportReadiness(updatedProduct);
    updatedProduct.exportReadiness = newReadiness;

    // OPTIMISTIC UPDATE: show immediate change then persist; rollback on failure
    const prevProduct = product;
    try {
      // optimistic UI update
      setProduct(updatedProduct);

      if (isFirebaseAvailable() && db) {
        const ref = doc(db, 'products', product.id);
        // Firestore accepts nested paths as keys: updateDoc(ref, { 'attributes.color': 'Red' })
        await updateDoc(ref, { 
          [path]: value,
          'exportReadiness': newReadiness,
        });
      } else {
        await saveProduct(updatedProduct);
      }

      console.debug(`[useProduct:updateField] success path=${path}`, value);
      return true;
    } catch (error) {
      // rollback optimistic UI update
      console.error('Error updating field:', error);
      setProduct(prevProduct);
      return false;
    }
  };

  /**
   * Update multiple fields atomically (single updateDoc call).
   * Accepts an object of fieldPath => value pairs.
   * Performs optimistic UI update and rollback on error.
   */
  const updateFields = async (updates: Record<string, unknown>): Promise<boolean> => {
    if (!product) return false;

    // Build updatedProduct locally
    const updatedProduct = JSON.parse(JSON.stringify(product));
    for (const [path, value] of Object.entries(updates)) {
      const keys = path.split('.');
      let current: Record<string, unknown> = updatedProduct;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {};
        current = current[keys[i]] as Record<string, unknown>;
      }
      current[keys[keys.length - 1]] = value;
    }

    // Recalculate readiness from the updated product
    const newReadiness = calculateExportReadiness(updatedProduct);
    updatedProduct.exportReadiness = newReadiness;

    const prevProduct = product;
    try {
      // LP-0.1.x: Mark pending update to prevent snapshot race
      pendingUpdateRef.current = Date.now();
      
      // optimistic UI update
      setProduct(updatedProduct);

      if (isFirebaseAvailable() && db) {
        const ref = doc(db, 'products', product.id);
        await updateDoc(ref, {
          ...updates,
          exportReadiness: newReadiness,
        });
      } else {
        // Persist full product if no db
        await saveProduct(updatedProduct);
      }

      console.debug('[useProduct:updateFields] success updates=', updates);
      
      // Clear pending flag after write completes
      pendingUpdateRef.current = null;
      return true;
    } catch (err) {
      console.error('[useProduct:updateFields] Error persisting updates:', err);
      // rollback UI
      setProduct(prevProduct);
      pendingUpdateRef.current = null;
      return false;
    }
  };

  // Add observation
  const addObservation = async (newObs: NewObservation): Promise<boolean> => {
    if (!product) return false;

    const observation: Observation = {
      id: `obs-${Date.now()}`,
      ...newObs,
      status: 'open',
      timestamp: new Date().toISOString(),
    };

    const updatedProduct = {
      ...product,
      observations: [...product.observations, observation],
    };

    return saveProduct(updatedProduct);
  };

  // Resolve observation
  const resolveObservation = async (obsId: string): Promise<boolean> => {
    if (!product) return false;

    const updatedProduct = {
      ...product,
      observations: product.observations.map(obs =>
        obs.id === obsId ? { ...obs, status: 'resolved' as const } : obs
      ),
    };

    return saveProduct(updatedProduct);
  };

  // Apply suggestion
  const applySuggestion = async (suggestionId: string): Promise<boolean> => {
    if (!product) return false;

    const suggestion = product.smartSuggestions.find(s => s.id === suggestionId);
    if (!suggestion) return false;

    // Update the target field with proposed value
    await updateField(suggestion.targetField, suggestion.proposedValue);

    // Mark suggestion as applied
    const updatedProduct = {
      ...product,
      smartSuggestions: product.smartSuggestions.map(s =>
        s.id === suggestionId ? { ...s, status: 'applied' as const } : s
      ),
    };

    return saveProduct(updatedProduct);
  };

  // Ignore suggestion
  const ignoreSuggestion = async (suggestionId: string): Promise<boolean> => {
    if (!product) return false;

    const updatedProduct = {
      ...product,
      smartSuggestions: product.smartSuggestions.map(s =>
        s.id === suggestionId ? { ...s, status: 'ignored' as const } : s
      ),
    };

    return saveProduct(updatedProduct);
  };

  // LP-3.0.2, LP-3.0.7, LP-0.4.7: Ensure product always has safe defaults to prevent runtime errors
  // LP-0.4.7 "Ghost Killer": websites defaults to [] (empty array), never hardcoded values
  // Defensive guards for attributes, exportReadiness, and array fields
  const safeProduct = product
    ? {
        ...product,
        attributes: product.attributes ?? {},
        exportReadiness: product.exportReadiness ?? { overall: 0, byWebsite: {} },
        websites: Array.isArray(product.websites) ? product.websites : [],
        // Ensure descriptions and media exist so downstream code can index them safely
        descriptions: product.descriptions ?? {},
        media: {
          ...(product.media ?? {}),
          gallery: Array.isArray(product.media?.gallery) ? product.media!.gallery : [],
        },
        observations: Array.isArray(product.observations) ? product.observations : [],
        smartSuggestions: Array.isArray(product.smartSuggestions) ? product.smartSuggestions : [],
      }
    : product;

  return {
    product: safeProduct,
    loading,
    saveProduct,
    updateField,
    updateFields,
    addObservation,
    resolveObservation,
    applySuggestion,
    ignoreSuggestion,
  };
}

/**
 * Calculate export readiness score
 * 
 * TODO: Implement comprehensive export rules from Notion
 * Reference: Product Completion Workflows (W2)
 * https://www.notion.so/2ba45ee1ec5a80698690f9492961ed8b
 */
function calculateExportReadiness(product: Product) {
  let overall = 0;
  const byWebsite: Record<string, any> = {};

  const sites = Array.isArray(product.websites) ? product.websites : [];

  // Defensive: if no websites, return zero readiness
  if (sites.length === 0) {
    return { overall: 0, byWebsite: {} };
  }

  sites.forEach((website) => {
    // Safe checks using optional chaining and type guards
    const coreInfo = Boolean(product.sku && product.name && product.brand && product.category);
    const attributesOk = Boolean(product.attributes && Object.keys(product.attributes).length >= 5);

    const descForSite = (product.descriptions && (product.descriptions as any)[website]) || undefined;
    const hasLongDescription = Boolean(descForSite && typeof descForSite.main === 'string' && descForSite.main.length > 50);

    const mediaObj = product.media ?? {};
    const hasHero = Boolean(mediaObj?.heroImage);
    const hasGallery = Array.isArray(mediaObj?.gallery) && mediaObj.gallery.length > 0;

    const checklist = {
      coreInfo,
      attributes: attributesOk,
      descriptions: hasLongDescription,
      media: hasHero && hasGallery,
      pricing: false,
    };

    const score = Object.values(checklist).filter(Boolean).length * 20;

    byWebsite[website] = {
      score,
      checklist,
    };

    overall += score;
  });

  overall = Math.round(overall / sites.length);

  return {
    overall,
    byWebsite,
  };
}
