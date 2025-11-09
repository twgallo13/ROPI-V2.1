import { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebase';

export interface ExportRuleTransform {
  type: 'uppercase' | 'lowercase' | 'trim' | 'map';
  field?: string;
  from?: any;
  to?: any;
}

export interface ExportRulePreset {
  id?: string;
  name: string;
  presetType: 'RetailOps' | 'Shopify' | 'Custom';
  schema: string[];
  filters?: Record<string, any>;
  transforms?: ExportRuleTransform[];
  createdAt?: any;
  updatedAt?: any;
}

interface PreviewResult {
  rows: Record<string, any>[];
}

const exportRulesPreviewCallable = httpsCallable<{
  schema: string[];
  filters?: Record<string, any>;
  transforms?: ExportRuleTransform[];
  limit?: number;
}, PreviewResult>(functions, 'exportRulesPreview');

export function useExportRules() {
  const [presets, setPresets] = useState<ExportRulePreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);

  useEffect(() => {
    loadPresets();
  }, []);

  const loadPresets = async () => {
    try {
      setLoading(true);
      setError(null);
      const q = query(collection(db, 'exportRulesPresets'));
      const snap = await getDocs(q);
      const list: ExportRulePreset[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as ExportRulePreset);
      });
      setPresets(list);
    } catch (err: any) {
      console.error('[useExportRules] Failed to load presets:', err);
      setError(err?.message || 'Failed to load presets');
    } finally {
      setLoading(false);
    }
  };

  const savePreset = async (preset: ExportRulePreset): Promise<{ success: boolean; error?: string; id?: string }> => {
    try {
      const id = preset.id || doc(collection(db, 'exportRulesPresets')).id;
      const data = {
        name: preset.name,
        presetType: preset.presetType,
        schema: preset.schema,
        filters: preset.filters || {},
        transforms: preset.transforms || [],
        updatedAt: serverTimestamp(),
        ...(preset.id ? {} : { createdAt: serverTimestamp() }),
      };
      
      await setDoc(doc(db, 'exportRulesPresets', id), data, { merge: true });
      await loadPresets();
      
      return { success: true, id };
    } catch (err: any) {
      console.error('[useExportRules] Failed to save preset:', err);
      return { success: false, error: err?.message || 'Failed to save preset' };
    }
  };

  const deletePreset = async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      await deleteDoc(doc(db, 'exportRulesPresets', id));
      await loadPresets();
      return { success: true };
    } catch (err: any) {
      console.error('[useExportRules] Failed to delete preset:', err);
      return { success: false, error: err?.message || 'Failed to delete preset' };
    }
  };

  const runPreview = async (
    schema: string[],
    filters?: Record<string, any>,
    transforms?: ExportRuleTransform[],
    limit?: number
  ): Promise<{ success: boolean; rows?: Record<string, any>[]; error?: string }> => {
    try {
      setPreviewing(true);
      const result = await exportRulesPreviewCallable({
        schema,
        filters,
        transforms,
        limit: limit || 5,
      });
      
      return { success: true, rows: result.data.rows };
    } catch (err: any) {
      console.error('[useExportRules] Preview failed:', err);
      return { success: false, error: err?.message || 'Preview failed' };
    } finally {
      setPreviewing(false);
    }
  };

  return {
    presets,
    loading,
    error,
    previewing,
    loadPresets,
    savePreset,
    deletePreset,
    runPreview,
  };
}
