import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/apiFetch';

interface TestPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  templateKey?: string;
  promptBody: string;
  conditions: Array<{
    id: string;
    type: 'site' | 'attribute';
    attributeId?: string;
    operator?: 'equals' | 'contains' | 'not_equals';
    value: string;
  }>;
  modelSettings: {
    model: string;
    max_tokens: number;
    temperature: number;
  };
}

interface Product {
  id: string;
  mpn: string;
  brand?: string;
  name?: string;
  attributes?: Record<string, any>;
  site?: string;
}

function TestPreviewModal({ 
  isOpen, 
  onClose, 
  templateKey, 
  promptBody, 
  conditions, 
  modelSettings 
}: TestPreviewModalProps) {
  const [testMpn, setTestMpn] = useState('');
  const [testSite, setTestSite] = useState('shiekh');
  const [product, setProduct] = useState<Product | null>(null);
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [conditionsMatch, setConditionsMatch] = useState<Array<{
    condition: any;
    matches: boolean;
    reason: string;
  }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sample MPN suggestions
  const SAMPLE_MPNS = [
    'CU4495-101', 'DZ5485-200', 'FZ5002-063', 'DR5522-001', 'CW1590-117'
  ];

  const AVAILABLE_SITES = [
    'shiekh', 'ccs', 'zumiez', 'tillys', 'pacsun', 'vans', 'nike', 'adidas'
  ];

  useEffect(() => {
    if (!isOpen) {
      // Reset state when modal closes
      setTestMpn('');
      setProduct(null);
      setGeneratedPrompt('');
      setConditionsMatch([]);
      setError(null);
    }
  }, [isOpen]);

  async function handlePreviewGenerate() {
    if (!testMpn.trim()) {
      setError('Please enter an MPN to test');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // First, test the template logic
      const previewData = await apiFetch<any>('/api/admin/ai-templates/preview', {
        method: 'POST',
        body: JSON.stringify({
          templateKey: templateKey || 'test_template',
          promptBody,
          conditions,
          modelSettings,
          testProduct: {
            mpn: testMpn,
            site: testSite
          }
        })
      });

      setProduct(previewData.product || { id: 'test', mpn: testMpn, site: testSite });
      setGeneratedPrompt(previewData.generatedPrompt || 'Error generating prompt');
      setConditionsMatch(previewData.conditionsMatch || []);

    } catch (err: any) {
      console.error('Preview error:', err);
      setError(err.message || 'Failed to generate preview');
    } finally {
      setLoading(false);
    }
  }

  function evaluateConditionsLocally(): Array<{ condition: any; matches: boolean; reason: string }> {
    if (!product) return [];

    return conditions.map(condition => {
      if (condition.type === 'site') {
        const matches = product.site === condition.value;
        return {
          condition,
          matches,
          reason: matches 
            ? `Site "${product.site}" matches "${condition.value}"` 
            : `Site "${product.site || 'unknown'}" does not match "${condition.value}"`
        };
      } else if (condition.type === 'attribute') {
        const attrValue = product.attributes?.[condition.attributeId || ''];
        if (!attrValue) {
          return {
            condition,
            matches: false,
            reason: `Attribute "${condition.attributeId}" not found on product`
          };
        }

        const operator = condition.operator || 'equals';
        let matches = false;
        
        if (operator === 'equals') {
          matches = String(attrValue).toLowerCase() === condition.value.toLowerCase();
        } else if (operator === 'contains') {
          matches = String(attrValue).toLowerCase().includes(condition.value.toLowerCase());
        } else if (operator === 'not_equals') {
          matches = String(attrValue).toLowerCase() !== condition.value.toLowerCase();
        }

        return {
          condition,
          matches,
          reason: matches 
            ? `Attribute "${condition.attributeId}" (${attrValue}) ${operator} "${condition.value}"` 
            : `Attribute "${condition.attributeId}" (${attrValue}) does not ${operator} "${condition.value}"`
        };
      }

      return { condition, matches: false, reason: 'Unknown condition type' };
    });
  }

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        width: 'min(90vw, 1000px)',
        maxHeight: '85vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '1rem 1.5rem',
          borderBottom: '1px solid var(--color-border, #eee)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h3 style={{ margin: 0, fontSize: '1.25rem' }}>
            Test Template Preview
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: 'var(--color-text-secondary, #666)',
              padding: '0.25rem'
            }}
          >
            ×
          </button>
        </div>

        {/* Modal Content */}
        <div style={{ 
          padding: '1.5rem',
          overflowY: 'auto',
          flex: 1
        }}>
          
          {/* Test Input Section */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ marginTop: 0, marginBottom: '0.75rem' }}>Test Product</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: '0.75rem', alignItems: 'end' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                  MPN
                </label>
                <input
                  type="text"
                  value={testMpn}
                  onChange={(e) => setTestMpn(e.target.value)}
                  placeholder="Enter product MPN..."
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid var(--color-border, #ccc)',
                    borderRadius: '4px',
                    fontSize: '0.875rem'
                  }}
                />
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary, #666)', marginTop: '0.25rem' }}>
                  Try: {SAMPLE_MPNS.join(', ')}
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                  Site
                </label>
                <select
                  value={testSite}
                  onChange={(e) => setTestSite(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid var(--color-border, #ccc)',
                    borderRadius: '4px',
                    fontSize: '0.875rem'
                  }}
                >
                  {AVAILABLE_SITES.map(site => (
                    <option key={site} value={site}>{site}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={handlePreviewGenerate}
                disabled={loading}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: 'var(--color-primary, #007bff)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '0.875rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1
                }}
              >
                {loading ? 'Generating...' : 'Generate Preview'}
              </button>
            </div>
          </div>

          {error && (
            <div style={{
              padding: '0.75rem',
              backgroundColor: 'var(--color-error-bg, #fef2f2)',
              border: '1px solid var(--color-error, #dc3545)',
              borderRadius: '4px',
              color: 'var(--color-error, #dc3545)',
              marginBottom: '1rem',
              fontSize: '0.875rem'
            }}>
              {error}
            </div>
          )}

          {/* Results Section */}
          {(product || conditionsMatch.length > 0 || generatedPrompt) && (
            <div style={{ display: 'grid', gap: '1.5rem' }}>
              
              {/* Conditions Evaluation */}
              {conditions.length > 0 && (
                <div>
                  <h4 style={{ marginTop: 0, marginBottom: '0.75rem' }}>Condition Evaluation</h4>
                  <div style={{ border: '1px solid var(--color-border, #eee)', borderRadius: '6px' }}>
                    {(conditionsMatch.length > 0 ? conditionsMatch : evaluateConditionsLocally()).map((result, index) => (
                      <div 
                        key={index}
                        style={{
                          padding: '0.75rem',
                          borderBottom: index < conditions.length - 1 ? '1px solid var(--color-border, #eee)' : 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem'
                        }}
                      >
                        <div style={{
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          backgroundColor: result.matches ? 'var(--color-success, #28a745)' : 'var(--color-error, #dc3545)',
                          flexShrink: 0
                        }} />
                        <div style={{ fontSize: '0.875rem' }}>
                          {result.reason}
                        </div>
                      </div>
                    ))}
                    
                    {/* Overall Match Result */}
                    <div style={{
                      padding: '0.75rem',
                      backgroundColor: (conditionsMatch.length > 0 ? conditionsMatch : evaluateConditionsLocally()).every(r => r.matches) 
                        ? 'var(--color-success-bg, #f0f9f0)' 
                        : 'var(--color-warning-bg, #fff8f0)',
                      borderTop: '1px solid var(--color-border, #eee)',
                      fontWeight: 'bold',
                      fontSize: '0.875rem'
                    }}>
                      Template {(conditionsMatch.length > 0 ? conditionsMatch : evaluateConditionsLocally()).every(r => r.matches) ? 'WILL' : 'will NOT'} be selected for this product
                    </div>
                  </div>
                </div>
              )}

              {/* Generated Prompt Preview */}
              {generatedPrompt && (
                <div>
                  <h4 style={{ marginTop: 0, marginBottom: '0.75rem' }}>Generated Prompt</h4>
                  <div style={{
                    border: '1px solid var(--color-border, #ddd)',
                    borderRadius: '6px',
                    backgroundColor: 'var(--color-bg-secondary, #f8f9fa)'
                  }}>
                    <div style={{
                      padding: '0.75rem',
                      borderBottom: '1px solid var(--color-border, #ddd)',
                      fontSize: '0.75rem',
                      color: 'var(--color-text-secondary, #666)',
                      display: 'flex',
                      justifyContent: 'space-between'
                    }}>
                      <span>Model: {modelSettings.model} | Tokens: {modelSettings.max_tokens} | Temperature: {modelSettings.temperature}</span>
                      <span>Length: {generatedPrompt.length} characters</span>
                    </div>
                    <pre style={{
                      padding: '1rem',
                      margin: 0,
                      fontSize: '0.875rem',
                      lineHeight: '1.4',
                      whiteSpace: 'pre-wrap',
                      fontFamily: '"Monaco", "Consolas", "Courier New", monospace',
                      maxHeight: '300px',
                      overflow: 'auto'
                    }}>
                      {generatedPrompt}
                    </pre>
                  </div>
                </div>
              )}

              {/* Product Details */}
              {product && (
                <div>
                  <h4 style={{ marginTop: 0, marginBottom: '0.75rem' }}>Product Details</h4>
                  <div style={{
                    border: '1px solid var(--color-border, #ddd)',
                    borderRadius: '6px',
                    padding: '1rem',
                    backgroundColor: 'var(--color-bg-secondary, #f8f9fa)'
                  }}>
                    <div style={{ fontSize: '0.875rem', lineHeight: '1.6' }}>
                      <div><strong>MPN:</strong> {product.mpn}</div>
                      <div><strong>Site:</strong> {product.site || 'Not specified'}</div>
                      {product.brand && <div><strong>Brand:</strong> {product.brand}</div>}
                      {product.name && <div><strong>Name:</strong> {product.name}</div>}
                      
                      {product.attributes && Object.keys(product.attributes).length > 0 && (
                        <div style={{ marginTop: '0.75rem' }}>
                          <strong>Attributes:</strong>
                          <div style={{ 
                            marginTop: '0.25rem',
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: '0.25rem',
                            fontSize: '0.8125rem'
                          }}>
                            {Object.entries(product.attributes).map(([key, value]) => (
                              <div key={key} style={{ color: 'var(--color-text-secondary, #666)' }}>
                                {key}: {String(value)}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Empty State */}
          {!product && !generatedPrompt && !error && !loading && (
            <div style={{
              textAlign: 'center',
              padding: '3rem 1rem',
              color: 'var(--color-text-secondary, #666)',
              fontSize: '0.875rem'
            }}>
              Enter an MPN and click "Generate Preview" to test how this template will work.
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '1rem 1.5rem',
          borderTop: '1px solid var(--color-border, #eee)',
          display: 'flex',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: 'var(--color-secondary, #6c757d)',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '0.875rem',
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default TestPreviewModal;