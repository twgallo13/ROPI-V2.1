import type { SmartSuggestion } from '../../types/product';
import './SmartSuggestionsPanel.css';

/**
 * Smart Suggestions Panel
 * 
 * Display AI-generated suggestions with Apply/Ignore actions
 * 
 * TODO: Wire to AI suggestion service
 * References:
 * - Product Completion Workflows (W2): https://www.notion.so/2ba45ee1ec5a80698690f9492961ed8b
 * - Workflow W1 — Observations: https://www.notion.so/2b845ee1ec5a81b5a4a6d3ea439ec277
 */

interface SmartSuggestionsPanelProps {
  suggestions: SmartSuggestion[];
  onApplySuggestion: (id: string) => void;
  onIgnoreSuggestion: (id: string) => void;
}

function SmartSuggestionsPanel({ suggestions, onApplySuggestion, onIgnoreSuggestion }: SmartSuggestionsPanelProps) {
  const pendingSuggestions = suggestions.filter(s => s.status === 'pending');

  return (
    <div className="product-panel">
      <div className="product-panel-header">
        <h4 className="product-panel-title">Smart Suggestions</h4>
        <span className="product-panel-badge">{pendingSuggestions.length}</span>
      </div>
      
      <div className="product-panel-content">
        {pendingSuggestions.length === 0 ? (
          <p className="panel-empty">No pending suggestions</p>
        ) : (
          pendingSuggestions.map((suggestion) => (
            <div key={suggestion.id} className="suggestion-item">
              <div className="suggestion-header">
                <span className="suggestion-field">{formatField(suggestion.targetField)}</span>
                <span className={`suggestion-confidence ${getConfidenceClass(suggestion.confidence)}`}>
                  {suggestion.confidence}%
                </span>
              </div>
              
              <div className="suggestion-value-change">
                {suggestion.currentValue && (
                  <div className="suggestion-current">
                    <span className="suggestion-label">Current:</span>
                    <span className="suggestion-text">{suggestion.currentValue}</span>
                  </div>
                )}
                <div className="suggestion-proposed">
                  <span className="suggestion-label">Suggested:</span>
                  <span className="suggestion-text">{suggestion.proposedValue}</span>
                </div>
              </div>
              
              <p className="suggestion-reason">{suggestion.reason}</p>
              
              <div className="suggestion-actions">
                <button
                  className="suggestion-button suggestion-button-ignore"
                  onClick={() => onIgnoreSuggestion(suggestion.id)}
                >
                  Ignore
                </button>
                <button
                  className="suggestion-button suggestion-button-apply"
                  onClick={() => onApplySuggestion(suggestion.id)}
                >
                  Apply
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function formatField(field: string): string {
  return field
    .split('.')
    .pop()!
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
}

function getConfidenceClass(confidence: number): string {
  if (confidence >= 90) return 'confidence-high';
  if (confidence >= 70) return 'confidence-medium';
  return 'confidence-low';
}

export default SmartSuggestionsPanel;
