/**
 * Confirm Modal Component
 * 
 * Reusable confirmation dialog for destructive actions (delete, disable, etc).
 * Replaces window.confirm() with a styled inline modal.
 * 
 * Features:
 * - Customizable title and message
 * - Primary destructive action and cancel buttons
 * - Loading state during action execution
 * - Keyboard support (Enter to confirm, Esc to cancel)
 * - Close button and overlay dismiss
 * - Accessible ARIA attributes
 * 
 * Usage:
 * ```tsx
 * const [showConfirm, setShowConfirm] = useState(false);
 * 
 * const handleDelete = async () => {
 *   await deleteItem();
 *   setShowConfirm(false);
 * };
 * 
 * return (
 *   <>
 *     <button onClick={() => setShowConfirm(true)}>Delete</button>
 *     <ConfirmModal
 *       isOpen={showConfirm}
 *       title="Delete Item?"
 *       message="This cannot be undone."
 *       confirmLabel="Delete"
 *       isLoading={isDeleting}
 *       isDangerous={true}
 *       onConfirm={handleDelete}
 *       onCancel={() => setShowConfirm(false)}
 *     />
 *   </>
 * );
 * ```
 */

import { useState, useEffect } from 'react';
import './ConfirmModal.css';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDangerous?: boolean;
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDangerous = false,
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const [isExecuting, setIsExecuting] = useState(false);

  // Handle keyboard events
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      } else if (e.key === 'Enter' && !isExecuting && !isLoading) {
        handleConfirm();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isExecuting, isLoading, onCancel]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsExecuting(true);
    try {
      const result = onConfirm();
      if (result instanceof Promise) {
        await result;
      }
    } catch (error) {
      // Error handling is delegated to the parent component
      console.error('ConfirmModal action failed:', error);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !isExecuting && !isLoading) {
      onCancel();
    }
  };

  const isDisabled = isExecuting || isLoading;

  return (
    <div
      className="confirm-modal-overlay"
      onClick={handleOverlayClick}
      role="presentation"
    >
      <div
        className="confirm-modal"
        role="alertdialog"
        aria-labelledby="confirm-modal-title"
        aria-describedby="confirm-modal-message"
        aria-modal="true"
      >
        <div className="confirm-modal-header">
          <h2 id="confirm-modal-title" className="confirm-modal-title">
            {title}
          </h2>
          <button
            className="confirm-modal-close"
            onClick={onCancel}
            disabled={isDisabled}
            aria-label="Close dialog"
            type="button"
          >
            ✕
          </button>
        </div>

        <div className="confirm-modal-content">
          <p id="confirm-modal-message" className="confirm-modal-message">
            {message}
          </p>
        </div>

        <div className="confirm-modal-footer">
          <button
            className="btn-secondary"
            onClick={onCancel}
            disabled={isDisabled}
            type="button"
          >
            {cancelLabel}
          </button>
          <button
            className={`btn-primary ${isDangerous ? 'btn-danger' : ''}`}
            onClick={handleConfirm}
            disabled={isDisabled}
            type="button"
          >
            {isExecuting || isLoading ? (
              <>
                <span className="button-spinner"></span>
                {confirmLabel}
              </>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;
