/**
 * Smart Detect Panel - Rule-based field suggestions
 */

import React, { useState, useEffect } from 'react';
import { callSmartDetect, SmartDetectResult, SmartDetectSuggestion } from '../../api/smartDetect';

interface SmartDetectPanelProps {
  productId: string;
  onApplySuggestion: (fieldPath: string, value: any) => void;
  onApplyAll: (suggestions: SmartDetectSuggestion[]) => void;
}

const SmartDetectPanel: React.FC<SmartDetectPanelProps> = ({
  productId,
  onApplySuggestion,
  onApplyAll,
}) => {
  const [result, setResult] = useState<SmartDetectResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appliedSuggestions, setAppliedSuggestions] = useState<Set<string>>(new Set());

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
    } catch (err) {
      console.error('Smart Detect error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load suggestions');
    } finally {
      setLoading(false);
    }
  };

  const handleApplySuggestion = (suggestion: SmartDetectSuggestion) => {
    onApplySuggestion(suggestion.fieldPath, suggestion.suggestedValue);
    setAppliedSuggestions(prev => new Set([...prev, suggestion.fieldPath]));
  };

  const handleApplyAll = () => {
    if (!result?.suggestions) return;
    
    const unapplied = result.suggestions.filter(s => !appliedSuggestions.has(s.fieldPath));
    onApplyAll(unapplied);
    
    // Mark all as applied
    const newApplied = new Set(appliedSuggestions);
    unapplied.forEach(s => newApplied.add(s.fieldPath));
    setAppliedSuggestions(newApplied);
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
                          {isApplied && (
                            <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-700">
                              Applied ●
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