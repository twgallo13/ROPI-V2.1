/**
 * TargetAccordion Component
 * 
 * LP-obs-studio-cleanup-1.6.5: Per-target panel for AI candidates display.
 * Renders an accordion panel for each target website containing:
 * - Header with target name, status, and tag count
 * - Generated using X observations and Y tags footnote
 * - Show contributing observations toggle
 * - Candidate cards with Apply/Edit/Try Again controls
 * - SEO preview area
 * 
 * References:
 * - Product Completion Workflows (W2): https://www.notion.so/2ba45ee1ec5a80698690f9492961ed8b
 */

import { useState } from 'react';
import CandidateCard from './CandidateCard';
import './TargetAccordion.css';

export interface Candidate {
  id: string;
  text: string;
  meta: {
    observationsCount: number;
    tagsCount: number;
  };
}

export interface SEOData {
  title: string;
  bullets: string[];
}

export interface ContributingObservation {
  id: string;
  text: string;
  tags: string[];
}

export interface TargetResult {
  target: string;
  candidates: Candidate[];
  seo?: SEOData;
  meta: {
    observationsCount: number;
    tagsCount: number;
  };
  contributingObservations?: ContributingObservation[];
  status?: 'idle' | 'generating' | 'complete' | 'error';
}

interface TargetAccordionProps {
  /** Target result data */
  result: TargetResult;
  /** Whether this panel is expanded */
  isExpanded: boolean;
  /** Toggle expansion callback */
  onToggle: () => void;
  /** Apply a candidate to the product */
  onApplyCandidate: (targetId: string, candidate: Candidate) => Promise<void>;
  /** Edit a candidate inline */
  onEditCandidate: (targetId: string, candidate: Candidate, newText: string) => void;
  /** Regenerate candidates for this target */
  onTryAgain: (targetId: string) => Promise<void>;
  /** Apply SEO data to the product */
  onApplySEO: (targetId: string, seo: SEOData) => Promise<void>;
  /** Edit SEO data */
  onEditSEO: (targetId: string, seo: SEOData) => void;
  /** Regenerate SEO for this target */
  onTryAgainSEO: (targetId: string) => Promise<void>;
  /** Whether actions are disabled (e.g., during loading) */
  disabled?: boolean;
}

/** Display name for target sites */
const TARGET_DISPLAY_NAMES: Record<string, string> = {
  'shiekh.com': 'Shiekh',
  'shiekh': 'Shiekh',
  'karmaloop': 'Karmaloop',
  'karmaloop.com': 'Karmaloop',
  'mltd': 'MLTD',
  'mltd.com': 'MLTD',
};

/** Status icons */
const STATUS_ICONS: Record<string, string> = {
  idle: '⚪',
  generating: '🔄',
  complete: '✅',
  error: '❌',
};

function TargetAccordion({
  result,
  isExpanded,
  onToggle,
  onApplyCandidate,
  onEditCandidate,
  onTryAgain,
  onApplySEO,
  onEditSEO,
  onTryAgainSEO,
  disabled = false,
}: TargetAccordionProps) {
  const [showContributing, setShowContributing] = useState(false);
  const [applyingCandidateId, setApplyingCandidateId] = useState<string | null>(null);
  const [applyingSEO, setApplyingSEO] = useState(false);
  const [editingSEO, setEditingSEO] = useState(false);
  const [editedSEO, setEditedSEO] = useState<SEOData | null>(null);
  const [showUndoToast, setShowUndoToast] = useState(false);
  // lastApplied tracks what was applied for undo feature (future enhancement)
  const [_lastApplied, setLastApplied] = useState<{ type: 'candidate' | 'seo'; data: unknown } | null>(null);

  const displayName = TARGET_DISPLAY_NAMES[result.target] || result.target;
  const statusIcon = STATUS_ICONS[result.status || 'idle'];

  const handleApplyCandidate = async (candidate: Candidate) => {
    if (disabled || applyingCandidateId) return;
    
    setApplyingCandidateId(candidate.id);
    try {
      await onApplyCandidate(result.target, candidate);
      setLastApplied({ type: 'candidate', data: candidate });
      setShowUndoToast(true);
      setTimeout(() => setShowUndoToast(false), 5000);
    } finally {
      setApplyingCandidateId(null);
    }
  };

  const handleApplySEO = async () => {
    if (disabled || applyingSEO || !result.seo) return;
    
    const seoToApply = editedSEO || result.seo;
    setApplyingSEO(true);
    try {
      await onApplySEO(result.target, seoToApply);
      setEditingSEO(false);
      setEditedSEO(null);
      setLastApplied({ type: 'seo', data: seoToApply });
      setShowUndoToast(true);
      setTimeout(() => setShowUndoToast(false), 5000);
    } finally {
      setApplyingSEO(false);
    }
  };

  const handleEditSEO = () => {
    setEditingSEO(true);
    setEditedSEO(result.seo || { title: '', bullets: [] });
  };

  const handleSaveSEOEdit = () => {
    if (editedSEO) {
      onEditSEO(result.target, editedSEO);
    }
    setEditingSEO(false);
  };

  const handleCancelSEOEdit = () => {
    setEditingSEO(false);
    setEditedSEO(null);
  };

  return (
    <div className={`target-accordion ${isExpanded ? 'target-accordion-expanded' : ''}`}>
      {/* Accordion Header */}
      <button 
        className="target-accordion-header"
        onClick={onToggle}
        aria-expanded={isExpanded}
      >
        <div className="target-header-left">
          <span className="target-status-icon">{statusIcon}</span>
          <span className="target-name">{displayName}</span>
          {result.candidates.length > 0 && (
            <span className="target-candidate-count">
              {result.candidates.length} candidate{result.candidates.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="target-header-right">
          <span className="target-tag-count">
            {result.meta.tagsCount} tags
          </span>
          <span className="target-expand-icon">
            {isExpanded ? '▼' : '▶'}
          </span>
        </div>
      </button>

      {/* Accordion Body */}
      {isExpanded && (
        <div className="target-accordion-body">
          {/* Footnote with observation/tag counts */}
          <div className="target-meta-footnote">
            <span className="footnote-icon">💡</span>
            <span className="footnote-text">
              Generated using <strong>{result.meta.observationsCount}</strong> observation{result.meta.observationsCount !== 1 ? 's' : ''} and{' '}
              <strong>{result.meta.tagsCount}</strong> tag{result.meta.tagsCount !== 1 ? 's' : ''}
            </span>
            {result.contributingObservations && result.contributingObservations.length > 0 && (
              <button 
                className="show-contributing-button"
                onClick={() => setShowContributing(!showContributing)}
              >
                {showContributing ? 'Hide' : 'Show'} contributing observations
              </button>
            )}
          </div>

          {/* Contributing Observations List */}
          {showContributing && result.contributingObservations && (
            <div className="contributing-observations">
              <div className="contributing-list">
                {result.contributingObservations.map((obs) => (
                  <div key={obs.id} className="contributing-item">
                    <span className="contributing-text">{obs.text}</span>
                    {obs.tags.length > 0 && (
                      <div className="contributing-tags">
                        {obs.tags.map((tag, i) => (
                          <span key={i} className="contributing-tag">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Candidates List */}
          {result.candidates.length > 0 ? (
            <div className="target-candidates">
              <h4 className="candidates-header">Candidates</h4>
              <div className="candidates-list">
                {result.candidates.map((candidate) => (
                  <CandidateCard
                    key={candidate.id}
                    candidate={candidate}
                    onApply={() => handleApplyCandidate(candidate)}
                    onEdit={(newText: string) => onEditCandidate(result.target, candidate, newText)}
                    onTryAgain={() => onTryAgain(result.target)}
                    isApplying={applyingCandidateId === candidate.id}
                    disabled={disabled}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="no-candidates">
              <p>No candidates generated yet.</p>
              <button 
                className="try-again-button"
                onClick={() => onTryAgain(result.target)}
                disabled={disabled}
              >
                Generate Candidates
              </button>
            </div>
          )}

          {/* SEO Area */}
          {result.seo && (
            <div className="target-seo">
              <h4 className="seo-header">SEO Metadata</h4>
              {editingSEO && editedSEO ? (
                <div className="seo-edit-form">
                  <label className="seo-edit-label">
                    Title
                    <input
                      type="text"
                      value={editedSEO.title}
                      onChange={(e) => setEditedSEO({ ...editedSEO, title: e.target.value })}
                      className="seo-edit-input"
                    />
                  </label>
                  <label className="seo-edit-label">
                    Bullets
                    <textarea
                      value={editedSEO.bullets.join('\n')}
                      onChange={(e) => setEditedSEO({ ...editedSEO, bullets: e.target.value.split('\n') })}
                      className="seo-edit-textarea"
                      rows={4}
                    />
                  </label>
                  <div className="seo-edit-actions">
                    <button onClick={handleSaveSEOEdit} className="seo-save-button">Save</button>
                    <button onClick={handleCancelSEOEdit} className="seo-cancel-button">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="seo-preview">
                  <div className="seo-title-preview">
                    <span className="seo-label">Title:</span>
                    <span className="seo-value">{result.seo.title}</span>
                  </div>
                  {result.seo.bullets.length > 0 && (
                    <div className="seo-bullets-preview">
                      <span className="seo-label">Bullets:</span>
                      <ul className="seo-bullets-list">
                        {result.seo.bullets.map((bullet, i) => (
                          <li key={i}>{bullet}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="seo-actions">
                    <button
                      className="seo-apply-button"
                      onClick={handleApplySEO}
                      disabled={disabled || applyingSEO}
                    >
                      {applyingSEO ? '⏳' : '✓'} Apply
                    </button>
                    <button
                      className="seo-edit-button"
                      onClick={handleEditSEO}
                      disabled={disabled}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      className="seo-try-again-button"
                      onClick={() => onTryAgainSEO(result.target)}
                      disabled={disabled}
                    >
                      🔄 Try Again
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Undo Toast */}
      {showUndoToast && (
        <div className="undo-toast">
          <span>✓ Applied — </span>
          <button 
            className="undo-button"
            onClick={() => {
              // Undo logic would go here
              setShowUndoToast(false);
            }}
          >
            Undo
          </button>
        </div>
      )}
    </div>
  );
}

export default TargetAccordion;
