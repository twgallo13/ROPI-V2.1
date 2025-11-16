/**
 * ProductEditorV2 Wrapper
 * Maintains compatibility with existing API while delegating to editors implementation
 * Created: 2025-11-16
 */

import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { Product as LegacyProduct } from '../types';
import EditorsProductEditorV2 from './editors/ProductEditorV2';
import Toast from './Toast';

interface ProductEditorV2Props {
  isOpen: boolean;
  onClose: () => void;
  product?: LegacyProduct | null;
  productId?: string | null;
  onSaved?: (productId: string, updates?: Partial<LegacyProduct>) => void;
}

const ProductEditorV2: React.FC<ProductEditorV2Props> = ({
  isOpen,
  onClose,
  product: productProp,
  productId: productIdProp,
  onSaved,
}) => {
  const [loadedProduct, setLoadedProduct] = useState<LegacyProduct | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false, message: '', type: 'success' 
  });

  // Determine which productId to use - support both legacy API (product.id) and new API (productId)
  const effectiveProductId = productProp?.id || productIdProp;

  // Load product if only productId provided
  useEffect(() => {
    if (!isOpen) {
      setLoadedProduct(null);
      return;
    }

    // If product is provided directly, use it
    if (productProp) {
      setLoadedProduct(productProp);
      return;
    }

    // Otherwise load by productId
    if (!effectiveProductId) {
      setLoadedProduct(null);
      return;
    }

    const loadProduct = async () => {
      setLoading(true);
      try {
        const docRef = doc(db, 'products', effectiveProductId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const productData = { id: docSnap.id, ...docSnap.data() } as LegacyProduct;
          setLoadedProduct(productData);
        } else {
          console.error('Product not found:', effectiveProductId);
          showToast('Product not found', 'error');
        }
      } catch (error) {
        console.error('Error loading product:', error);
        showToast('Error loading product', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [isOpen, productProp, effectiveProductId]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
  };

  const hideToast = () => {
    setToast(prev => ({ ...prev, show: false }));
  };

  const handleSaved = (productId: string) => {
    if (onSaved) {
      onSaved(productId);
    }
  };

  // Show loading state
  if (loading && isOpen) {
    return (
      <div className="fixed inset-0 bg-gray-900 bg-opacity-50 z-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading product...</p>
        </div>
      </div>
    );
  }

  // Don't render if not open or no product data
  if (!isOpen || !effectiveProductId) {
    return null;
  }

  return (
    <>
      <EditorsProductEditorV2
        isOpen={isOpen}
        onClose={onClose}
        productId={effectiveProductId}
        onSaved={handleSaved}
      />

      {toast.show && (
        <Toast message={toast.message} type={toast.type} onClose={hideToast} />
      )}
    </>
  );
};

export default ProductEditorV2;
