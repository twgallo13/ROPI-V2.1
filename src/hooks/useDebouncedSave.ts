import { useState, useRef, useCallback, useEffect } from 'react';

export type SaveState = 'idle' | 'saving' | 'saved';

interface UseDebouncedSaveOptions<T> {
  /** Function to save data to Firestore or backend */
  saveFn: (data: T) => Promise<void>;
  /** Debounce delay in milliseconds (default: 400ms) */
  delay?: number;
  /** Callback for successful save */
  onSuccess?: (message?: string) => void;
  /** Callback for save errors */
  onError?: (error: any) => void;
}

interface UseDebouncedSaveReturn {
  /** Current save state */
  saveState: SaveState;
  /** Trigger a debounced save */
  debouncedSave: () => void;
  /** Immediately save (cancels any pending debounced save) */
  saveNow: () => Promise<void>;
  /** Track that a field has changed */
  trackChange: (fieldName: string) => void;
  /** Set of changed field names */
  changedFields: Set<string>;
  /** Clear all changed fields */
  clearChanges: () => void;
}

/**
 * Shared hook for debounced autosave with save state tracking
 * 
 * Usage:
 * ```tsx
 * const { saveState, debouncedSave, saveNow, trackChange } = useDebouncedSave({
 *   saveFn: async (data) => await setDoc(docRef, data),
 *   onSuccess: () => showToast('Saved!', 'success'),
 *   onError: (err) => showToast('Save failed', 'error'),
 * });
 * 
 * <input onBlur={debouncedSave} onChange={() => trackChange('fieldName')} />
 * ```
 */
export function useDebouncedSave<T>(
  data: T,
  options: UseDebouncedSaveOptions<T>
): UseDebouncedSaveReturn {
  const { saveFn, delay = 400, onSuccess, onError } = options;
  
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [changedFields, setChangedFields] = useState<Set<string>>(new Set());
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const savedTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
    };
  }, []);

  const performSave = useCallback(async () => {
    if (changedFields.size === 0) return;

    try {
      setSaveState('saving');
      await saveFn(data);
      setChangedFields(new Set());
      setSaveState('saved');

      if (onSuccess) {
        onSuccess();
      }

      // Reset to idle after 1 second
      if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
      savedTimeoutRef.current = setTimeout(() => {
        setSaveState('idle');
      }, 1000);
    } catch (error) {
      console.error('[useDebouncedSave] Save failed:', error);
      setSaveState('idle');
      if (onError) {
        onError(error);
      }
    }
  }, [data, saveFn, changedFields, onSuccess, onError]);

  const debouncedSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      performSave();
    }, delay);
  }, [performSave, delay]);

  const saveNow = useCallback(async () => {
    // Cancel any pending debounced save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    await performSave();
  }, [performSave]);

  const trackChange = useCallback((fieldName: string) => {
    setChangedFields(prev => new Set(prev).add(fieldName));
  }, []);

  const clearChanges = useCallback(() => {
    setChangedFields(new Set());
  }, []);

  return {
    saveState,
    debouncedSave,
    saveNow,
    trackChange,
    changedFields,
    clearChanges,
  };
}
