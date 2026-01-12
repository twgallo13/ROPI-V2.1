import { useState, useEffect, useRef } from 'react';
import type { Product, Observation, NewObservation, FieldProvenance, ActivityLogEntry } from '../types/product';
import { isFirebaseAvailable, db, auth } from '../firebaseConfig';
import {
  doc,
  setDoc,
  onSnapshot,
  Unsubscribe,
  arrayUnion,
} from 'firebase/firestore';
import mockProductData from '../data/mock-product.json';
import {
  getProvenanceKey,
  createHumanProvenance,
  createReplacementActivityLog,
} from '../services/productService';

// LP-1.4.1: Helper functions for case conversion
const toCamel = (s: string) => s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
const toSnake = (s: string) => s.replace(/([A-Z])/g, (m) => `_${m.toLowerCase()}`);

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
 * Core fields that should be merged from nested core object to top-level.
 * LP-1.3.7: Import engine writes to product.core.*, but ProductHeader expects product.*
 */
const CORE_FIELD_KEYS = [
  'mpn', 'sku', 'brand', 'title', 'name', 'status', 'description',
  'styleId', 'style_id', 'firstReceived', 'first_received', 
  'lastReceived', 'last_received', 'launchDate', 'launch_date',
  'createdAt', 'updatedAt',
];

/**
 * Inventory fields that should be merged from nested inventory object to top-level.
 * LP-1.3.7: Import engine writes to product.inventory.*, but ProductHeader expects product.*
 */
const INVENTORY_FIELD_KEYS = [
  'quantity', 'warehouse_inv', 'store_inv', 'whs_inv', 'total_inv',
  'warehouse', 'location',
];

/**
 * Attribute fields that should be merged from nested attributes object to top-level.
 * LP-1.3.8: Import engine writes to product.attributes.*, but CoreInformationTab reads product.*
 * These are the classification/taxonomy fields used by CoreInformationTab and other UI components.
 * LP-1.4.0: Added website field for site assignment
 */
const ATTRIBUTE_FIELDS_TO_TOP_LEVEL = [
  // CoreInformationTab fields
  'department', 'class', 'category', 'subcategory',
  'gender', 'age_group', 'ageGroup',
  // Site assignment (multiSelect - LP-1.4.0)
  'website', 'websites',
  // ProductAttributesTab fields (also accessed at top-level by some components)
  'primary_color', 'primaryColor', 'descriptive_color', 'descriptiveColor',
  'secondary_color', 'secondaryColor',
  'material', 'materials', 'fit', 'cut_type', 'closure_type',
  'league', 'sports_team', 'collection_name',
  // Fast Fashion fields
  'fast_fashion', 'heel_height', 'platform_height', 'heel_type', 'shoe_height_map',
  // LaunchMediaTab fields
  'hype', 'kl_post_date', 'promo', 'product_is_active',
  // TechnicalTab fields
  'gtin', 'tax_class', 'height', 'length', 'width', 'weight',
];

/**
 * LP-1.4.0: Fields that should always be arrays (multiSelect in registry)
 */
const MULTI_SELECT_FIELDS = ['website', 'websites', 'material', 'materials', 'features'];

/**
 * LP-1.4.0: Ensure a value is an array for multiSelect fields
 * Coerces string values to single-element arrays.
 */
function ensureArray(value: unknown): unknown[] {
  if (value === undefined || value === null || value === '') return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    // Split if contains delimiters, otherwise wrap as single item
    if (value.includes('|') || value.includes(',') || value.includes(';')) {
      return value.split(/[|,;]/).map(s => s.trim()).filter(s => s.length > 0);
    }
    return [value];
  }
  return [value];
}

/**
 * Merge core, inventory, and attribute fields from nested objects to top-level for UI compatibility.
 * LP-1.3.7: Import engine writes product.core.mpn, but ProductHeader reads product.mpn
 * LP-1.3.8: Import engine writes product.attributes.class, but CoreInformationTab reads product.class
 * LP-1.4.0: Ensure name is populated from title, coerce multiSelect fields to arrays
 */
function mergeCoreFieldsToTopLevel(docData: Record<string, unknown>): Record<string, unknown> {
  const core = docData.core as Record<string, unknown> | undefined;
  const inventory = docData.inventory as Record<string, unknown> | undefined;
  const attributes = docData.attributes as Record<string, unknown> | undefined;
  
  const merged = { ...docData };
  
  // Merge core fields
  if (core && typeof core === 'object') {
    for (const key of CORE_FIELD_KEYS) {
      // Only merge if top-level is undefined/null and core has the value
      if ((merged[key] === undefined || merged[key] === null) && core[key] !== undefined && core[key] !== null) {
        merged[key] = core[key];
      }
    }
  }
  
  // Merge inventory fields
  if (inventory && typeof inventory === 'object') {
    for (const key of INVENTORY_FIELD_KEYS) {
      if ((merged[key] === undefined || merged[key] === null) && inventory[key] !== undefined && inventory[key] !== null) {
        merged[key] = inventory[key];
      }
    }
  }
  
  // LP-1.3.8: Merge attribute fields to top-level
  if (attributes && typeof attributes === 'object') {
    for (const key of ATTRIBUTE_FIELDS_TO_TOP_LEVEL) {
      if ((merged[key] === undefined || merged[key] === null) && attributes[key] !== undefined && attributes[key] !== null) {
        merged[key] = attributes[key];
      }
    }
  }
  
  // LP-1.4.0: Ensure name is populated from title if missing
  if (!merged.name && merged.title) {
    merged.name = merged.title;
  }
  if (!merged.name && core?.title) {
    merged.name = core.title;
  }
  
  // LP-1.4.0: Coerce multiSelect fields to arrays
  for (const field of MULTI_SELECT_FIELDS) {
    if (merged[field] !== undefined && merged[field] !== null && !Array.isArray(merged[field])) {
      merged[field] = ensureArray(merged[field]);
    }
  }
  
  // LP-1.4.0: Also ensure attributes.website is an array if present
  if (merged.attributes && typeof merged.attributes === 'object') {
    const attrs = merged.attributes as Record<string, unknown>;
    for (const field of MULTI_SELECT_FIELDS) {
      if (attrs[field] !== undefined && attrs[field] !== null && !Array.isArray(attrs[field])) {
        attrs[field] = ensureArray(attrs[field]);
      }
    }
  }

  return merged;
}

/**
 * LP-1.4.1: Pick attribute value with case-insensitive key lookup
 * Tries exact key, snake_case, camelCase, and lowercase variants
 */
function pickAttributeValue(attributes: Record<string, unknown> | undefined, key: string): unknown {
  if (!attributes) return undefined;
  if (attributes[key] !== undefined && attributes[key] !== null && attributes[key] !== '') return attributes[key];
  const snake = toSnake(key);
  if (attributes[snake] !== undefined && attributes[snake] !== null && attributes[snake] !== '') return attributes[snake];
  const camel = toCamel(key);
  if (attributes[camel] !== undefined && attributes[camel] !== null && attributes[camel] !== '') return attributes[camel];
  const lower = key.toLowerCase();
  if (attributes[lower] !== undefined && attributes[lower] !== null && attributes[lower] !== '') return attributes[lower];
  return undefined;
}

/**
 * LP-1.4.1: Extended list of attribute fields to merge to top-level
 * Includes all fields needed by Product Page components
 */
const LP_1_4_1_ATTRIBUTE_FIELDS = [
  'department', 'class', 'category', 'age_group', 'ageGroup', 'gender',
  'primary_color', 'descriptive_color', 'descriptiveColor', 'secondary_color',
  'material', 'fit', 'fast_fashion', 'currency', 'rics_color', 'rics_category',
  'rics_short_description', 'rics_long_desc', 'collection_name', 'collectionName',
  'sports_team', 'website', 'media_status', 'mediaStatus', 'style_id', 'styleId',
  'platform_height', 'platformHeight', 'heel_height', 'heelHeight', 'cut_type', 'cutType',
  'closure_type', 'closureType'
];

/**
 * LP-1.4.1: Merge attributes and dimensions into top-level fields for Product Page rendering
 * Supports both snake_case and camelCase keys for UI compatibility
 * @param product - Product object with attributes and dimensions
 * @returns Product with merged top-level fields
 */
export function mergeFieldsToTopLevel(product: Record<string, unknown>): Record<string, unknown> {
  if (!product) return product;
  const attrs = (product.attributes || {}) as Record<string, unknown>;
  
  // Merge attribute fields to top-level (both camelCase and snake_case)
  // Skip 'website' here - it's handled specially below for array normalization
  for (const canonical of LP_1_4_1_ATTRIBUTE_FIELDS) {
    if (canonical === 'website') continue; // Handle website separately
    const val = pickAttributeValue(attrs, canonical);
    if (val === undefined) continue;
    const camel = toCamel(canonical);
    const snake = toSnake(canonical);
    if (product[camel] === undefined || product[camel] === null || product[camel] === '') {
      product[camel] = val;
    }
    if (product[snake] === undefined || product[snake] === null || product[snake] === '') {
      product[snake] = val;
    }
  }
  
  // Merge dimensions to top-level
  if (product.dimensions && typeof product.dimensions === 'object') {
    const dims = ['height', 'length', 'width', 'weight'];
    const dimensions = product.dimensions as Record<string, unknown>;
    dims.forEach(d => {
      const v = dimensions[d];
      if (v !== undefined && v !== null && v !== '') {
        if (product[d] === undefined || product[d] === null || product[d] === 0) {
          product[d] = v;
        }
      }
    });
  }
  
  // LP-1.4.1: Normalize website to arrays (always)
  const websiteVal = pickAttributeValue(attrs, 'website') || product.website;
  if (websiteVal !== undefined && websiteVal !== null && websiteVal !== '') {
    const arr = Array.isArray(websiteVal) 
      ? websiteVal 
      : String(websiteVal).split(',').map(s => s.trim()).filter(Boolean);
    product.website = arr;
    product.websites = arr;
  }
  
  // Provide media_status fallback from attributes
  const mediaVal = pickAttributeValue(attrs, 'media_status') || pickAttributeValue(attrs, 'mediaStatus');
  if (mediaVal !== undefined && (!product.media_status || product.media_status === '')) {
    product.media_status = mediaVal;
  }
  
  return product;
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
              
              // LP-1.3.7: Merge core fields to top-level for UI compatibility
              const withCoreFields = mergeCoreFieldsToTopLevel(docData);
              
              // LP-1.4.1: Merge attributes and dimensions to top-level for Product Page rendering
              const withTopLevelFields = mergeFieldsToTopLevel(withCoreFields);
              
              // Merge top-level attribute keys into attributes map for compatibility
              const mergedAttributes = mergeTopLevelAttributesToAttributesMap(withTopLevelFields);
              const productWithMergedAttrs = {
                id: snap.id,
                ...withTopLevelFields,
                attributes: mergedAttributes,
              } as Product;
              setProduct(productWithMergedAttrs);
            } else {
              // DO NOT fall back to mock data - return null to allow creation with correct ID
              console.warn(`[useProduct] Product ${productId} not found in Firestore - returning null to allow creation`);
              setProduct(null);
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
  // LP-smart-rules-ui-provenance-1.0.0: Enhanced to handle provenance replacement
  const updateField = async (path: string, value: unknown): Promise<boolean> => {
    if (!product) return false;

    // LP-smart-rules-ui-provenance-1.0.0: Check for Smart Rule provenance on this field
    const provenanceKey = getProvenanceKey(path);
    const existingProvenance = product.provenance?.[provenanceKey] as FieldProvenance | undefined;
    const hasSmartRuleProvenance = existingProvenance?.source === 'smartRule';

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

    // LP-smart-rules-ui-provenance-1.0.0: Prepare provenance updates
    const currentUser = auth?.currentUser;
    const actor = currentUser?.email || currentUser?.uid || 'anonymous';
    let provenanceUpdates: Record<string, unknown> = {};
    let activityLogEntry: ActivityLogEntry | null = null;

    if (hasSmartRuleProvenance) {
      // Replace Smart Rule provenance with human provenance
      const humanProvenance = createHumanProvenance(actor);
      provenanceUpdates[`provenance.${provenanceKey}`] = humanProvenance;
      
      // Create activity log entry for the replacement
      activityLogEntry = createReplacementActivityLog(
        actor,
        path,
        existingProvenance,
        value
      );

      // Update local product copy with new provenance
      if (!updatedProduct.provenance) {
        updatedProduct.provenance = {};
      }
      updatedProduct.provenance[provenanceKey] = humanProvenance;

      console.debug(`[useProduct:updateField] Replacing Smart Rule provenance for ${path}`, {
        previousSource: existingProvenance.source,
        previousRuleId: existingProvenance.ruleId,
        newSource: 'human',
        actor,
      });
    }

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
        
        // Build update payload
        const updatePayload: Record<string, unknown> = {
          [path]: value,
          'exportReadiness': newReadiness,
          ...provenanceUpdates,
        };

        // LP-smart-rules-ui-provenance-1.0.0: Add activity log entry if replacing Smart Rule
        if (activityLogEntry) {
          updatePayload['activityLog'] = arrayUnion(activityLogEntry);
        }

        // Firestore accepts nested paths as keys with merge for upsert: setDoc(ref, { 'attributes.color': 'Red' }, { merge: true })
        await setDoc(ref, updatePayload, { merge: true });
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
        await setDoc(ref, {
          ...updates,
          exportReadiness: newReadiness,
        }, { merge: true });
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
      // Mock readiness path: no registry-driven missing attributes available here
      missingAttributes: [],
    };

    overall += score;
  });

  overall = Math.round(overall / sites.length);

  return {
    overall,
    byWebsite,
  };
}
