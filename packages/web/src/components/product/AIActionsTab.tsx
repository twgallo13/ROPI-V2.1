import { useState } from 'react';
import type { Product, AIHistoryEntry } from '../../types/product';
import './AIActionsTab.css';

/**
 * AI Actions Tab
 * 
 * AI-powered product enhancement tools and history
 * 
 * TODO: Wire to actual AI services (describe, fix attributes, etc.)
 * References:
 * - Product Completion Workflows (W2): https://www.notion.so/2ba45ee1ec5a80698690f9492961ed8b
 */

interface AIActionsTabProps {
  product: Product;
  onUpdate: (path: string, value: any) => void;
}

function AIActionsTab({ product, onUpdate }: AIActionsTabProps) {
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState<string>('');
  const [modalAction, setModalAction] = useState<string>('');

  const handleAIAction = (action: string) => {
    let content = '';
    
    switch (action) {
      case 'describe':
        content = 'Generated comprehensive product description based on attributes and images.';
        break;
      case 'fix_attributes':
        content = 'Analyzed product data and suggested 5 missing attributes.';
        break;
      case 're_run':
        content = 'Re-running AI analysis with updated product data...';
        break;
      default:
        content = 'AI action completed.';
    }
    
    setModalAction(action);
    setModalContent(content);
    setShowModal(true);

    // Add to history
    const newEntry: AIHistoryEntry = {
      id: `ai-${Date.now()}`,
      action,
      timestamp: new Date().toISOString(),
      result: content,
      confidence: Math.floor(Math.random() * 20) + 80, // Mock: 80-100
    };
    
    const newHistory = [...product.aiHistory, newEntry];
    onUpdate('aiHistory', newHistory);
  };

  return (
    <div className="editor-tab-content">
      <div className="form-section">
        <h3 className="form-section-title">AI Actions</h3>
        <div className="ai-actions-grid">
          <div className="ai-action-card">
            <div className="ai-action-icon">🤖</div>
            <h4 className="ai-action-title">Generate Descriptions</h4>
            <p className="ai-action-description">
              Create SEO-optimized product descriptions for all websites
            </p>
            <button
              className="ai-action-button"
              onClick={() => handleAIAction('describe')}
            >
              Generate
            </button>
          </div>

          <div className="ai-action-card">
            <div className="ai-action-icon">🔧</div>
            <h4 className="ai-action-title">Fix Attributes</h4>
            <p className="ai-action-description">
              Automatically detect and fill missing product attributes
            </p>
            <button
              className="ai-action-button"
              onClick={() => handleAIAction('fix_attributes')}
            >
              Fix Attributes
            </button>
          </div>

          <div className="ai-action-card">
            <div className="ai-action-icon">🔄</div>
            <h4 className="ai-action-title">Re-run Describe</h4>
            <p className="ai-action-description">
              Re-analyze product with current attributes and images
            </p>
            <button
              className="ai-action-button"
              onClick={() => handleAIAction('re_run')}
            >
              Re-run
            </button>
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3 className="form-section-title">AI History</h3>
        <div className="ai-history-list">
          {product.aiHistory.length === 0 ? (
            <p className="ai-history-empty">No AI actions performed yet</p>
          ) : (
            product.aiHistory.slice().reverse().map((entry) => (
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

      {showModal && (
        <div className="ai-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="ai-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ai-modal-header">
              <h3 className="ai-modal-title">AI Action: {formatAction(modalAction)}</h3>
              <button className="ai-modal-close" onClick={() => setShowModal(false)}>
                ×
              </button>
            </div>
            <div className="ai-modal-content">
              <p>{modalContent}</p>
              <div className="ai-modal-note">
                <strong>Note:</strong> This is a simulated AI action. Production version will call 
                actual AI services.
              </div>
            </div>
            <div className="ai-modal-footer">
              <button className="ai-modal-button" onClick={() => setShowModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="form-note">
        <p>
          <strong>Note:</strong> AI actions are UI simulations. Production will integrate with 
          actual AI services for description generation and attribute detection.
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

export default AIActionsTab;
