/**
 * MPN Modal Component
 * 
 * Step 1 of product creation: Collect MPN only
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authFetch } from '../../services/authFetch';
import './MPNModal.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

interface MPNModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MPNModal({ isOpen, onClose }: MPNModalProps) {
  const [mpn, setMpn] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!mpn.trim()) {
      setError('MPN is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Call POST /api/products to create draft product
      const response = await authFetch(`${API_BASE}/api/products`, {
        method: 'POST',
        body: JSON.stringify({ mpn: mpn.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create product');
      }

      // Navigate based on whether product already existed
      if (data.existed) {
        // Product already exists, go to product detail page
        const normalizedMpn = data.product?.normalized_mpn || data.product?.id || mpn.trim();
        navigate(`/products/${normalizedMpn}`);
      } else {
        // New product created, go to Kick-off
        const normalizedMpn = data.product?.normalized_mpn || data.product?.id || mpn.trim();
        navigate(`/products/${normalizedMpn}/kickoff`);
      }
      
      onClose();
    } catch (err) {
      console.error('Error creating product:', err);
      setError(err instanceof Error ? err.message : 'Failed to create product');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setMpn('');
      setError(null);
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="mpn-modal" onClick={(e) => e.stopPropagation()}>
        <div className="mpn-modal__header">
          <h2 className="mpn-modal__title">Create New Product</h2>
          <p className="mpn-modal__subtitle">
            Enter the Manufacturer Part Number (MPN) to create a new product or navigate to an existing one.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mpn-modal__form">
          <div className="mpn-modal__field">
            <label htmlFor="mpn-input" className="mpn-modal__label">
              MPN (Manufacturer Part Number) *
            </label>
            <input
              id="mpn-input"
              type="text"
              className="mpn-modal__input"
              value={mpn}
              onChange={(e) => setMpn(e.target.value)}
              placeholder="Enter MPN..."
              autoFocus
              disabled={loading}
              aria-describedby={error ? 'mpn-error' : undefined}
            />
            {error && (
              <div id="mpn-error" className="mpn-modal__error" role="alert">
                {error}
              </div>
            )}
          </div>

          <div className="mpn-modal__actions">
            <button
              type="button"
              className="mpn-modal__button mpn-modal__button--secondary"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="mpn-modal__button mpn-modal__button--primary"
              disabled={!mpn.trim() || loading}
            >
              {loading ? (
                <>
                  <svg className="mpn-modal__spinner" width="16" height="16" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25"/>
                    <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor"/>
                  </svg>
                  Creating...
                </>
              ) : (
                'Create'
              )}
            </button>
          </div>
        </form>

        <div className="mpn-modal__info">
          <p className="mpn-modal__info-text">
            <strong>Note:</strong> MPN is the canonical product identifier and cannot be changed once created.
            If a product with this MPN already exists, you'll be taken to its detail page.
          </p>
        </div>
      </div>
    </div>
  );
}