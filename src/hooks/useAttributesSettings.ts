/**
 * Hook for managing product attributes in Firestore
 * Handles CRUD operations for /settings/attributes
 */

import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

export type AttributeKey = 
  | 'departments' 
  | 'classes' 
  | 'categories' 
  | 'ageGroups' 
  | 'genders' 
  | 'statuses' 
  | 'websites' 
  | 'sportsTeams' 
  | 'leagues'
  | 'fits'
  | 'taxClasses';

export type AttributesData = Record<AttributeKey, string[]>;

const INITIAL_ATTRIBUTES: AttributesData = {
  departments: [],
  classes: [],
  categories: [],
  ageGroups: [],
  genders: [],
  statuses: [],
  websites: [],
  sportsTeams: [],
  leagues: [],
  fits: [],
  taxClasses: [],
};

const MAX_ITEM_LENGTH = 80;

/**
 * Normalize string for case-insensitive comparison
 */
export function normalizeString(str: string): string {
  return str.trim().toLowerCase();
}

/**
 * Check if an item already exists (case-insensitive)
 */
export function isDuplicate(items: string[], newItem: string): boolean {
  const normalized = normalizeString(newItem);
  return items.some(item => normalizeString(item) === normalized);
}

/**
 * Deduplicate array (case-insensitive, keeps first occurrence)
 */
export function deduplicateArray(items: string[]): string[] {
  const seen = new Set<string>();
  return items.filter(item => {
    const normalized = normalizeString(item);
    if (seen.has(normalized)) {
      return false;
    }
    seen.add(normalized);
    return true;
  });
}

/**
 * Validate and clean an item value
 */
export function validateItem(value: string): { valid: boolean; cleaned: string; error?: string } {
  const trimmed = value.trim();
  
  if (!trimmed) {
    return { valid: false, cleaned: '', error: 'Value cannot be empty' };
  }
  
  if (trimmed.length > MAX_ITEM_LENGTH) {
    // Silently truncate
    return { valid: true, cleaned: trimmed.substring(0, MAX_ITEM_LENGTH) };
  }
  
  return { valid: true, cleaned: trimmed };
}

export function useAttributesSettings() {
  const [data, setData] = useState<AttributesData>(INITIAL_ATTRIBUTES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const docRef = doc(db, 'settings', 'attributes');

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const loadedData = docSnap.data() as AttributesData;
        // Ensure all keys exist and deduplicate on load
        const cleanedData: AttributesData = { ...INITIAL_ATTRIBUTES };
        Object.keys(INITIAL_ATTRIBUTES).forEach((key) => {
          const attrKey = key as AttributeKey;
          cleanedData[attrKey] = deduplicateArray(loadedData[attrKey] || []);
        });
        setData(cleanedData);
      } else {
        // Document doesn't exist, create it with empty arrays
        await setDoc(docRef, INITIAL_ATTRIBUTES);
        setData(INITIAL_ATTRIBUTES);
      }
    } catch (err) {
      console.error('Error loading attributes:', err);
      setError('Failed to load attributes');
    } finally {
      setLoading(false);
    }
  };

  const saveData = async (newData: AttributesData): Promise<boolean> => {
    try {
      setSaving(true);
      setError(null);
      
      // Deduplicate all arrays before saving
      const cleanedData: AttributesData = { ...INITIAL_ATTRIBUTES };
      Object.keys(newData).forEach((key) => {
        const attrKey = key as AttributeKey;
        cleanedData[attrKey] = deduplicateArray(newData[attrKey]);
      });
      
      await setDoc(docRef, cleanedData);
      setData(cleanedData);
      return true;
    } catch (err) {
      console.error('Error saving attributes:', err);
      setError('Failed to save attributes');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const addItem = async (key: AttributeKey, value: string): Promise<{ success: boolean; error?: string }> => {
    const validation = validateItem(value);
    
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }
    
    const currentItems = data[key];
    
    if (isDuplicate(currentItems, validation.cleaned)) {
      return { success: false, error: 'Item already exists' };
    }
    
    // Optimistic update
    const newData = {
      ...data,
      [key]: [...currentItems, validation.cleaned],
    };
    
    setData(newData);
    
    // Save to Firestore
    const success = await saveData(newData);
    
    if (!success) {
      // Rollback on failure
      setData(data);
      return { success: false, error: 'Failed to save' };
    }
    
    return { success: true };
  };

  const editItem = async (
    key: AttributeKey, 
    index: number, 
    newValue: string
  ): Promise<{ success: boolean; error?: string }> => {
    const validation = validateItem(newValue);
    
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }
    
    const currentItems = data[key];
    
    if (index < 0 || index >= currentItems.length) {
      return { success: false, error: 'Invalid index' };
    }
    
    // Check if the new value duplicates another item (excluding the current index)
    const otherItems = currentItems.filter((_, i) => i !== index);
    if (isDuplicate(otherItems, validation.cleaned)) {
      return { success: false, error: 'Item already exists' };
    }
    
    // Optimistic update
    const newItems = [...currentItems];
    newItems[index] = validation.cleaned;
    
    const newData = {
      ...data,
      [key]: newItems,
    };
    
    setData(newData);
    
    // Save to Firestore
    const success = await saveData(newData);
    
    if (!success) {
      // Rollback on failure
      setData(data);
      return { success: false, error: 'Failed to save' };
    }
    
    return { success: true };
  };

  const deleteItem = async (key: AttributeKey, index: number): Promise<{ success: boolean; error?: string }> => {
    const currentItems = data[key];
    
    if (index < 0 || index >= currentItems.length) {
      return { success: false, error: 'Invalid index' };
    }
    
    // Optimistic update
    const newItems = currentItems.filter((_, i) => i !== index);
    
    const newData = {
      ...data,
      [key]: newItems,
    };
    
    setData(newData);
    
    // Save to Firestore
    const success = await saveData(newData);
    
    if (!success) {
      // Rollback on failure
      setData(data);
      return { success: false, error: 'Failed to save' };
    }
    
    return { success: true };
  };

  return {
    data,
    loading,
    saving,
    error,
    addItem,
    editItem,
    deleteItem,
    reload: loadData,
  };
}
