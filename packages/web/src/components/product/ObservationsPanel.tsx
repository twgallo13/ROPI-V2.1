import { useState, useEffect } from 'react';
import type { Observation, ObservationSeverity } from '../../types/observation';
import { listenToObservations, addObservation, resolveObservation, syncLocalToFirestore } from '../../services/observations';
import { useAuth } from '@/hooks/useAuth';
import { isFirebaseAvailable } from '../../firebaseConfig';
import SignInModal from '@/components/Auth/SignInModal';
import './ObservationsPanel.css';

/**
 * Observations Panel - Product Editor Sidebar
 * 
 * Displays real-time observations from Firestore with add/resolve functionality.
 * Falls back to localStorage when Firebase is unavailable.
 * 
 * Features:
 * - Real-time observation updates via Firestore listener
 * - Image upload with Firebase Storage or data URL fallback
 * - Offline mode banner with sync retry
 * - Scroll-to-field linking with highlight animation
 * - Permission checks for resolve action (creator or admin only)
 * - Auth integration: Sign-in banner when unauthenticated
 * 
 * Auth Integration (PROMPT_018B):
 * - Replace useUser() with useAuth()
 * - Use Firebase Auth user.uid for createdBy field
 * - Compute canResolve: currentUser.uid === observation.createdBy OR isAdmin
 * - Show banner when !currentUser: "Sign in to use live Observations..."
 * - Remove localStorage fallback (always use Firestore)
 * 
 * References:
 * - Workflow W1 — Observations Capture & Apply: https://www.notion.so/2b845ee1ec5a81b5a4a6d3ea439ec277
 * - Observations Overview: https://www.notion.so/2b845ee1ec5a81e1aeeae43318b38039
 * - AOSS_OBSERVATIONS_FIRESTORE_v1.0 Implementation
 * - PROMPT_018B Spec: See HOMER_PROMPT_018B_AUDIT.txt
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
  
  // Form state
  const [newObsTitle, setNewObsTitle] = useState('');
  const [newObsBody, setNewObsBody] = useState('');
  const [newObsSeverity, setNewObsSeverity] = useState<ObservationSeverity>('medium');
  const [newObsLinkedField, setNewObsLinkedField] = useState('');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
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

  const handleSubmit = async () => {
    if (!newObsTitle || !newObsBody || !currentUser) return;

    setIsSubmitting(true);

    try {
      await addObservation({
        productId,
        title: newObsTitle,
        body: newObsBody,
        severity: newObsSeverity,
        linkedField: newObsLinkedField || null,
        createdBy: {
          uid: currentUser.uid,
          name: currentUser.displayName || currentUser.email || 'Anonymous',
        },
      }, imageFiles);

      // Reset form
      setNewObsTitle('');
      setNewObsBody('');
      setNewObsSeverity('medium');
      setNewObsLinkedField('');
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

  const handleScrollToField = (linkedField: string | null | undefined) => {
    if (!linkedField) return;

    // Remove highlight from any previously highlighted elements
    document.querySelectorAll('.field-highlight').forEach((el) => {
      el.classList.remove('field-highlight');
    });

    // Find field by name attribute or label text
    const field = document.querySelector(`[name="${linkedField}"]`) ||
                  document.querySelector(`[data-field="${linkedField}"]`);

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
              
              {obs.linkedField && (
                <button 
                  className="observation-link"
                  onClick={() => handleScrollToField(obs.linkedField)}
                  title="Scroll to linked field"
                >
                  → {obs.linkedField}
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
                <input
                  type="text"
                  className="modal-input"
                  value={newObsLinkedField}
                  onChange={(e) => setNewObsLinkedField(e.target.value)}
                  placeholder="e.g., attributes.color"
                  disabled={isSubmitting}
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
