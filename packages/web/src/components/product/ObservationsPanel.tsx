import { useState, useEffect } from 'react';
import type { Observation, ObservationSeverity } from '../../types/observation';
import type { FieldLink } from '../../types/fieldLink';
import { listenToObservations, resolveObservation } from '../../services/observations';
import { useObservationsSync } from '../../hooks/useObservationsSync';
import { useAuth } from '@/hooks/useAuth';
import SignInModal from '@/components/Auth/SignInModal';
import FieldPicker from './FieldPicker';
import { fieldLinkToDisplayString, legacyLinkedFieldToFieldLink } from '../../utils/normalizeFieldLink';
import './ObservationsPanel.css';

/**
 * Observations Panel - Product Editor Sidebar
 * 
 * LP-1.1.11: Unified with mobile capture flow via useObservationsSync hook.
 * Uses same IndexedDB offline queue and API sync as MobileObservationCapture.
 * 
 * Features:
 * - Real-time observation updates via Firestore listener (read)
 * - Offline-first creation via IndexedDB queue (write)
 * - Image upload with Firebase Storage or data URL fallback
 * - Offline mode banner with sync retry
 * - Scroll-to-field linking with highlight animation
 * - Permission checks for resolve action (creator or admin only)
 * - Auth integration: Sign-in banner when unauthenticated
 * 
 * References:
 * - Workflow W1 — Observations Capture & Apply: https://www.notion.so/2b845ee1ec5a81b5a4a6d3ea439ec277
 * - Observations Overview: https://www.notion.so/2b845ee1ec5a81e1aeeae43318b38039
 * - LP-1.1.11 Unify observations code path
 */

interface ObservationsPanelProps {
  productId: string;
  productMpn?: string; // LP-1.1.11: Optional MPN for observations queue
}

function ObservationsPanel({ productId, productMpn }: ObservationsPanelProps) {
  const { currentUser, isAdmin, loading: authLoading } = useAuth();
  
  // LP-1.1.11: Use unified observations sync hook (same as mobile capture)
  const { pendingCount, isOnline, isSyncing, addObservation: queueObservation, syncNow } = useObservationsSync();
  
  const [observations, setObservations] = useState<Observation[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [newObsTitle, setNewObsTitle] = useState('');
  const [newObsBody, setNewObsBody] = useState('');
  const [newObsSeverity, setNewObsSeverity] = useState<ObservationSeverity>('medium');
  const [newObsFieldLink, setNewObsFieldLink] = useState<FieldLink | null>(null);
  const [_imageFiles, setImageFiles] = useState<File[]>([]); // Kept for handleImageUpload
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  const openObservations = observations.filter(obs => obs.status === 'open');

  // Set up real-time listener for observations (read path unchanged)
  useEffect(() => {
    if (!productId) return;

    const unsubscribe = listenToObservations(productId, (updatedObservations) => {
      setObservations(updatedObservations);
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

  const handleSubmit = async () => {
    if (!newObsTitle || !newObsBody || !currentUser) return;

    setIsSubmitting(true);

    try {
      // LP-1.1.11: Use unified queue (same as mobile capture)
      // Convert image previews to URLs for queue storage
      const imageUrls = imagePreviews.length > 0 ? imagePreviews : [];
      
      await queueObservation({
        product_mpn: productMpn || productId, // Use MPN if available, fallback to productId
        text: newObsTitle, // Map title -> text (unified schema)
        description: newObsBody, // Map body -> description
        severity: newObsSeverity,
        images: imageUrls,
        fieldLink: newObsFieldLink ? {
          type: newObsFieldLink.type,
          fieldPath: newObsFieldLink.key,
          displayName: newObsFieldLink.key.split('.').pop() || newObsFieldLink.key,
        } : undefined,
        source: 'product_editor',
      });

      // Reset form
      setNewObsTitle('');
      setNewObsBody('');
      setNewObsSeverity('medium');
      setNewObsFieldLink(null);
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

  // LP-1.1.11: Use syncNow from unified hook
  const handleRetrySync = async () => {
    try {
      const result = await syncNow();
      if (result.synced > 0) {
        alert(`Successfully synced ${result.synced} observations`);
      } else if (result.failed > 0) {
        alert(`Failed to sync ${result.failed} observations. Check console for details.`);
      } else {
        alert('No observations to sync');
      }
    } catch (error) {
      console.error('Sync failed:', error);
      alert('Failed to sync observations. Please try again.');
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
      
      {/* LP-1.1.11: Show offline banner or pending count */}
      {(!isOnline || pendingCount > 0) && (
        <div className="offline-banner">
          <span className="offline-icon">{isOnline ? '📤' : '⚠️'}</span>
          <span className="offline-text">
            {!isOnline 
              ? 'Offline Mode - Changes saved locally'
              : `${pendingCount} observation${pendingCount !== 1 ? 's' : ''} pending sync`
            }
          </span>
          <button 
            className="offline-sync-button" 
            onClick={handleRetrySync}
            disabled={isSyncing || !isOnline}
          >
            {isSyncing ? 'Syncing...' : 'Sync Now'}
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

      {showModal && currentUser && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Add Observation</h3>
              <button className="modal-close" onClick={() => setShowModal(false)} disabled={isSubmitting}>
                ×
              </button>
            </div>
            
            <div className="modal-content">
              <div className="modal-field">
                <label className="modal-label">Title *</label>
                <input
                  type="text"
                  className="modal-input"
                  value={newObsTitle}
                  onChange={(e) => setNewObsTitle(e.target.value)}
                  placeholder="Brief observation title"
                  disabled={isSubmitting}
                />
              </div>
              
              <div className="modal-field">
                <label className="modal-label">Description *</label>
                <textarea
                  className="modal-textarea"
                  rows={4}
                  value={newObsBody}
                  onChange={(e) => setNewObsBody(e.target.value)}
                  placeholder="Detailed observation description"
                  disabled={isSubmitting}
                />
              </div>
              
              <div className="modal-field">
                <label className="modal-label">Severity</label>
                <select
                  className="modal-input"
                  value={newObsSeverity}
                  onChange={(e) => setNewObsSeverity(e.target.value as ObservationSeverity)}
                  disabled={isSubmitting}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              
              <div className="modal-field">
                <label className="modal-label">Linked Field (optional)</label>
                <FieldPicker
                  value={newObsFieldLink}
                  onChange={setNewObsFieldLink}
                  disabled={isSubmitting}
                  placeholder="Select or type a field..."
                />
              </div>
              
              <div className="modal-field">
                <label className="modal-label">Images (optional, multiple allowed)</label>
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
                disabled={!newObsTitle || !newObsBody || isSubmitting}
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
