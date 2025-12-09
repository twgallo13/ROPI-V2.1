import { useState, useEffect } from 'react';
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

  // Load product data from Firestore or localStorage fallback
  useEffect(() => {
    if (!productId) {
      setProduct(null);
      setLoading(false);
      return;
    }

    let unsub: Unsubscribe | undefined;

    const loadProduct = async () => {
      if (isFirebaseAvailable() && db) {
        try {
          const ref = doc(db, 'products', productId);
          
          // Use real-time listener for live updates
          unsub = onSnapshot(ref, (snap) => {
            if (snap.exists()) {
              const docData = snap.data();
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
              console.warn(`Product ${productId} not found in Firestore, using mock data`);
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
          setProduct(JSON.parse(stored));
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

    try {
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
      setProduct(updatedProduct);
      return true;
    } catch (error) {
      console.error('Error updating field:', error);
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

  return {
    product,
    loading,
    saveProduct,
    updateField,
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
  const byWebsite: any = {};

  product.websites.forEach(website => {
    const checklist = {
      coreInfo: !!(product.sku && product.name && product.brand && product.category),
      attributes: Object.keys(product.attributes).length >= 5,
      descriptions: !!(product.descriptions[website]?.main && 
                       product.descriptions[website]?.main.length > 50),
      media: !!(product.media.heroImage && product.media.gallery.length > 0),
      pricing: false, // TODO: Add pricing data to product model
    };

    const score = Object.values(checklist).filter(Boolean).length * 20;

    byWebsite[website] = {
      score,
      checklist,
    };

    overall += score;
  });

  overall = Math.round(overall / product.websites.length);

  return {
    overall,
    byWebsite,
  };
}
