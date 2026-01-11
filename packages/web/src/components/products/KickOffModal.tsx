/**
 * Kick-off Modal Component
 * 
 * Step 2 of product creation: Collect mandatory core attributes
 * Reuses CoreInformationTab logic for consistent field handling
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAttributeRegistry } from '../../hooks/useAttributeRegistry';
import './KickOffModal.css';

interface KickOffModalProps {
  isOpen: boolean;
  onClose: () => void;
  mpn: string; // The MPN of the product being set up
}

interface CoreAttributes {
  brand: string;
  name: string; // Product Name
  category: string;
  class: string;
  gender: string;
  age_group: string;
}

export function KickOffModal({ isOpen, onClose, mpn }: KickOffModalProps) {
  const [attributes, setAttributes] = useState<CoreAttributes>({
    brand: '',
    name: '',
    category: '',
    class: '',
    gender: '',
    age_group: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLaunchProduct, setIsLaunchProduct] = useState(false);
  const navigate = useNavigate();
  const { getAttributeById } = useAttributeRegistry();

  if (!isOpen) return null;

  // Get allowed values from registry for select fields
  const categoryAttr = getAttributeById('category');
  const categoryOptions = categoryAttr?.allowed_values ?? [];
  
  const classAttr = getAttributeById('class');
  const classOptions = classAttr?.allowed_values ?? [];
  
  const genderAttr = getAttributeById('gender');
  const genderOptions = genderAttr?.allowed_values ?? ['Men', 'Women', 'Boys', 'Girls', 'Unisex'];
  
  const ageGroupAttr = getAttributeById('age_group');
  const ageGroupOptions = ageGroupAttr?.allowed_values ?? ['Adult', 'Kids', 'Infant', 'Toddler', 'Youth'];

  // Check if all required fields are filled
  const allFieldsFilled = Object.values(attributes).every(value => value.trim() !== '');

  const handleInputChange = (field: keyof CoreAttributes, value: string) => {
    setAttributes(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!allFieldsFilled) {
      setError('All fields are required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Send PATCH request to update attributes
      const response = await fetch(`/api/products/${mpn}/attributes`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ attributes }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update product attributes');
      }

      // Navigate based on launch product selection
      if (isLaunchProduct) {
        navigate(`/products/${mpn}/launch-setup`);
      } else {
        navigate(`/products/${mpn}`);
      }

      onClose();
    } catch (err) {
      console.error('Error updating product attributes:', err);
      setError(err instanceof Error ? err.message : 'Failed to update product attributes');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setAttributes({
        brand: '',
        name: '',
        category: '',
        class: '',
        gender: '',
        age_group: '',
      });
      setIsLaunchProduct(false);
      setError(null);
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="kickoff-modal" onClick={(e) => e.stopPropagation()}>
        <div className="kickoff-modal__header">
          <h2 className="kickoff-modal__title">Product Setup</h2>
          <p className="kickoff-modal__subtitle">
            Set up core information for <strong>{mpn}</strong>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="kickoff-modal__form">
          {/* Product Identification */}
          <div className="kickoff-modal__section">
            <h3 className="kickoff-modal__section-title">Product Identification</h3>
            
            <div className="kickoff-modal__field">
              <label htmlFor="product-name" className="kickoff-modal__label">
                Product Name *
              </label>
              <input
                id="product-name"
                type="text"
                className="kickoff-modal__input"
                value={attributes.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter product name"
                disabled={loading}
              />
            </div>

            <div className="kickoff-modal__field">
              <label htmlFor="brand" className="kickoff-modal__label">
                Brand *
              </label>
              <input
                id="brand"
                type="text"
                className="kickoff-modal__input"
                value={attributes.brand}
                onChange={(e) => handleInputChange('brand', e.target.value)}
                placeholder="Enter brand name"
                disabled={loading}
              />
            </div>
          </div>

          {/* Classification */}
          <div className="kickoff-modal__section">
            <h3 className="kickoff-modal__section-title">Classification</h3>
            
            <div className="kickoff-modal__field-row">
              <div className="kickoff-modal__field">
                <label htmlFor="category" className="kickoff-modal__label">
                  Category *
                </label>
                <select
                  id="category"
                  className="kickoff-modal__input"
                  value={attributes.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  disabled={loading}
                >
                  <option value="">Select Category...</option>
                  {categoryOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              <div className="kickoff-modal__field">
                <label htmlFor="class" className="kickoff-modal__label">
                  Class *
                </label>
                <select
                  id="class"
                  className="kickoff-modal__input"
                  value={attributes.class}
                  onChange={(e) => handleInputChange('class', e.target.value)}
                  disabled={loading}
                >
                  <option value="">Select Class...</option>
                  {classOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="kickoff-modal__field-row">
              <div className="kickoff-modal__field">
                <label htmlFor="gender" className="kickoff-modal__label">
                  Gender *
                </label>
                <select
                  id="gender"
                  className="kickoff-modal__input"
                  value={attributes.gender}
                  onChange={(e) => handleInputChange('gender', e.target.value)}
                  disabled={loading}
                >
                  <option value="">Select Gender...</option>
                  {genderOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              <div className="kickoff-modal__field">
                <label htmlFor="age-group" className="kickoff-modal__label">
                  Age Group *
                </label>
                <select
                  id="age-group"
                  className="kickoff-modal__input"
                  value={attributes.age_group}
                  onChange={(e) => handleInputChange('age_group', e.target.value)}
                  disabled={loading}
                >
                  <option value="">Select Age Group...</option>
                  {ageGroupOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Launch Product Toggle */}
          <div className="kickoff-modal__section">
            <div className="kickoff-modal__checkbox-field">
              <label className="kickoff-modal__checkbox-label">
                <input
                  type="checkbox"
                  className="kickoff-modal__checkbox"
                  checked={isLaunchProduct}
                  onChange={(e) => setIsLaunchProduct(e.target.checked)}
                  disabled={loading}
                />
                <span className="kickoff-modal__checkbox-text">
                  This is a launch product
                </span>
              </label>
              <p className="kickoff-modal__checkbox-help">
                Launch products require a launch date and at least one image
              </p>
            </div>
          </div>

          {error && (
            <div className="kickoff-modal__error" role="alert">
              {error}
            </div>
          )}

          <div className="kickoff-modal__actions">
            <button
              type="button"
              className="kickoff-modal__button kickoff-modal__button--secondary"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="kickoff-modal__button kickoff-modal__button--primary"
              disabled={!allFieldsFilled || loading}
            >
              {loading ? (
                <>
                  <svg className="kickoff-modal__spinner" width="16" height="16" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25"/>
                    <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor"/>
                  </svg>
                  Saving...
                </>
              ) : (
                'Continue'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}