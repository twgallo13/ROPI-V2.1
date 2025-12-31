/**
 * CandidateCard Component
 * 
 * LP-obs-studio-cleanup-1.6.5: Individual candidate card with Apply/Edit/Try Again controls.
 * 
 * Features:
 * - Display candidate text
 * - Meta info (observations count, tags count)
 * - Apply button (primary action)
 * - Inline edit mode
 * - Try Again button to regenerate
 * 
 * References:
 * - Product Completion Workflows (W2): https://www.notion.so/2ba45ee1ec5a80698690f9492961ed8b
 */

import { useState } from 'react';
import './CandidateCard.css';

export interface CandidateMeta {
  observationsCount: number;
  tagsCount: number;
}

export interface Candidate {
  id: string;
  text: string;
  meta: CandidateMeta;
}

interface CandidateCardProps {
  /** The candidate data */
  candidate: Candidate;
  /** Apply callback */
  onApply: () => void;
  /** Edit callback - receives the new text */
  onEdit: (newText: string) => void;
  /** Try again callback */
  onTryAgain: () => void;
  /** Whether apply is in progress */
  isApplying?: boolean;
  /** Whether controls are disabled */
  disabled?: boolean;
}

function CandidateCard({
  candidate,
  onApply,
  onEdit,
  onTryAgain,
  isApplying = false,
  disabled = false,
}: CandidateCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(candidate.text);

  const handleStartEdit = () => {
    setEditedText(candidate.text);
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (editedText.trim() && editedText !== candidate.text) {
      onEdit(editedText.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditedText(candidate.text);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancelEdit();
    } else if (e.key === 'Enter' && e.metaKey) {
      handleSaveEdit();
    }
  };

  return (
    <div className={`candidate-card ${isApplying ? 'candidate-card-applying' : ''}`}>
      {/* Candidate Content */}
      <div className="candidate-content">
        {isEditing ? (
          <textarea
            className="candidate-edit-textarea"
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            rows={4}
          />
        ) : (
          <p className="candidate-text">{candidate.text}</p>
        )}
      </div>

      {/* Meta Info */}
      <div className="candidate-meta">
        <span className="candidate-meta-item">
          <span className="meta-icon">📝</span>
          <span className="meta-value">{candidate.meta.observationsCount}</span>
          <span className="meta-label">obs</span>
        </span>
        <span className="candidate-meta-item">
          <span className="meta-icon">🏷️</span>
          <span className="meta-value">{candidate.meta.tagsCount}</span>
          <span className="meta-label">tags</span>
        </span>
      </div>

      {/* Actions */}
      <div className="candidate-actions">
        {isEditing ? (
          <>
            <button
              className="candidate-action-button candidate-save-button"
              onClick={handleSaveEdit}
            >
              Save
            </button>
            <button
              className="candidate-action-button candidate-cancel-button"
              onClick={handleCancelEdit}
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              className="candidate-action-button candidate-apply-button"
              onClick={onApply}
              disabled={disabled || isApplying}
            >
              {isApplying ? (
                <span className="applying-indicator">⏳ Applying...</span>
              ) : (
                <>
                  <span className="action-icon">✓</span>
                  <span>Apply</span>
                </>
              )}
            </button>
            <button
              className="candidate-action-button candidate-edit-button"
              onClick={handleStartEdit}
              disabled={disabled || isApplying}
            >
              <span className="action-icon">✏️</span>
              <span>Edit</span>
            </button>
            <button
              className="candidate-action-button candidate-try-again-button"
              onClick={onTryAgain}
              disabled={disabled || isApplying}
            >
              <span className="action-icon">🔄</span>
              <span>Try Again</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default CandidateCard;
