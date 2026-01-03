/**
 * Rule Test Console Component
 * LP-smart-rules-admin-1.0.0: Admin Settings Smart Rules Manager
 * 
 * Interactive test console for Smart Rules:
 * - Pick a product by MPN
 * - Run getProductSuggestions (non-mutating)
 * - Preview suggestions and conflicts
 * - Optionally apply with admin actor
 */

import { useState, useCallback } from 'react';
import { testRulesForProduct, applySuggestions } from '../../services/smartRulesAdmin';
import { authFetch } from '../../services/authFetch';
import type { RuleTestResult, RuleSuggestion, RuleConflict } from '../../types/smartRulesAdmin';

// ============================================================================
// Styles
// ============================================================================

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: 'var(--spacing-lg)',
    backgroundColor: 'var(--color-background)',
    borderRadius: '8px',
    border: '1px solid var(--color-border)',
  },
  header: {
    marginBottom: 'var(--spacing-lg)',
  },
  title: {
    fontSize: 'var(--font-size-lg)',
    fontWeight: 600,
    marginBottom: 'var(--spacing-sm)',
  },
  description: {
    color: 'var(--color-text-secondary)',
    fontSize: 'var(--font-size-sm)',
  },
  searchRow: {
    display: 'flex',
    gap: 'var(--spacing-md)',
    marginBottom: 'var(--spacing-lg)',
  },
  input: {
    flex: 1,
    padding: 'var(--spacing-sm) var(--spacing-md)',
    border: '1px solid var(--color-border)',
    borderRadius: '4px',
    fontSize: 'var(--font-size-base)',
  },
  button: {
    padding: 'var(--spacing-sm) var(--spacing-lg)',
    border: 'none',
    borderRadius: '4px',
    backgroundColor: 'var(--color-primary)',
    color: 'white',
    cursor: 'pointer',
    fontWeight: 500,
    whiteSpace: 'nowrap' as const,
  },
  buttonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  buttonSecondary: {
    backgroundColor: 'var(--color-background)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text)',
  },
  buttonSuccess: {
    backgroundColor: '#2e7d32',
  },
  results: {
    marginTop: 'var(--spacing-lg)',
  },
  resultSection: {
    marginBottom: 'var(--spacing-lg)',
  },
  sectionTitle: {
    fontSize: 'var(--font-size-base)',
    fontWeight: 600,
    marginBottom: 'var(--spacing-sm)',
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-sm)',
  },
  badge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: 'var(--font-size-xs)',
    fontWeight: 500,
  },
  badgeSuccess: {
    backgroundColor: '#e8f5e9',
    color: '#2e7d32',
  },
  badgeWarning: {
    backgroundColor: '#fff3e0',
    color: '#e65100',
  },
  badgeError: {
    backgroundColor: '#ffebee',
    color: '#c62828',
  },
  badgeInfo: {
    backgroundColor: '#e3f2fd',
    color: '#1565c0',
  },
  card: {
    padding: 'var(--spacing-md)',
    backgroundColor: 'var(--color-background-secondary)',
    borderRadius: '4px',
    border: '1px solid var(--color-border)',
    marginBottom: 'var(--spacing-sm)',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 'var(--spacing-sm)',
  },
  cardTitle: {
    fontWeight: 500,
  },
  cardMeta: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--color-text-secondary)',
  },
  valueRow: {
    display: 'flex',
    gap: 'var(--spacing-md)',
    alignItems: 'center',
    fontSize: 'var(--font-size-sm)',
  },
  valueLabel: {
    fontWeight: 500,
    minWidth: '100px',
  },
  valueOld: {
    textDecoration: 'line-through',
    color: 'var(--color-text-secondary)',
  },
  valueNew: {
    color: '#2e7d32',
    fontWeight: 500,
  },
  arrow: {
    color: 'var(--color-text-secondary)',
  },
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: 'var(--spacing-xl)',
    color: 'var(--color-text-secondary)',
  },
  errorBox: {
    padding: 'var(--spacing-md)',
    backgroundColor: '#ffebee',
    borderRadius: '4px',
    border: '1px solid #ffcdd2',
    color: '#c62828',
    marginBottom: 'var(--spacing-md)',
  },
  successBox: {
    padding: 'var(--spacing-md)',
    backgroundColor: '#e8f5e9',
    borderRadius: '4px',
    border: '1px solid #c8e6c9',
    color: '#2e7d32',
    marginBottom: 'var(--spacing-md)',
  },
  statsRow: {
    display: 'flex',
    gap: 'var(--spacing-lg)',
    marginBottom: 'var(--spacing-md)',
    padding: 'var(--spacing-md)',
    backgroundColor: 'var(--color-background-secondary)',
    borderRadius: '4px',
  },
  stat: {
    textAlign: 'center' as const,
  },
  statValue: {
    fontSize: 'var(--font-size-xl)',
    fontWeight: 600,
  },
  statLabel: {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--color-text-secondary)',
  },
  conflictCard: {
    padding: 'var(--spacing-md)',
    backgroundColor: '#fff3e0',
    borderRadius: '4px',
    border: '1px solid #ffe0b2',
    marginBottom: 'var(--spacing-sm)',
  },
  conflictCandidate: {
    padding: 'var(--spacing-sm)',
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: '4px',
    marginTop: 'var(--spacing-xs)',
    fontSize: 'var(--font-size-sm)',
  },
};

// ============================================================================
// Component
// ============================================================================

export function RuleTestConsole() {
  // State
  const [searchInput, setSearchInput] = useState(''); // Can be productId or MPN
  // Lisa's canonical: Default to MPN as canonical lookup for product testing
  const [searchType, setSearchType] = useState<'productId' | 'mpn'>('mpn');
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RuleTestResult | null>(null);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set());
  const [applyResult, setApplyResult] = useState<{ appliedCount: number; skippedCount: number } | null>(null);
  const [resolvedProductId, setResolvedProductId] = useState<string | null>(null);
  
  // Resolve product ID from search input
  // Lisa's canonical: Use /api/products/by-mpn/:mpn for MPN lookup
  const resolveProductId = useCallback(async (input: string, type: 'productId' | 'mpn'): Promise<string | null> => {
    const trimmed = input.trim();
    
    if (type === 'productId') {
      // Direct productId lookup
      return trimmed;
    }
    
    // MPN lookup - use authenticated fetch for the server endpoint
    try {
      const apiBaseUrl = import.meta.env?.VITE_API_BASE_URL || '';
      const response = await authFetch(`${apiBaseUrl}/api/products/by-mpn/${encodeURIComponent(trimmed)}`);
      
      if (!response.ok) {
        if (response.status === 401) {
          console.error('MPN lookup auth failed - user may need to sign in');
          throw new Error('AUTH_REQUIRED');
        }
        if (response.status === 404) {
          return null; // Product not found
        }
        const text = await response.text();
        console.error('MPN lookup failed:', response.status, text);
        return null;
      }
      
      const data = await response.json();
      const productId = data.productId || data.id;
      
      if (!productId) {
        console.error('MPN lookup response malformed:', data);
        return null;
      }
      
      console.log(`Resolved MPN "${trimmed}" to productId "${productId}"`);
      return productId;
    } catch (err) {
      console.error('MPN lookup error:', err);
      // Re-throw auth errors so UI can handle
      if (err instanceof Error && err.message === 'AUTH_REQUIRED') {
        throw err;
      }
      return null;
    }
  }, []);
  
  // Test rules for product
  const handleTest = useCallback(async () => {
    if (!searchInput.trim()) {
      setError('Please enter a Product ID or MPN');
      return;
    }
    
    setLoading(true);
    setError(null);
    setResult(null);
    setSelectedSuggestions(new Set());
    setApplyResult(null);
    setResolvedProductId(null);
    
    try {
      // Step 1: Resolve product ID
      const productId = await resolveProductId(searchInput, searchType);
      
      if (!productId) {
        setError('PRODUCT_NOT_FOUND: Could not resolve product from input');
        return;
      }
      
      setResolvedProductId(productId);
      
      // Step 2: Test rules for resolved product
      const testResult = await testRulesForProduct(productId);
      setResult(testResult);
      
      // Auto-select all suggestions
      const allIds = new Set(testResult.suggestions.map(s => s.suggestionId));
      setSelectedSuggestions(allIds);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to test rules';
      // Check for specific error patterns
      if (errorMessage === 'AUTH_REQUIRED' || errorMessage.includes('Not authenticated')) {
        setError('AUTH_REQUIRED: Please sign in to test rules');
      } else if (errorMessage.includes('not found') || errorMessage.includes('Product') || errorMessage === 'PRODUCT_NOT_FOUND') {
        setError(`PRODUCT_NOT_FOUND: ${errorMessage}`);
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }, [searchInput, searchType, resolveProductId]);
  
  // Toggle suggestion selection
  const toggleSuggestion = useCallback((suggestionId: string) => {
    setSelectedSuggestions(prev => {
      const next = new Set(prev);
      if (next.has(suggestionId)) {
        next.delete(suggestionId);
      } else {
        next.add(suggestionId);
      }
      return next;
    });
  }, []);
  
  // Select all / deselect all
  const toggleAll = useCallback(() => {
    if (!result) return;
    
    if (selectedSuggestions.size === result.suggestions.length) {
      setSelectedSuggestions(new Set());
    } else {
      setSelectedSuggestions(new Set(result.suggestions.map(s => s.suggestionId)));
    }
  }, [result, selectedSuggestions.size]);
  
  // Apply selected suggestions
  const handleApply = useCallback(async () => {
    if (selectedSuggestions.size === 0 || !result) return;
    
    setApplying(true);
    setError(null);
    setApplyResult(null);
    
    try {
      const applyRes = await applySuggestions(result.productId, Array.from(selectedSuggestions));
      setApplyResult(applyRes);
      
      // Clear result to encourage re-testing
      setResult(null);
      setSelectedSuggestions(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply suggestions');
    } finally {
      setApplying(false);
    }
  }, [result, selectedSuggestions]);
  
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>🧪 Rule Test Console</h3>
        <p style={styles.description}>
          Test Smart Rules against a product to preview suggestions before applying.
          This is a non-destructive preview until you click Apply.
        </p>
      </div>
      
      {/* Search */}
      <div style={styles.searchRow}>
        <select
          style={{ ...styles.input, flex: '0 0 120px' }}
          value={searchType}
          onChange={e => setSearchType(e.target.value as 'productId' | 'mpn')}
        >
          <option value="productId">Product ID</option>
          <option value="mpn">MPN</option>
        </select>
        <input
          type="text"
          style={styles.input}
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleTest()}
          placeholder={searchType === 'productId' ? 'Enter product ID (e.g., 451-9201-BLK18)...' : 'Enter MPN...'}
        />
        <button
          style={{
            ...styles.button,
            ...(loading ? styles.buttonDisabled : {}),
          }}
          onClick={handleTest}
          disabled={loading}
        >
          {loading ? '⏳ Testing...' : '🔍 Test Rules'}
        </button>
      </div>
      
      {/* Resolved Product ID */}
      {resolvedProductId && !error && (
        <div style={{ 
          padding: 'var(--spacing-sm)', 
          backgroundColor: 'var(--color-background-secondary)', 
          borderRadius: '4px',
          marginBottom: 'var(--spacing-md)',
          fontSize: 'var(--font-size-sm)',
        }}>
          📌 Testing product: <strong>{resolvedProductId}</strong>
        </div>
      )}
      
      {/* Error */}
      {error && (
        <div style={styles.errorBox}>
          ❌ {error}
          {error.includes('PRODUCT_NOT_FOUND') && (
            <div style={{ marginTop: 'var(--spacing-sm)', fontSize: 'var(--font-size-sm)' }}>
              💡 Tip: Make sure the product exists in Firestore. Try using the exact product ID.
            </div>
          )}
        </div>
      )}
      
      {/* Apply Success */}
      {applyResult && (
        <div style={styles.successBox}>
          ✅ Applied {applyResult.appliedCount} suggestion(s) successfully
          {applyResult.skippedCount > 0 && ` (${applyResult.skippedCount} skipped)`}
        </div>
      )}
      
      {/* Results */}
      {result && (
        <div style={styles.results}>
          {/* Stats */}
          <div style={styles.statsRow}>
            <div style={styles.stat}>
              <div style={styles.statValue}>{result.rulesEvaluated}</div>
              <div style={styles.statLabel}>Rules Evaluated</div>
            </div>
            <div style={styles.stat}>
              <div style={{ ...styles.statValue, color: '#2e7d32' }}>{result.suggestions.length}</div>
              <div style={styles.statLabel}>Suggestions</div>
            </div>
            <div style={styles.stat}>
              <div style={{ ...styles.statValue, color: '#e65100' }}>{result.conflicts.length}</div>
              <div style={styles.statLabel}>Conflicts</div>
            </div>
            <div style={styles.stat}>
              <div style={{ ...styles.statValue, color: '#c62828' }}>{result.errors.length}</div>
              <div style={styles.statLabel}>Errors</div>
            </div>
          </div>
          
          {/* Suggestions */}
          <div style={styles.resultSection}>
            <div style={styles.sectionTitle}>
              <span>💡 Suggestions</span>
              <span style={{ ...styles.badge, ...styles.badgeSuccess }}>
                {result.suggestions.length}
              </span>
              {result.suggestions.length > 0 && (
                <button
                  style={{ ...styles.button, ...styles.buttonSecondary, padding: '2px 8px', fontSize: 'var(--font-size-xs)' }}
                  onClick={toggleAll}
                >
                  {selectedSuggestions.size === result.suggestions.length ? 'Deselect All' : 'Select All'}
                </button>
              )}
            </div>
            
            {result.suggestions.length === 0 ? (
              <div style={styles.emptyState}>
                No suggestions generated for this product
              </div>
            ) : (
              result.suggestions.map(suggestion => (
                <SuggestionCard
                  key={suggestion.suggestionId}
                  suggestion={suggestion}
                  selected={selectedSuggestions.has(suggestion.suggestionId)}
                  onToggle={() => toggleSuggestion(suggestion.suggestionId)}
                />
              ))
            )}
          </div>
          
          {/* Conflicts */}
          {result.conflicts.length > 0 && (
            <div style={styles.resultSection}>
              <div style={styles.sectionTitle}>
                <span>⚠️ Conflicts</span>
                <span style={{ ...styles.badge, ...styles.badgeWarning }}>
                  {result.conflicts.length}
                </span>
              </div>
              
              {result.conflicts.map(conflict => (
                <ConflictCard key={conflict.conflictId} conflict={conflict} />
              ))}
            </div>
          )}
          
          {/* Errors */}
          {result.errors.length > 0 && (
            <div style={styles.resultSection}>
              <div style={styles.sectionTitle}>
                <span>❌ Errors</span>
                <span style={{ ...styles.badge, ...styles.badgeError }}>
                  {result.errors.length}
                </span>
              </div>
              
              {result.errors.map((error, i) => (
                <div key={i} style={styles.errorBox}>
                  <strong>Rule: {error.ruleId}</strong>
                  <div>{error.error}</div>
                  {error.code && <div style={{ fontSize: 'var(--font-size-xs)' }}>Code: {error.code}</div>}
                </div>
              ))}
            </div>
          )}
          
          {/* Apply Button */}
          {result.suggestions.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-lg)' }}>
              <span style={{ alignSelf: 'center', color: 'var(--color-text-secondary)' }}>
                {selectedSuggestions.size} of {result.suggestions.length} selected
              </span>
              <button
                style={{
                  ...styles.button,
                  ...styles.buttonSuccess,
                  ...(applying || selectedSuggestions.size === 0 ? styles.buttonDisabled : {}),
                }}
                onClick={handleApply}
                disabled={applying || selectedSuggestions.size === 0}
              >
                {applying ? '⏳ Applying...' : `✅ Apply ${selectedSuggestions.size} Suggestion(s)`}
              </button>
            </div>
          )}
        </div>
      )}
      
      {/* Empty State */}
      {!result && !loading && !error && !applyResult && (
        <div style={styles.emptyState}>
          <div style={{ fontSize: '3rem', marginBottom: 'var(--spacing-md)' }}>🧪</div>
          <div>Enter a product MPN and click "Test Rules" to preview suggestions</div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Sub-Components
// ============================================================================

interface SuggestionCardProps {
  suggestion: RuleSuggestion;
  selected: boolean;
  onToggle: () => void;
}

function SuggestionCard({ suggestion, selected, onToggle }: SuggestionCardProps) {
  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <div>
          <div style={styles.cardTitle}>{suggestion.ruleName}</div>
          <div style={styles.cardMeta}>
            Rule ID: {suggestion.ruleId} • Confidence: {Math.round(suggestion.confidence * 100)}%
          </div>
        </div>
        <input
          type="checkbox"
          style={styles.checkbox}
          checked={selected}
          onChange={onToggle}
        />
      </div>
      
      <div style={styles.valueRow}>
        <span style={styles.valueLabel}>{suggestion.targetField}:</span>
        {suggestion.currentValue !== undefined && (
          <>
            <span style={styles.valueOld}>{String(suggestion.currentValue)}</span>
            <span style={styles.arrow}>→</span>
          </>
        )}
        <span style={styles.valueNew}>{String(suggestion.suggestedValue)}</span>
        {suggestion.isOverwrite && (
          <span style={{ ...styles.badge, ...styles.badgeWarning }}>Overwrite</span>
        )}
      </div>
      
      <div style={{ marginTop: 'var(--spacing-xs)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
        {suggestion.reason}
      </div>
    </div>
  );
}

interface ConflictCardProps {
  conflict: RuleConflict;
}

function ConflictCard({ conflict }: ConflictCardProps) {
  return (
    <div style={styles.conflictCard}>
      <div style={styles.cardTitle}>
        Field: <strong>{conflict.field}</strong>
      </div>
      <div style={{ fontSize: 'var(--font-size-sm)', marginTop: 'var(--spacing-xs)' }}>
        Multiple rules want to set this field:
      </div>
      
      {conflict.candidates.map((candidate, i) => (
        <div key={i} style={styles.conflictCandidate}>
          <strong>{candidate.ruleName}</strong> (Priority: {candidate.priority})
          <div>
            Value: <span style={styles.valueNew}>{String(candidate.value)}</span>
            {' '}• Confidence: {Math.round(candidate.confidence * 100)}%
          </div>
        </div>
      ))}
      
      {conflict.suggestedResolution && (
        <div style={{ marginTop: 'var(--spacing-sm)', fontSize: 'var(--font-size-sm)' }}>
          <strong>Suggested Resolution:</strong> Use "{conflict.suggestedResolution.ruleId}"
          <div style={{ color: 'var(--color-text-secondary)' }}>{conflict.suggestedResolution.reason}</div>
        </div>
      )}
    </div>
  );
}

export default RuleTestConsole;
