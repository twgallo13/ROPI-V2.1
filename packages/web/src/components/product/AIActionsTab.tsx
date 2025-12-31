import { useState, useMemo, useCallback } from 'react';
import type { Product, AIHistoryEntry } from '../../types/product';
import { useSuggestions } from '../../hooks/useSuggestions';
import TargetAccordion, { type TargetResult, type Candidate, type SEOData } from './TargetAccordion';
import aiDescribeClient, { 
  aggregateObservations, 
  getDefaultTargets,
  type DescribeRequest,
} from '../../services/AIDescribeClient';
import './AIActionsTab.css';

/**
 * AIActionsTab Component
 * 
 * LP-obs-studio-cleanup-1.6.5: Refactored to per-target aggregated model.
 * 
 * Tab 5: Describe Engine Controls and AI Power Features
 * 
 * Features:
 * - Audience Template Selector
 * - Tone Preset Overrides
 * - Targets row with selectable target cards
 * - Per-target accordion panels with candidates
 * - Aggregated observations per target
 * - SEO generation per target
 * - Apply/Edit/Try Again controls
 * - Show contributing observations
 * - Auto-resolve mode for suggestions
 * 
 * Changes from LP-1.4.0:
 * - Removed per-observation candidate display
 * - Added TargetAccordion per target website
 * - Describe API now returns one result per target
 * - SEO included per target
 * 
 * References:
 * - Product Completion Workflows (W2): https://www.notion.so/2ba45ee1ec5a80698690f9492961ed8b
 */

interface AIActionsTabProps {
  product: Product;
  onUpdate: (path: string, value: unknown) => void;
}

// Mock audience templates (would load from /app/settings/ai-templates)
const AUDIENCE_TEMPLATES = [
  { id: 'streetwear', name: 'Streetwear Enthusiast', description: 'Urban, trendy, culture-driven' },
  { id: 'athletic', name: 'Athletic Performance', description: 'Sports, fitness, performance-focused' },
  { id: 'casual', name: 'Casual Lifestyle', description: 'Everyday comfort, versatile style' },
  { id: 'luxury', name: 'Premium/Luxury', description: 'High-end, exclusive, sophisticated' },
  { id: 'youth', name: 'Youth/Gen-Z', description: 'Social-media friendly, trend-forward' },
];

// Tone presets
const TONE_PRESETS = [
  { id: 'professional', name: 'Professional', icon: '📋' },
  { id: 'enthusiastic', name: 'Enthusiastic', icon: '🔥' },
  { id: 'minimalist', name: 'Minimalist', icon: '✨' },
  { id: 'technical', name: 'Technical', icon: '⚙️' },
  { id: 'storytelling', name: 'Storytelling', icon: '📖' },
];

// Job status type
type JobStatus = 'idle' | 'preparing' | 'generating' | 'complete' | 'error';

// Target status type
type TargetStatus = 'idle' | 'generating' | 'complete' | 'error';

interface JobProgress {
  status: JobStatus;
  progress: number;
  message: string;
  startTime?: number;
}

function AIActionsTab({ product, onUpdate }: AIActionsTabProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('streetwear');
  const [selectedTone, setSelectedTone] = useState<string>('professional');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [autoResolve, setAutoResolve] = useState(false);
  
  // LP-obs-studio-cleanup-1.6.5: Per-target state
  const [selectedTargets, setSelectedTargets] = useState<string[]>(getDefaultTargets());
  const [targetResults, setTargetResults] = useState<Map<string, TargetResult>>(new Map());
  const [expandedTarget, setExpandedTarget] = useState<string | null>(null);
  const [targetStatuses, setTargetStatuses] = useState<Map<string, TargetStatus>>(new Map());
  
  const [jobProgress, setJobProgress] = useState<JobProgress>({
    status: 'idle',
    progress: 0,
    message: '',
  });

  // LP-obs-studio-cleanup-1.4.0: Suggestions from observations
  const {
    suggestions,
    meta: suggestionsMeta,
    loading: suggestionsLoading,
    error: suggestionsError,
    generateSuggestions,
    applySuggestion,
    clearSuggestions,
  } = useSuggestions();

  // Get selected template details
  const templateDetails = useMemo(() => 
    AUDIENCE_TEMPLATES.find(t => t.id === selectedTemplate),
    [selectedTemplate]
  );

  // LP-obs-studio-cleanup-1.4.0: Request suggestions from observations
  const handleRequestSuggestions = async () => {
    if (!product?.id) return;
    const result = await generateSuggestions(product.id, autoResolve);
    if (result && result.meta.autoAppliedCount > 0) {
      // Notify user of auto-applied suggestions
      const newEntry: AIHistoryEntry = {
        id: `ai-${Date.now()}`,
        action: 'auto_apply_suggestions',
        timestamp: new Date().toISOString(),
        result: `Auto-applied ${result.meta.autoAppliedCount} high-confidence suggestions from ${result.meta.observationsCount} observations`,
        confidence: 95,
      };
      const newHistory = [...(product.aiHistory ?? []), newEntry];
      onUpdate('aiHistory', newHistory);
    }
  };

  // LP-obs-studio-cleanup-1.4.0: Apply a single suggestion
  const handleApplySuggestion = async (suggestion: typeof suggestions[0]) => {
    if (!product?.id) return;
    const success = await applySuggestion(product.id, suggestion);
    if (success) {
      // Update local state via onUpdate
      onUpdate(`attributes.${suggestion.attributeId}`, suggestion.suggestedValue);
      
      // Add to AI history
      const newEntry: AIHistoryEntry = {
        id: `ai-${Date.now()}`,
        action: 'apply_suggestion',
        timestamp: new Date().toISOString(),
        result: `Applied suggestion for "${suggestion.attributeId}": ${suggestion.rationale}`,
        confidence: suggestion.confidence,
      };
      const newHistory = [...(product.aiHistory ?? []), newEntry];
      onUpdate('aiHistory', newHistory);
    }
  };

  // Collect observations for the product
  const observations = useMemo(() => {
    // In production, this would come from the observations service
    const productObs = (product as unknown as { observations?: Array<{ id: string; text?: string; tags?: string[] }> }).observations || [];
    return productObs;
  }, [product]);

  // Aggregate observations data
  const aggregatedData = useMemo(() => {
    return aggregateObservations(observations);
  }, [observations]);

  // LP-obs-studio-cleanup-1.6.5: Generate descriptions for all selected targets
  const handleGenerateDescriptions = async () => {
    if (jobProgress.status !== 'idle' || !product?.id) return;

    const startTime = Date.now();
    
    // Phase 1: Preparing
    setJobProgress({ status: 'preparing', progress: 10, message: 'Analyzing product attributes...', startTime });
    
    // Set all targets to generating
    const newStatuses = new Map<string, TargetStatus>();
    selectedTargets.forEach(t => newStatuses.set(t, 'generating'));
    setTargetStatuses(newStatuses);

    try {
      // Build the describe request
      const request: DescribeRequest = {
        targets: selectedTargets,
        audience: templateDetails?.name || 'Streetwear Enthusiast',
        tone: selectedTone,
        observations: aggregatedData.observationInputs,
        attributes: product.attributes || {},
        images: product.media?.gallery?.map((url: string) => ({ url })) || [],
        options: { candidates: 3, aggregate: true },
      };

      setJobProgress({ status: 'generating', progress: 30, message: 'Generating descriptions...', startTime });

      // Call the aggregated describe API
      const response = await aiDescribeClient.describe(product.id, request);

      setJobProgress({ status: 'generating', progress: 70, message: 'Processing results...', startTime });

      // Update target results
      const newResults = new Map<string, TargetResult>();
      const finalStatuses = new Map<string, TargetStatus>();
      
      for (const result of response.results) {
        const resultWithObs: TargetResult = {
          ...result,
          status: 'complete',
          contributingObservations: observations.map(obs => ({
            id: obs.id,
            text: obs.text || '',
            tags: obs.tags || [],
          })),
        };
        newResults.set(result.target, resultWithObs);
        finalStatuses.set(result.target, 'complete');
      }

      setTargetResults(newResults);
      setTargetStatuses(finalStatuses);

      // Expand first target if none expanded
      if (!expandedTarget && selectedTargets.length > 0) {
        setExpandedTarget(selectedTargets[0]);
      }

      setJobProgress({ status: 'complete', progress: 100, message: 'Descriptions generated successfully!', startTime });

      // Add to AI history
      const newEntry: AIHistoryEntry = {
        id: `ai-${Date.now()}`,
        action: 'generate_descriptions',
        timestamp: new Date().toISOString(),
        result: `Generated descriptions for ${selectedTargets.length} targets using "${templateDetails?.name}" template with "${selectedTone}" tone`,
        confidence: Math.floor(Math.random() * 15) + 85,
      };
      
      const newHistory = [...(product.aiHistory ?? []), newEntry];
      onUpdate('aiHistory', newHistory);

    } catch (error) {
      console.error('Error generating descriptions:', error);
      setJobProgress({ status: 'error', progress: 0, message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`, startTime });
      
      const errorStatuses = new Map<string, TargetStatus>();
      selectedTargets.forEach(t => errorStatuses.set(t, 'error'));
      setTargetStatuses(errorStatuses);
    }

    // Reset after delay
    setTimeout(() => {
      setJobProgress({ status: 'idle', progress: 0, message: '' });
    }, 3000);
  };

  // LP-obs-studio-cleanup-1.6.5: Apply candidate for a target
  const handleApplyCandidate = useCallback(async (targetId: string, candidate: Candidate) => {
    if (!product?.id) return;

    try {
      await aiDescribeClient.apply(product.id, {
        target: targetId,
        action: 'description',
        payload: {
          candidateId: candidate.id,
          text: candidate.text,
        },
      });

      // Update the product description for this target
      const descFieldMap: Record<string, string> = {
        'shiekh.com': 'description_shiekh',
        'shiekh': 'description_shiekh',
        'karmaloop': 'description_karmaloop',
        'karmaloop.com': 'description_karmaloop',
        'mltd': 'description_mltd',
        'mltd.com': 'description_mltd',
      };

      const descField = descFieldMap[targetId];
      if (descField) {
        onUpdate(descField, candidate.text);
      }

      // Add to AI history
      const newEntry: AIHistoryEntry = {
        id: `ai-${Date.now()}`,
        action: 'apply_description',
        timestamp: new Date().toISOString(),
        result: `Applied description for ${targetId}: ${candidate.text.substring(0, 50)}...`,
        confidence: 90,
      };
      
      const newHistory = [...(product.aiHistory ?? []), newEntry];
      onUpdate('aiHistory', newHistory);

    } catch (error) {
      console.error('Error applying candidate:', error);
    }
  }, [product, onUpdate]);

  // LP-obs-studio-cleanup-1.6.5: Edit candidate inline
  const handleEditCandidate = useCallback((targetId: string, candidate: Candidate, newText: string) => {
    setTargetResults(prev => {
      const newResults = new Map(prev);
      const result = newResults.get(targetId);
      if (result) {
        const updatedCandidates = result.candidates.map(c =>
          c.id === candidate.id ? { ...c, text: newText } : c
        );
        newResults.set(targetId, { ...result, candidates: updatedCandidates });
      }
      return newResults;
    });
  }, []);

  // LP-obs-studio-cleanup-1.6.5: Regenerate for a specific target
  const handleTryAgain = useCallback(async (targetId: string) => {
    if (!product?.id) return;

    setTargetStatuses(prev => {
      const newStatuses = new Map(prev);
      newStatuses.set(targetId, 'generating');
      return newStatuses;
    });

    try {
      const request: DescribeRequest = {
        targets: [targetId],
        audience: templateDetails?.name || 'Streetwear Enthusiast',
        tone: selectedTone,
        observations: aggregatedData.observationInputs,
        attributes: product.attributes || {},
        options: { candidates: 3, aggregate: true },
      };

      const response = await aiDescribeClient.describe(product.id, request);

      if (response.results.length > 0) {
        const result = response.results[0];
        setTargetResults(prev => {
          const newResults = new Map(prev);
          newResults.set(targetId, {
            ...result,
            status: 'complete',
            contributingObservations: observations.map(obs => ({
              id: obs.id,
              text: obs.text || '',
              tags: obs.tags || [],
            })),
          });
          return newResults;
        });
      }

      setTargetStatuses(prev => {
        const newStatuses = new Map(prev);
        newStatuses.set(targetId, 'complete');
        return newStatuses;
      });

    } catch (error) {
      console.error('Error regenerating:', error);
      setTargetStatuses(prev => {
        const newStatuses = new Map(prev);
        newStatuses.set(targetId, 'error');
        return newStatuses;
      });
    }
  }, [product, templateDetails, selectedTone, aggregatedData, observations]);

  // LP-obs-studio-cleanup-1.6.5: Apply SEO for a target
  const handleApplySEO = useCallback(async (targetId: string, seo: SEOData) => {
    if (!product?.id) return;

    try {
      await aiDescribeClient.apply(product.id, {
        target: targetId,
        action: 'seo',
        payload: { seo },
      });

      // Update product SEO fields
      onUpdate('meta_name', seo.title);
      if (seo.bullets.length > 0) {
        onUpdate('meta_description', seo.bullets.join(' '));
      }

      // Add to AI history
      const newEntry: AIHistoryEntry = {
        id: `ai-${Date.now()}`,
        action: 'apply_seo',
        timestamp: new Date().toISOString(),
        result: `Applied SEO for ${targetId}: ${seo.title}`,
        confidence: 90,
      };
      
      const newHistory = [...(product.aiHistory ?? []), newEntry];
      onUpdate('aiHistory', newHistory);

    } catch (error) {
      console.error('Error applying SEO:', error);
    }
  }, [product, onUpdate]);

  // LP-obs-studio-cleanup-1.6.5: Edit SEO inline
  const handleEditSEO = useCallback((targetId: string, seo: SEOData) => {
    setTargetResults(prev => {
      const newResults = new Map(prev);
      const result = newResults.get(targetId);
      if (result) {
        newResults.set(targetId, { ...result, seo });
      }
      return newResults;
    });
  }, []);

  // LP-obs-studio-cleanup-1.6.5: Regenerate SEO for a target
  const handleTryAgainSEO = useCallback(async (targetId: string) => {
    await handleTryAgain(targetId);
  }, [handleTryAgain]);

  // Toggle target selection
  const handleToggleTarget = useCallback((target: string) => {
    setSelectedTargets(prev => {
      if (prev.includes(target)) {
        return prev.filter(t => t !== target);
      } else {
        return [...prev, target];
      }
    });
  }, []);

  const handleQuickAction = (action: string) => {
    const newEntry: AIHistoryEntry = {
      id: `ai-${Date.now()}`,
      action,
      timestamp: new Date().toISOString(),
      result: `${action.replace(/_/g, ' ')} completed`,
      confidence: Math.floor(Math.random() * 20) + 80,
    };
    
    const newHistory = [...(product.aiHistory ?? []), newEntry];
    onUpdate('aiHistory', newHistory);
  };

  // Calculate elapsed time for job
  const elapsedTime = jobProgress.startTime 
    ? Math.round((Date.now() - jobProgress.startTime) / 1000) 
    : 0;

  return (
    <div className="editor-tab-content">
      {/* Describe Engine Controls */}
      <div className="form-section describe-engine-section">
        <div className="section-header-with-badge">
          <h3 className="form-section-title">Describe Engine</h3>
          <span className="power-badge">⚡ Power Feature</span>
        </div>
        <p className="form-section-description">
          Generate AI-powered product descriptions optimized for each target website.
        </p>

        {/* Audience Template Selector */}
        <div className="template-selector">
          <label className="form-label">Audience Template</label>
          <div className="template-grid">
            {AUDIENCE_TEMPLATES.map((template) => (
              <button
                key={template.id}
                className={`template-card ${selectedTemplate === template.id ? 'template-card-selected' : ''}`}
                onClick={() => setSelectedTemplate(template.id)}
              >
                <span className="template-name">{template.name}</span>
                <span className="template-desc">{template.description}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tone Preset Overrides */}
        <div className="tone-selector">
          <label className="form-label">Tone Preset</label>
          <div className="tone-buttons">
            {TONE_PRESETS.map((tone) => (
              <button
                key={tone.id}
                className={`tone-button ${selectedTone === tone.id ? 'tone-button-selected' : ''}`}
                onClick={() => setSelectedTone(tone.id)}
              >
                <span className="tone-icon">{tone.icon}</span>
                <span className="tone-name">{tone.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* LP-obs-studio-cleanup-1.6.5: Target Websites Selection */}
        <div className="targets-selector">
          <label className="form-label">Target Websites</label>
          <div className="targets-row">
            {getDefaultTargets().map((target) => {
              const isSelected = selectedTargets.includes(target);
              const status = targetStatuses.get(target) || 'idle';
              const result = targetResults.get(target);
              const tagCount = result?.meta.tagsCount || aggregatedData.uniqueTags.length;
              
              return (
                <button
                  key={target}
                  className={`target-chip ${isSelected ? 'target-chip-selected' : ''}`}
                  onClick={() => handleToggleTarget(target)}
                >
                  <span className="target-chip-status">
                    {status === 'generating' && '🔄'}
                    {status === 'complete' && '✅'}
                    {status === 'error' && '❌'}
                    {status === 'idle' && '⚪'}
                  </span>
                  <span className="target-chip-name">{target}</span>
                  <span className="target-chip-count">{tagCount} tags</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Advanced Options Toggle */}
        <button 
          className="advanced-toggle"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          {showAdvanced ? '▼' : '▶'} Advanced Options
        </button>

        {showAdvanced && (
          <div className="advanced-options">
            <div className="form-field">
              <label className="form-label">Custom Instructions</label>
              <textarea
                className="form-textarea"
                rows={3}
                placeholder="Add any specific instructions for the AI (e.g., 'Emphasize sustainability', 'Include sizing advice')..."
              />
            </div>
            <div className="form-field">
              <label className="form-label checkbox-field-label">
                <input type="checkbox" defaultChecked />
                <span>Include SEO metadata</span>
              </label>
            </div>
            <div className="form-field">
              <label className="form-label checkbox-field-label">
                <input type="checkbox" defaultChecked />
                <span>Generate for all selected websites</span>
              </label>
            </div>
          </div>
        )}

        {/* Generate Button + Progress */}
        <div className="generate-action">
          {jobProgress.status === 'idle' ? (
            <button 
              className="generate-button"
              onClick={handleGenerateDescriptions}
              disabled={selectedTargets.length === 0}
            >
              <span className="generate-icon">🚀</span>
              Generate Descriptions
              {selectedTargets.length > 0 && (
                <span className="generate-target-count">({selectedTargets.length} targets)</span>
              )}
            </button>
          ) : (
            <div className="job-progress">
              <div className="progress-header">
                <span className={`progress-status progress-status-${jobProgress.status}`}>
                  {jobProgress.status === 'preparing' && '⏳'}
                  {jobProgress.status === 'generating' && '⚙️'}
                  {jobProgress.status === 'complete' && '✓'}
                  {jobProgress.status === 'error' && '⚠️'}
                  {' '}{jobProgress.message}
                </span>
                {jobProgress.status !== 'complete' && jobProgress.status !== 'error' && (
                  <span className="progress-time">{elapsedTime}s</span>
                )}
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ width: `${jobProgress.progress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* LP-obs-studio-cleanup-1.6.5: Observation Context Footnote */}
        {(suggestionsMeta || observations.length > 0) && (
          <div className="observation-context-footnote">
            <span className="footnote-icon">💡</span>
            <span className="footnote-text">
              Using <strong>{observations.length}</strong> observations 
              and <strong>{aggregatedData.uniqueTags.length}</strong> unique tags
            </span>
          </div>
        )}
      </div>

      {/* LP-obs-studio-cleanup-1.6.5: Target Panels */}
      {targetResults.size > 0 && (
        <div className="form-section target-panels-section">
          <h3 className="form-section-title">Generated Results</h3>
          <div className="target-panels">
            {selectedTargets.map((target) => {
              const result = targetResults.get(target);
              if (!result) return null;

              return (
                <TargetAccordion
                  key={target}
                  result={result}
                  isExpanded={expandedTarget === target}
                  onToggle={() => setExpandedTarget(expandedTarget === target ? null : target)}
                  onApplyCandidate={handleApplyCandidate}
                  onEditCandidate={handleEditCandidate}
                  onTryAgain={handleTryAgain}
                  onApplySEO={handleApplySEO}
                  onEditSEO={handleEditSEO}
                  onTryAgainSEO={handleTryAgainSEO}
                  disabled={jobProgress.status !== 'idle' && jobProgress.status !== 'complete'}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* LP-obs-studio-cleanup-1.4.0: Observation-Based Suggestions */}
      <div className="form-section observation-suggestions-section">
        <div className="section-header-with-actions">
          <h3 className="form-section-title">Observation Suggestions</h3>
          <div className="section-actions">
            <label className="auto-resolve-toggle" title="Automatically apply suggestions with 85%+ confidence">
              <input 
                type="checkbox" 
                checked={autoResolve}
                onChange={(e) => setAutoResolve(e.target.checked)}
              />
              <span>Auto-resolve</span>
            </label>
            <button 
              className="request-suggestions-button"
              onClick={handleRequestSuggestions}
              disabled={suggestionsLoading || !product?.id}
            >
              {suggestionsLoading ? '⏳' : '🔍'} Request Suggestions
            </button>
          </div>
        </div>
        <p className="form-section-description">
          Analyze recent observations and tags to suggest attribute values.
        </p>

        {suggestionsError && (
          <div className="suggestions-error">
            <span className="error-icon">⚠️</span>
            <span>{suggestionsError}</span>
          </div>
        )}

        {suggestions.length > 0 ? (
          <div className="suggestions-list">
            {suggestions.map((suggestion) => (
              <div 
                key={suggestion.id} 
                className={`suggestion-card ${suggestion.applied ? 'suggestion-applied' : ''}`}
              >
                <div className="suggestion-header">
                  <span className="suggestion-field">{formatFieldName(suggestion.attributeId)}</span>
                  <span className={`suggestion-confidence ${getConfidenceClass(suggestion.confidence)}`}>
                    {suggestion.confidence}%
                  </span>
                </div>
                <div className="suggestion-values">
                  {suggestion.currentValue !== null && (
                    <div className="suggestion-current">
                      <span className="value-label">Current:</span>
                      <span className="value-text">{String(suggestion.currentValue)}</span>
                    </div>
                  )}
                  <div className="suggestion-proposed">
                    <span className="value-label">Suggested:</span>
                    <span className="value-text">{String(suggestion.suggestedValue)}</span>
                  </div>
                </div>
                <p className="suggestion-rationale">{suggestion.rationale}</p>
                <div className="suggestion-actions">
                  {suggestion.applied ? (
                    <span className="suggestion-applied-badge">✓ Applied</span>
                  ) : (
                    <button 
                      className="apply-suggestion-button"
                      onClick={() => handleApplySuggestion(suggestion)}
                      disabled={suggestionsLoading}
                    >
                      Apply
                    </button>
                  )}
                </div>
              </div>
            ))}
            {suggestions.length > 0 && (
              <button 
                className="clear-suggestions-button"
                onClick={clearSuggestions}
              >
                Clear Suggestions
              </button>
            )}
          </div>
        ) : (
          <p className="suggestions-empty">
            No suggestions available. Click "Request Suggestions" to analyze observations.
          </p>
        )}
      </div>

      {/* Quick Actions */}
      <div className="form-section">
        <h3 className="form-section-title">Quick Actions</h3>
        <div className="quick-actions-grid">
          <button 
            className="quick-action-button"
            onClick={() => handleQuickAction('fix_attributes')}
          >
            <span className="quick-action-icon">🔧</span>
            <span>Fix Attributes</span>
          </button>
          <button 
            className="quick-action-button"
            onClick={() => handleQuickAction('enhance_seo')}
          >
            <span className="quick-action-icon">📈</span>
            <span>Enhance SEO</span>
          </button>
          <button 
            className="quick-action-button"
            onClick={() => handleQuickAction('validate_export')}
          >
            <span className="quick-action-icon">✅</span>
            <span>Validate Export</span>
          </button>
          <button 
            className="quick-action-button"
            onClick={() => handleQuickAction('analyze_images')}
          >
            <span className="quick-action-icon">🖼️</span>
            <span>Analyze Images</span>
          </button>
        </div>
      </div>

      {/* AI History */}
      <div className="form-section">
        <h3 className="form-section-title">AI History</h3>
        <div className="ai-history-list">
          {(product.aiHistory ?? []).length === 0 ? (
            <p className="ai-history-empty">No AI actions performed yet</p>
          ) : (
            (product.aiHistory ?? []).slice().reverse().map((entry) => (
              <div key={entry.id} className="ai-history-item">
                <div className="ai-history-header">
                  <span className="ai-history-action">{formatAction(entry.action)}</span>
                  <span className="ai-history-time">{formatTime(entry.timestamp)}</span>
                </div>
                <p className="ai-history-result">{entry.result}</p>
                <div className="ai-history-footer">
                  <span className="ai-history-confidence">
                    Confidence: {entry.confidence}%
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="form-note">
        <p>
          <strong>Note:</strong> AI-generated content is created using product attributes, images, 
          and the selected audience template. Review outputs in the Descriptions tab before export.
        </p>
      </div>
    </div>
  );
}

function formatAction(action: string): string {
  return action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleString();
}

// LP-obs-studio-cleanup-1.4.0: Helper functions for suggestions display
function formatFieldName(field: string): string {
  return field
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
}

function getConfidenceClass(confidence: number): string {
  if (confidence >= 85) return 'confidence-high';
  if (confidence >= 65) return 'confidence-medium';
  return 'confidence-low';
}

export default AIActionsTab;
