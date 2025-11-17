/**
 * Smart Detect Panel - Rule-based field suggestions with auto-apply and persist
 */

import React, { useState, useEffect, useRef } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { newToLegacy, stripUndefined } from '../../utils/schemaAdapter';
import { callSmartDetect, SmartDetectResult, SmartDetectSuggestion } from '../../api/smartDetect';
import { callValidator } from '../../api/validator';

interface SmartDetectPanelProps {
  productId: string;
  productData: any;
  onApplySuggestion: (fieldPath: string, value: any) => void;
  onApplyAll: (suggestions: SmartDetectSuggestion[]) => void;
  showToast?: (message: string, type: 'success' | 'error', action?: { label: string; onClick: () => void }) => void;
  onRevalidate?: () => Promise<void>;
}

interface AppliedSuggestion {
  fieldPath: string;
  previousValue: any;
  newValue: any;
}

const SmartDetectPanel: React.FC<SmartDetectPanelProps> = ({
  productId,
  productData,
  onApplySuggestion,
  onApplyAll,
  showToast = () => {},
  onRevalidate,
}) => {
  const [result, setResult] = useState<SmartDetectResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appliedSuggestions, setAppliedSuggestions] = useState<Set<string>>(new Set());
  const undoStackRef = useRef<AppliedSuggestion[]>([]);

  // Load suggestions on mount and when productId changes
  useEffect(() => {
    if (productId) {
      loadSuggestions();
    }
  }, [productId]);

  const loadSuggestions = async () => {
    if (!productId) return;

    setLoading(true);
    setError(null);
    
    try {
      const smartDetectResult = await callSmartDetect(productId);
      setResult(smartDetectResult);
      
      // Auto-apply suggestions with autoApply: true
      const autoApplySuggestions = smartDetectResult.suggestions.filter(s => s.autoApply && !appliedSuggestions.has(s.fieldPath));
      if (autoApplySuggestions.length > 0) {
        for (const suggestion of autoApplySuggestions) {
          await applyAndPersistSuggestion(suggestion, true);
        }
      }
    } catch (err) {
      console.error('Smart Detect error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load suggestions');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Apply and persist a suggestion to Firestore
   */
  const applyAndPersistSuggestion = async (suggestion: SmartDetectSuggestion, isAutoApply: boolean = false) => {
    try {
      // Build nested updates
      const updates = setNestedValue({}, suggestion.fieldPath, suggestion.suggestedValue);
      
      // Update UI instantly
      onApplySuggestion(suggestion.fieldPath, suggestion.suggestedValue);
      
      // Merge with existing product data
      const merged = applyNestedUpdate(productData, updates);
      
      // Convert to legacy format
      const legacyPartial = stripUndefined(newToLegacy(merged));
      
      // Persist to Firestore
      await setDoc(doc(db, 'products', productId), legacyPartial, { merge: true });
      
      // Track for undo
      const appliedSuggestion: AppliedSuggestion = {
        fieldPath: suggestion.fieldPath,
        previousValue: suggestion.currentValue,
        newValue: suggestion.suggestedValue,
      };
      undoStackRef.current.push(appliedSuggestion);
      
      // Mark as applied
      setAppliedSuggestions(prev => new Set([...prev, suggestion.fieldPath]));
      
      // Show success toast with Undo action
      const fieldLabel = suggestion.fieldPath.split('.').pop()?.replace(/([A-Z])/g, ' $1').trim() || suggestion.fieldPath;
      const toastMessage = isAutoApply 
        ? `Auto-applied: ${fieldLabel}` 
        : `Applied: ${fieldLabel}`;
      
      showToast(toastMessage, 'success', {
        label: 'Undo',
        onClick: () => handleUndo(appliedSuggestion),
      });
      
      // Trigger revalidation
      if (onRevalidate) {
        await onRevalidate();
      } else {
        // Fallback: call validator directly
        await callValidator(productId);
      }
    } catch (error) {
      console.error('Failed to apply suggestion:', error);
      showToast('Failed to apply suggestion', 'error');
    }
  };

  /**
   * Handle undo for a suggestion
   */
  const handleUndo = async (appliedSuggestion: AppliedSuggestion) => {
    try {
      // Build updates with previous value
      const updates = setNestedValue({}, appliedSuggestion.fieldPath, appliedSuggestion.previousValue);
      
      // Update UI
      onApplySuggestion(appliedSuggestion.fieldPath, appliedSuggestion.previousValue);
      
      // Merge with existing product data
      const merged = applyNestedUpdate(productData, updates);
      
      // Convert to legacy format
      const legacyPartial = stripUndefined(newToLegacy(merged));
      
      // Persist to Firestore
      await setDoc(doc(db, 'products', productId), legacyPartial, { merge: true });
      
      // Remove from applied set
      setAppliedSuggestions(prev => {
        const newSet = new Set(prev);
        newSet.delete(appliedSuggestion.fieldPath);
        return newSet;
      });
      
      // Remove from undo stack
      undoStackRef.current = undoStackRef.current.filter(s => s.fieldPath !== appliedSuggestion.fieldPath);
      
      showToast('Undone', 'success');
      
      // Revalidate and reload suggestions
      await loadSuggestions();
      if (onRevalidate) {
        await onRevalidate();
      }
    } catch (error) {
      console.error('Failed to undo:', error);
      showToast('Failed to undo', 'error');
    }
  };

  /**
   * Handle manual apply for non-autoApply suggestions
   */
  const handleApplySuggestion = async (suggestion: SmartDetectSuggestion) => {
    await applyAndPersistSuggestion(suggestion, false);
  };

  /**
   * Handle apply all
   */
  const handleApplyAll = async () => {
    if (!result?.suggestions) return;
    
    const unapplied = result.suggestions.filter(s => !appliedSuggestions.has(s.fieldPath));
    
    for (const suggestion of unapplied) {
      await applyAndPersistSuggestion(suggestion, false);
    }
    
    showToast(`Applied ${unapplied.length} suggestions`, 'success');
  };

  /**
   * Helper to apply nested updates to product data
   */
  const applyNestedUpdate = (base: any, updates: any): any => {
    const result = { ...base };
    for (const [key, value] of Object.entries(updates)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        result[key] = { ...(result[key] || {}), ...value };
      } else {
        result[key] = value;
      }
    }
    return result;
  };

  /**
   * Helper to set nested object values
   */
  const setNestedValue = (obj: any, path: string, value: any) => {
    const keys = path.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current)) {
        current[key] = {};
      }
      current = current[key];
    }
    
    current[keys[keys.length - 1]] = value;
    return obj;
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-600';
    if (confidence >= 0.8) return 'text-blue-600';
    if (confidence >= 0.7) return 'text-yellow-600';
    return 'text-gray-600';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.9) return 'High';
    if (confidence >= 0.8) return 'Good';
    if (confidence >= 0.7) return 'Medium';
    return 'Low';
  };

  const unappliedSuggestions = result?.suggestions?.filter(s => !appliedSuggestions.has(s.fieldPath)) || [];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Smart Detect</h3>
        <button
          onClick={loadSuggestions}
          disabled={loading}
          className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <span className="ml-2 text-gray-600">Analyzing product data...</span>
        </div>
      )}

      {result && !loading && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-700">{result.summary}</p>
          </div>

          {/* Apply All Button */}
          {unappliedSuggestions.length > 0 && (
            <div className="flex justify-end">
              <button
                onClick={handleApplyAll}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium"
              >
                Apply All ({unappliedSuggestions.length})
              </button>
            </div>
          )}

          {/* Suggestions List */}
          {result.suggestions.length > 0 ? (
            <div className="space-y-3">
              {result.suggestions.map((suggestion, index) => {
                const isApplied = appliedSuggestions.has(suggestion.fieldPath);
                
                return (
                  <div
                    key={`${suggestion.fieldPath}-${index}`}
                    className={`p-4 border rounded-md ${
                      isApplied ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium text-gray-900">
                            {suggestion.fieldPath.split('.').pop()?.replace(/([A-Z])/g, ' $1').trim()}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded ${getConfidenceColor(suggestion.confidence)} bg-gray-100`}>
                            {getConfidenceLabel(suggestion.confidence)}
                          </span>
                          {suggestion.autoApply && !isApplied && (
                            <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700">
                              Auto-Apply
                            </span>
                          )}
                          {isApplied && (
                            <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-700">
                              Applied ✓
                            </span>
                          )}
                        </div>

                        <div className="text-sm text-gray-600 mb-2">
                          <strong>Current:</strong> {
                            Array.isArray(suggestion.currentValue) 
                              ? suggestion.currentValue.join(', ') || '(empty)' 
                              : suggestion.currentValue || '(empty)'
                          }
                        </div>

                        <div className="text-sm text-gray-900 mb-2">
                          <strong>Suggested:</strong> {
                            Array.isArray(suggestion.suggestedValue) 
                              ? suggestion.suggestedValue.join(', ') 
                              : suggestion.suggestedValue
                          }
                        </div>

                        <p className="text-xs text-gray-500">{suggestion.reason}</p>
                      </div>

                      {!isApplied && (
                        <button
                          onClick={() => handleApplySuggestion(suggestion)}
                          className="ml-4 px-3 py-1 bg-indigo-100 text-indigo-700 rounded text-sm hover:bg-indigo-200"
                        >
                          Apply
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No suggestions available for this product.</p>
              <p className="text-sm mt-1">Product data looks complete!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SmartDetectPanel;