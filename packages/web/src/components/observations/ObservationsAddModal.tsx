/**
 * ObservationsAddModal Component
 * 
 * LP-observations-consolidation-1.3.0: Tags-first modal for adding observations.
 * Uses TagsEditor (from LP-1.2.0) and saves via PATCH API.
 * 
 * This modal opens INLINE (no route navigation) after a product is resolved
 * via ScanOrManualMPN component.
 * 
 * Write path: PATCH /api/products/:productId/observation
 * 
 * References:
 * - LP-observations-consolidation-1.3.0: Replace legacy add flow
 * - LP-observations-consolidation-1.2.0: TagsEditor component
 */

import { useState, useCallback } from 'react';
import TagsEditor, { getTagsEditorPayload } from './TagsEditor';
import { authFetch } from '../../services/authFetch';
import type { ResolvedProduct } from './ScanOrManualMPN';
import './ObservationsAddModal.css';

interface ObservationsAddModalProps {
  /** The resolved product to add observation to */
  product: ResolvedProduct;
  /** Called when observation is successfully saved */
  onSuccess?: (tags: string[]) => void;
  /** Called when user closes/cancels the modal */
  onClose: () => void;
  /** API base URL (default: /api) */
  apiBaseUrl?: string;
}

/**
 * ObservationsAddModal - Tags-first observation entry
 * 
 * Features:
 * - Uses TagsEditor for tags-first workflow
 * - Shows product info header
 * - Saves via authFetch PATCH /api/products/:productId/observation
 * - No route change (inline modal)
 */
function ObservationsAddModal({ 
  product, 
  onSuccess, 
  onClose,
  apiBaseUrl = '/api' 
}: ObservationsAddModalProps) {
  const [tags, setTags] = useState<string[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle save
  const handleSave = useCallback(async () => {
    const payload = getTagsEditorPayload(tags, images);
    
    if (payload.tags.length === 0) {
      setError('Please add at least one tag');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // LP-observations-consolidation-1.3.0: Use authFetch for PATCH
      const response = await authFetch(`${apiBaseUrl}/products/${product.id}/observation`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          tags: payload.tags,
          images: payload.images,
          source: 'observations-page',
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || `Server error: ${response.status}`);
      }

      // Success - call callback and close
      onSuccess?.(payload.tags);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save observation');
    } finally {
      setIsSubmitting(false);
    }
  }, [product.id, tags, images, apiBaseUrl, onSuccess, onClose]);

  // Handle overlay click (close modal)
  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isSubmitting) {
      onClose();
    }
  }, [isSubmitting, onClose]);

  return (
    <div className="observations-add-modal-overlay" onClick={handleOverlayClick}>
      <div className="observations-add-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="observations-add-modal-header">
          <h3 className="observations-add-modal-title">📋 Add Observation Tags</h3>
          <button 
            className="observations-add-modal-close" 
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>
        
        {/* Product Info */}
        <div className="observations-add-modal-product">
          {product.thumbnailUrl && (
            <img 
              src={product.thumbnailUrl} 
              alt={product.title || product.mpn}
              className="product-thumbnail"
            />
          )}
          <div className="product-info">
            <span className="product-mpn">{product.mpn}</span>
            {product.title && <span className="product-title">{product.title}</span>}
            {product.sku && <span className="product-sku">SKU: {product.sku}</span>}
          </div>
        </div>
        
        {/* Content */}
        <div className="observations-add-modal-content">
          <p className="observations-add-modal-description">
            Add tags to describe features, fit notes, or quality observations for this product.
          </p>
          
          {error && (
            <div className="observations-add-modal-error">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}
          
          <TagsEditor
            initialTags={tags}
            initialImages={images}
            enableImages={true}
            maxTags={20}
            maxImages={5}
            onTagsChange={setTags}
            onImagesChange={setImages}
            disabled={isSubmitting}
            placeholder="e.g., hidden pocket, runs small, premium leather"
            autoFocus={true}
          />
        </div>
        
        {/* Footer */}
        <div className="observations-add-modal-footer">
          <button 
            className="observations-add-modal-btn observations-add-modal-btn-secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            className="observations-add-modal-btn observations-add-modal-btn-primary"
            onClick={handleSave}
            disabled={tags.length === 0 || isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Add Observation'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ObservationsAddModal;
