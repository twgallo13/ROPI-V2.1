import { useState, useEffect } from 'react';
import type { Product, Observation, NewObservation } from '../types/product';
import mockProductData from '../data/mock-product.json';

/**
 * useProduct Hook
 * 
 * Manages product data with localStorage persistence.
 * 
 * TODO: Replace localStorage with Firestore integration
 * Reference: Product Completion Workflows (W2)
 * https://www.notion.so/2ba45ee1ec5a80698690f9492961ed8b
 */
export function useProduct(productId: string) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  // Load product data from localStorage or mock data
  useEffect(() => {
    const loadProduct = () => {
      try {
        // Try to load from localStorage first
        const stored = localStorage.getItem(`aoss:product:${productId}`);
        if (stored) {
          setProduct(JSON.parse(stored));
        } else {
          // Fall back to mock data
          setProduct(mockProductData as Product);
        }
      } catch (error) {
        console.error('Error loading product:', error);
        setProduct(mockProductData as Product);
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [productId]);

  // Save product to localStorage
  const saveProduct = (updatedProduct: Product) => {
    try {
      localStorage.setItem(`aoss:product:${productId}`, JSON.stringify(updatedProduct));
      setProduct(updatedProduct);
      return true;
    } catch (error) {
      console.error('Error saving product:', error);
      return false;
    }
  };

  // Update product field
  const updateField = (path: string, value: any) => {
    if (!product) return false;

    const updatedProduct = { ...product };
    const keys = path.split('.');
    let current: any = updatedProduct;

    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }

    current[keys[keys.length - 1]] = value;

    // Recalculate export readiness
    const newReadiness = calculateExportReadiness(updatedProduct);
    updatedProduct.exportReadiness = newReadiness;

    return saveProduct(updatedProduct);
  };

  // Add observation
  const addObservation = (newObs: NewObservation) => {
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
  const resolveObservation = (obsId: string) => {
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
  const applySuggestion = (suggestionId: string) => {
    if (!product) return false;

    const suggestion = product.smartSuggestions.find(s => s.id === suggestionId);
    if (!suggestion) return false;

    // Update the target field with proposed value
    updateField(suggestion.targetField, suggestion.proposedValue);

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
  const ignoreSuggestion = (suggestionId: string) => {
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
