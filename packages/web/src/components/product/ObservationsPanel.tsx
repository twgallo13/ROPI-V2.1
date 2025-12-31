import { useState, useEffect, useCallback } from 'react';
import type { Observation } from '../../types/observation';
import { listenToObservations, resolveObservation, syncLocalToFirestore } from '../../services/observations';
import { useAuth } from '@/hooks/useAuth';
import { isFirebaseAvailable } from '../../firebaseConfig';
import SignInModal from '@/components/Auth/SignInModal';
import { fieldLinkToDisplayString, legacyLinkedFieldToFieldLink } from '../../utils/normalizeFieldLink';
import './ObservationsPanel.css';

/**
 * Observations Panel - Product Editor Sidebar
 * 
 * LP-obs-studio-cleanup-1.6.6: Simplified tags-only observation model.
 * Displays existing observations and allows adding product-level tags.
 * 
 * Features:
 * - Real-time observation updates via Firestore listener
 * - Simplified tags-only add modal (no title/description/severity/linkedField)
 * - Product-level observation stored on product.observation
 * - Offline mode banner with sync retry
 * - Permission checks for resolve action
 * 
 * References:
 * - Workflow W1 — Observations Capture & Apply: https://www.notion.so/2b845ee1ec5a81b5a4a6d3ea439ec277
 * - LP-obs-studio-cleanup-1.6.6: Collapse observations into product-level
 */

interface ObservationsPanelProps {
  productId: string;
}

function ObservationsPanel({ productId }: ObservationsPanelProps) {
  const { currentUser, isAdmin, loading: authLoading } = useAuth();
  const [observations, setObservations] = useState<Observation[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [isOffline, setIsOffline] = useState(!isFirebaseAvailable());
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // LP-obs-studio-cleanup-1.6.6: Simplified tags-only form state
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [, setImageFiles] = useState<File[]>([]); // Keep for handleImageUpload
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  const openObservations = observations.filter(obs => obs.status === 'open');

  // Set up real-time listener for observations
  useEffect(() => {
    if (!productId) return;

    const unsubscribe = listenToObservations(productId, (updatedObservations) => {
      setObservations(updatedObservations);
      setIsOffline(!isFirebaseAvailable());
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [productId]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setImageFiles(files);

    // Generate previews
    const previews: string[] = [];
    let processed = 0;

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        previews.push(reader.result as string);
        processed++;
        if (processed === files.length) {
          setImagePreviews(previews);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // LP-obs-studio-cleanup-1.6.6: Tag input handlers
  const handleTagInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const newTag = tagInput.trim().toLowerCase();
      if (newTag && !tags.includes(newTag)) {
        setTags(prev => [...prev, newTag]);
      }
      setTagInput('');
    } else if (e.key === 'Backspace' && tagInput === '' && tags.length > 0) {
      setTags(prev => prev.slice(0, -1));
    }
  }, [tagInput, tags]);

  const handleRemoveTag = useCallback((tagToRemove: string) => {
    setTags(prev => prev.filter(t => t !== tagToRemove));
  }, []);

  // LP-obs-studio-cleanup-1.6.6: Simplified submit - uses product observation endpoint
  const handleSubmit = async () => {
    if (tags.length === 0 || !currentUser) return;

    setIsSubmitting(true);

    try {
      // Call the new product observation endpoint
      const response = await fetch(`/api/products/${productId}/observation`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          tags,
          images: imagePreviews, // Use data URLs for now, could upload to storage
          source: 'desktop',
          action: 'add',
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || `Server error: ${response.status}`);
      }

      // Reset form
      setTags([]);
      setTagInput('');
      setImageFiles([]);
      setImagePreviews([]);
      setShowModal(false);
    } catch (error) {
      console.error('Failed to add observation:', error);
      alert('Failed to add observation. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResolve = async (obsId: string) => {
    if (!currentUser) {
      setShowSignInModal(true);
      return;
    }

    try {
      await resolveObservation(obsId, productId, {
        uid: currentUser.uid,
        name: currentUser.displayName || currentUser.email || 'Anonymous',
      });
    } catch (error) {
      console.error('Failed to resolve observation:', error);
      alert('Failed to resolve observation. Please try again.');
    }
  };

  // Check if current user can resolve an observation
  const canResolve = (observation: Observation): boolean => {
    if (!currentUser) return false;
    return observation.createdBy.uid === currentUser.uid || isAdmin;
  };

  const handleRetrySync = async () => {
    setIsSyncing(true);
    try {
      const result = await syncLocalToFirestore(productId);
      if (result.success > 0) {
        alert(`Successfully synced ${result.success} observations`);
        setIsOffline(!isFirebaseAvailable());
      } else if (result.failed > 0) {
        alert(`Failed to sync ${result.failed} observations. Check console for details.`);
      } else {
        alert('No observations to sync');
      }
    } catch (error) {
      console.error('Sync failed:', error);
      alert('Failed to sync observations. Please try again.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleScrollToField = (observation: Observation) => {
    // Get the field key from either fieldLink (preferred) or legacy linkedField
    let fieldKey: string | null = null;
    
    if (observation.fieldLink) {
      fieldKey = observation.fieldLink.key;
    } else if (observation.linkedField) {
      // Convert legacy linkedField to fieldLink for consistency
      const converted = legacyLinkedFieldToFieldLink(observation.linkedField);
      fieldKey = converted?.key || observation.linkedField;
    }
    
    if (!fieldKey) return;

    // Remove highlight from any previously highlighted elements
    document.querySelectorAll('.field-highlight').forEach((el) => {
      el.classList.remove('field-highlight');
    });

    // Find field by data-field attribute (preferred) or name attribute
    const field = document.querySelector(`[data-field="${fieldKey}"]`) ||
                  document.querySelector(`[name="${fieldKey}"]`);

    if (field) {
      field.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Add highlight animation
      const parent = field.closest('.form-field') || field.parentElement;
      if (parent) {
        parent.classList.add('field-highlight');
        setTimeout(() => parent.classList.remove('field-highlight'), 2000);
      }
    }
  };

  return (
    <div className="product-panel">
      <div className="product-panel-header">
        <h4 className="product-panel-title">Observations</h4>
        <span className="product-panel-badge">{openObservations.length}</span>
      </div>
      
      {/* Auth banner when not signed in */}
      {!authLoading && !currentUser && (
        <div className="auth-banner">
          <span className="auth-banner-icon">🔒</span>
          <div className="auth-banner-content">
            <div className="auth-banner-title">Sign in to use live Observations</div>
            <div className="auth-banner-subtitle">Data is view-only until authenticated</div>
          </div>
          <button 
            className="auth-banner-button" 
            onClick={() => setShowSignInModal(true)}
          >
            Sign In
          </button>
        </div>
      )}
      
      {isOffline && (
        <div className="offline-banner">
          <span className="offline-icon">⚠️</span>
          <span className="offline-text">Offline Mode - Changes saved locally</span>
          <button 
            className="offline-sync-button" 
            onClick={handleRetrySync}
            disabled={isSyncing}
          >
            {isSyncing ? 'Syncing...' : 'Retry Sync'}
          </button>
        </div>
      )}
      
      <div className="product-panel-content">
        {openObservations.length === 0 ? (
          <p className="panel-empty">No open observations</p>
        ) : (
          openObservations.map((obs) => (
            <div key={obs.id} className="observation-item">
              <div className="observation-header">
                <span className={`observation-severity severity-${obs.severity}`}>
                  {obs.severity}
                </span>
                {currentUser && canResolve(obs) && (
                  <button
                    className="observation-resolve"
                    onClick={() => handleResolve(obs.id)}
                    title={
                      isAdmin 
                        ? `Resolve observation (Admin access)` 
                        : `Resolve observation (created by you)`
                    }
                    disabled={isSubmitting}
                  >
                    ✓
                  </button>
                )}
              </div>
              
              {obs.images && obs.images.length > 0 && (
                <div className="observation-images">
                  {obs.images.map((imgUrl, idx) => (
                    <img 
                      key={idx} 
                      src={imgUrl} 
                      alt={`${obs.title} - image ${idx + 1}`} 
                      className="observation-image"
                      onClick={() => window.open(imgUrl, '_blank')}
                      style={{ cursor: 'pointer' }}
                    />
                  ))}
                </div>
              )}
              
              <h5 className="observation-title">{obs.title}</h5>
              <p className="observation-description">{obs.body}</p>
              
              {(obs.fieldLink || obs.linkedField) && (
                <button 
                  className="observation-link"
                  onClick={() => handleScrollToField(obs)}
                  title="Scroll to linked field"
                >
                  → {obs.fieldLink ? fieldLinkToDisplayString(obs.fieldLink) : obs.linkedField}
                </button>
              )}
              
              <div className="observation-time">
                {formatTime(obs.createdAt)} by {obs.createdBy.name}
              </div>
            </div>
          ))
        )}
        
        <button 
          className="panel-add-button" 
          onClick={() => currentUser ? setShowModal(true) : setShowSignInModal(true)}
          disabled={authLoading}
        >
          + Add Observation
        </button>
      </div>

      {/* Sign-In Modal */}
      <SignInModal
        isOpen={showSignInModal}
        onClose={() => setShowSignInModal(false)}
      />

      {/* LP-obs-studio-cleanup-1.6.6: Simplified tags-only modal */}
      {showModal && currentUser && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Add Observation Tags</h3>
              <button className="modal-close" onClick={() => setShowModal(false)} disabled={isSubmitting}>
                ×
              </button>
            </div>
            
            <div className="modal-content">
              <div className="modal-field">
                <label className="modal-label">Tags *</label>
                <div className="tags-input-container" style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', minHeight: '42px' }}>
                  {tags.map((tag) => (
                    <span key={tag} className="tag-chip" style={{ display: 'inline-flex', alignItems: 'center', background: '#e0e0e0', borderRadius: '16px', padding: '4px 8px', fontSize: '14px' }}>
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        style={{ marginLeft: '4px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}
                        aria-label={`Remove tag ${tag}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    className="tag-input"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagInputKeyDown}
                    placeholder={tags.length === 0 ? "e.g., hidden pocket, runs small" : "Add another tag..."}
                    disabled={isSubmitting}
                    style={{ flex: 1, minWidth: '150px', border: 'none', outline: 'none', padding: '4px' }}
                  />
                </div>
                <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                  Press Enter or comma to add a tag
                </p>
              </div>
              
              <div className="modal-field">
                <label className="modal-label">Images (optional)</label>
                {imagePreviews.length > 0 && (
                  <div className="modal-image-previews">
                    {imagePreviews.map((preview, idx) => (
                      <img key={idx} src={preview} alt={`Preview ${idx + 1}`} className="modal-image-preview" />
                    ))}
                  </div>
                )}
                <label className="modal-upload-button">
                  {imagePreviews.length > 0 ? 'Change Images' : 'Upload Images'}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    style={{ display: 'none' }}
                    disabled={isSubmitting}
                  />
                </label>
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                className="modal-button modal-button-secondary" 
                onClick={() => setShowModal(false)}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                className="modal-button modal-button-primary"
                onClick={handleSubmit}
                disabled={tags.length === 0 || isSubmitting}
              >
                {isSubmitting ? 'Adding...' : 'Add Observation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString();
}

export default ObservationsPanel;
