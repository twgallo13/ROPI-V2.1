import { useState } from 'react';
import type { Observation, NewObservation, ObservationSeverity } from '../../types/product';
import './ObservationsPanel.css';

/**
 * Observations Panel
 * 
 * Display and manage product observations with add/resolve functionality
 * 
 * TODO: Wire to Firestore observations collection
 * References:
 * - Workflow W1 — Observations Capture & Apply: https://www.notion.so/2b845ee1ec5a81b5a4a6d3ea439ec277
 * - Observations Overview: https://www.notion.so/2b845ee1ec5a81e1aeeae43318b38039
 */

interface ObservationsPanelProps {
  observations: Observation[];
  onAddObservation: (obs: NewObservation) => void;
  onResolveObservation: (id: string) => void;
}

function ObservationsPanel({ observations, onAddObservation, onResolveObservation }: ObservationsPanelProps) {
  const [showModal, setShowModal] = useState(false);
  const [newObs, setNewObs] = useState<NewObservation>({
    title: '',
    description: '',
    severity: 'medium',
  });
  const [imagePreview, setImagePreview] = useState<string>('');

  const openObservations = observations.filter(obs => obs.status === 'open');

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        setImagePreview(dataUrl);
        setNewObs({ ...newObs, imageUrl: dataUrl });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = () => {
    if (newObs.title && newObs.description) {
      onAddObservation(newObs);
      setNewObs({ title: '', description: '', severity: 'medium' });
      setImagePreview('');
      setShowModal(false);
    }
  };

  return (
    <div className="product-panel">
      <div className="product-panel-header">
        <h4 className="product-panel-title">Observations</h4>
        <span className="product-panel-badge">{openObservations.length}</span>
      </div>
      
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
                <button
                  className="observation-resolve"
                  onClick={() => onResolveObservation(obs.id)}
                  title="Mark as resolved"
                >
                  ✓
                </button>
              </div>
              
              {obs.imageUrl && (
                <img src={obs.imageUrl} alt={obs.title} className="observation-image" />
              )}
              
              <h5 className="observation-title">{obs.title}</h5>
              <p className="observation-description">{obs.description}</p>
              
              {obs.linkedField && (
                <div className="observation-link">
                  → {obs.linkedField}
                </div>
              )}
              
              <div className="observation-time">
                {formatTime(obs.timestamp)}
              </div>
            </div>
          ))
        )}
        
        <button className="panel-add-button" onClick={() => setShowModal(true)}>
          + Add Observation
        </button>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Add Observation</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                ×
              </button>
            </div>
            
            <div className="modal-content">
              <div className="modal-field">
                <label className="modal-label">Title *</label>
                <input
                  type="text"
                  className="modal-input"
                  value={newObs.title}
                  onChange={(e) => setNewObs({ ...newObs, title: e.target.value })}
                  placeholder="Brief observation title"
                />
              </div>
              
              <div className="modal-field">
                <label className="modal-label">Description *</label>
                <textarea
                  className="modal-textarea"
                  rows={4}
                  value={newObs.description}
                  onChange={(e) => setNewObs({ ...newObs, description: e.target.value })}
                  placeholder="Detailed observation description"
                />
              </div>
              
              <div className="modal-field">
                <label className="modal-label">Severity</label>
                <select
                  className="modal-input"
                  value={newObs.severity}
                  onChange={(e) => setNewObs({ ...newObs, severity: e.target.value as ObservationSeverity })}
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
                  value={newObs.linkedField || ''}
                  onChange={(e) => setNewObs({ ...newObs, linkedField: e.target.value })}
                  placeholder="e.g., attributes.color"
                />
              </div>
              
              <div className="modal-field">
                <label className="modal-label">Image (optional)</label>
                {imagePreview && (
                  <img src={imagePreview} alt="Preview" className="modal-image-preview" />
                )}
                <label className="modal-upload-button">
                  {imagePreview ? 'Change Image' : 'Upload Image'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
            </div>
            
            <div className="modal-footer">
              <button className="modal-button modal-button-secondary" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button
                className="modal-button modal-button-primary"
                onClick={handleSubmit}
                disabled={!newObs.title || !newObs.description}
              >
                Add Observation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString();
}

export default ObservationsPanel;
