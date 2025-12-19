/**
 * RevertModal Component
 * PVS-0.3.3 - Audit UI
 * 
 * Modal to confirm revert action with:
 * - Diff preview of changes
 * - Required reason input
 * - Product impact warning
 * - Explicit confirmation
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { AuditEvent, AttributeUsage } from '../hooks/useAudit';
import DiffViewer from './DiffViewer';
import styles from './AuditTab.module.css';

export interface RevertModalProps {
  isOpen: boolean;
  event: AuditEvent | null;
  usage: AttributeUsage | null;
  reverting: boolean;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}

/**
 * RevertModal component
 */
export function RevertModal({
  isOpen,
  event,
  usage,
  reverting,
  onConfirm,
  onClose,
}: RevertModalProps) {
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const reasonRef = useRef<HTMLTextAreaElement>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setReason('');
      setConfirmed(false);
      // Focus reason input when modal opens
      setTimeout(() => reasonRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !reverting) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, reverting, onClose]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (reason.trim() && confirmed) {
      onConfirm(reason.trim());
    }
  }, [reason, confirmed, onConfirm]);

  const isValid = reason.trim().length >= 10 && confirmed;
  const productCount = usage?.count ?? 0;

  if (!isOpen || !event) return null;

  // Determine what we're reverting TO (the before state of this event)
  const revertTarget = event.before;
  const currentState = event.after;

  return (
    <div
      className={styles.modalOverlay}
      onClick={(e) => {
        if (e.target === e.currentTarget && !reverting) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="revert-modal-title"
    >
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 id="revert-modal-title" className={styles.modalTitle}>
            ↩️ Revert Attribute
          </h2>
          <button
            type="button"
            className={styles.modalClose}
            onClick={onClose}
            disabled={reverting}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.modalContent}>
            {/* Warning banner */}
            <div className={styles.revertWarning}>
              <div className={styles.revertWarningIcon}>⚠️</div>
              <div className={styles.revertWarningText}>
                <strong>This action will restore the attribute to a previous state.</strong>
                <p>
                  You are reverting to the state <em>before</em> the "{event.action}" action
                  performed by {event.actorEmail || event.actor} on{' '}
                  {new Date(event.timestamp).toLocaleString()}.
                </p>
              </div>
            </div>

            {/* Product impact */}
            {productCount > 0 && (
              <div className={styles.revertImpact}>
                <div className={styles.revertImpactIcon}>📦</div>
                <div className={styles.revertImpactText}>
                  <strong>Potential Impact</strong>
                  <p>
                    This attribute is currently used by <strong>{productCount.toLocaleString()}</strong> product{productCount !== 1 ? 's' : ''}.
                    Reverting may affect how these products are displayed, validated, or exported.
                  </p>
                </div>
              </div>
            )}

            {/* Diff preview */}
            <div className={styles.revertDiff}>
              <h3 className={styles.revertDiffTitle}>Changes to be Applied</h3>
              <p className={styles.revertDiffDesc}>
                The attribute will be changed from the current state to the previous state:
              </p>
              <DiffViewer
                before={currentState}
                after={revertTarget}
                title="Revert changes"
              />
            </div>

            {/* Reason input */}
            <div className={styles.revertReasonSection}>
              <label htmlFor="revert-reason" className={styles.revertReasonLabel}>
                Reason for Revert <span className={styles.required}>*</span>
              </label>
              <textarea
                ref={reasonRef}
                id="revert-reason"
                className={styles.revertReasonInput}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain why you are reverting this change (min 10 characters)..."
                rows={3}
                disabled={reverting}
                aria-describedby="reason-help"
              />
              <p id="reason-help" className={styles.revertReasonHelp}>
                This reason will be recorded in the audit log for accountability.
                {reason.length > 0 && reason.length < 10 && (
                  <span className={styles.revertReasonCount}> ({10 - reason.length} more characters needed)</span>
                )}
              </p>
            </div>

            {/* Confirmation checkbox */}
            <div className={styles.revertConfirm}>
              <label className={styles.revertConfirmLabel}>
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  disabled={reverting}
                  className={styles.revertConfirmCheckbox}
                />
                <span>
                  I understand this action will modify the attribute and create a new audit event
                </span>
              </label>
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button
              type="button"
              className={styles.modalBtnSecondary}
              onClick={onClose}
              disabled={reverting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.modalBtnDanger}
              disabled={!isValid || reverting}
            >
              {reverting ? (
                <>
                  <span className={styles.spinnerSmall} />
                  Reverting...
                </>
              ) : (
                '↩️ Confirm Revert'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default RevertModal;
