/**
 * Hook for managing product attributes in Firestore
 * Handles CRUD operations for /settings/<key>/items subcollections
 */

import { useState, useEffect, useRef } from 'react';
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, onSnapshot, addDoc } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Debounce helper
 */
function debounce<F extends (...args: any[]) => void>(fn: F, wait = 500) {
  let t: any;
  return (...args: Parameters<F>) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

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

  // Subscribe to all vocab subcollections
  useEffect(() => {
    const unsubscribers: (() => void)[] = [];
    setLoading(true);

    const keys: AttributeKey[] = [
      'departments', 'classes', 'categories', 'ageGroups', 'genders',
      'statuses', 'websites', 'sportsTeams', 'leagues', 'fits', 'taxClasses'
    ];

    keys.forEach(key => {
      const colRef = collection(db, 'settings', key, 'items');
      const unsubscribe = onSnapshot(
        colRef,
        (snapshot) => {
          const items = snapshot.docs.map(doc => doc.data().value || doc.id);
          setData(prev => ({ ...prev, [key]: deduplicateArray(items) }));
        },
        (err) => {
          console.error(`[useAttributesSettings] Failed to load ${key}:`, err);
        }
      );
      unsubscribers.push(unsubscribe);
    });

    setTimeout(() => setLoading(false), 500);

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, []);

  const loadData = async () => {
    // Placeholder for compatibility - data is loaded via subscriptions
    setLoading(true);
    setTimeout(() => setLoading(false), 100);
  };

  const saveData = async (newData: AttributesData): Promise<boolean> => {
    // This method is deprecated but kept for compatibility
    // Individual operations now save directly to subcollections
    return true;
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
    
    try {
      setSaving(true);
      const colRef = collection(db, 'settings', key, 'items');
      await addDoc(colRef, {
        value: validation.cleaned,
        label: validation.cleaned,
      });
      return { success: true };
    } catch (err) {
      console.error('[useAttributesSettings] Failed to add item:', err);
      return { success: false, error: 'Failed to save' };
    } finally {
      setSaving(false);
    }
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
    
    try {
      setSaving(true);
      // Load all docs to find the one at this index
      const colRef = collection(db, 'settings', key, 'items');
      const snapshot = await getDocs(colRef);
      const docs = snapshot.docs;
      
      if (index >= docs.length) {
        return { success: false, error: 'Invalid index' };
      }
      
      const docToEdit = docs[index];
      await setDoc(doc(db, 'settings', key, 'items', docToEdit.id), {
        value: validation.cleaned,
        label: validation.cleaned,
      });
      
      return { success: true };
    } catch (err) {
      console.error('[useAttributesSettings] Failed to edit item:', err);
      return { success: false, error: 'Failed to save' };
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (key: AttributeKey, index: number): Promise<{ success: boolean; error?: string }> => {
    const currentItems = data[key];
    
    if (index < 0 || index >= currentItems.length) {
      return { success: false, error: 'Invalid index' };
    }
    
    try {
      setSaving(true);
      // Load all docs to find the one at this index
      const colRef = collection(db, 'settings', key, 'items');
      const snapshot = await getDocs(colRef);
      const docs = snapshot.docs;
      
      if (index >= docs.length) {
        return { success: false, error: 'Invalid index' };
      }
      
      const docToDelete = docs[index];
      await deleteDoc(doc(db, 'settings', key, 'items', docToDelete.id));
      
      return { success: true };
    } catch (err) {
      console.error('[useAttributesSettings] Failed to delete item:', err);
      return { success: false, error: 'Failed to save' };
    } finally {
      setSaving(false);
    }
  };

  /**
   * Update an attribute array - now saves each item to subcollection
   */
  const updateAttributeArray = async (key: AttributeKey, nextArray: string[]) => {
    try {
      setSaving(true);
      const colRef = collection(db, 'settings', key, 'items');
      
      // Get existing docs
      const snapshot = await getDocs(colRef);
      const existingDocs = snapshot.docs;
      
      // Delete all existing
      await Promise.all(existingDocs.map(d => deleteDoc(d.ref)));
      
      // Add new items
      await Promise.all(
        nextArray.map(item => 
          addDoc(colRef, { value: item, label: item })
        )
      );
    } catch (err) {
      console.error('[useAttributesSettings] Failed to update array:', err);
      setError('Failed to update');
    } finally {
      setSaving(false);
    }
  };

  return {
    data,
    loading,
    saving,
    error,
    addItem,
    editItem,
    deleteItem,
    updateAttributeArray,
    reload: loadData,
  };
}
