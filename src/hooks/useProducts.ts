/**
 * Hook for reading products from Firestore
 * Fetches products from /products collection
 */

import { useState, useEffect } from 'react';
import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '../firebase';
import type { Product } from '../types';

export type UseProductsResult = {
  products: Product[];
  loading: boolean;
  error: string | null;
};

export function useProducts(): UseProductsResult {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);

      const productsCollection = collection(db, 'products');
      const productsQuery = query(productsCollection);
      const querySnapshot = await getDocs(productsQuery);

      const loadedProducts: Product[] = [];
      querySnapshot.forEach((doc) => {
        loadedProducts.push({
          id: doc.id,
          ...doc.data(),
        } as Product);
      });

      setProducts(loadedProducts);
    } catch (err) {
      console.error('Error loading products:', err);
      setError('Failed to load products from Firestore');
    } finally {
      setLoading(false);
    }
  };

  return {
    products,
    loading,
    error,
  };
}
