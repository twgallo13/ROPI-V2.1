/**
 * Product Kick-off Page
 * 
 * Step 2 of product creation: Collect mandatory core attributes
 */

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authFetch } from '../services/authFetch';
import PageLayout from '@/components/common/PageLayout';
import { useAttributeRegistry } from '../hooks/useAttributeRegistry';
import { usePageTitle } from '../hooks/usePageTitle';
import './ProductKickOffPage.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

interface CoreAttributes {
  brand: string;
  name: string; // Product Name
  category: string;
  class: string;
  gender: string;
  age_group: string;
}

function ProductKickOffPage() {
  const { mpn } = useParams<{ mpn: string }>();
  const navigate = useNavigate();
  
  usePageTitle(`Kickoff - ${mpn}`);
  
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
  const { getAttributeById } = useAttributeRegistry();

  if (!mpn) {
    return (
      <PageLayout title="Error">
        <div className="kickoff__error">
          <h2>Invalid Product</h2>
          <p>No MPN provided</p>
        </div>
      </PageLayout>
    );
  }

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
      // Send PATCH request to update attributes using the existing attributes endpoint
      const response = await authFetch(`${API_BASE}/api/products/${mpn}/attributes`, {
        method: 'PATCH',
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
    } catch (err) {
      console.error('Error updating product attributes:', err);
      setError(err instanceof Error ? err.message : 'Failed to update product attributes');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout title={`Product Setup - ${mpn}`}>
      <div className="kickoff">
        <div className="kickoff__header">
          <h1 className="kickoff__title">Product Setup</h1>
          <p className="kickoff__subtitle">
            Set up core information for <strong>{mpn}</strong>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="kickoff__form">
          {/* Product Identification */}
          <div className="kickoff__section">
            <h2 className="kickoff__section-title">Product Identification</h2>
            
            <div className="kickoff__field-group">
              <div className="kickoff__field">
                <label htmlFor="product-name" className="kickoff__label">
                  Product Name *
                </label>
                <input
                  id="product-name"
                  type="text"
                  className="kickoff__input"
                  value={attributes.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter product name"
                  disabled={loading}
                />
              </div>

              <div className="kickoff__field">
                <label htmlFor="brand" className="kickoff__label">
                  Brand *
                </label>
                <input
                  id="brand"
                  type="text"
                  className="kickoff__input"
                  value={attributes.brand}
                  onChange={(e) => handleInputChange('brand', e.target.value)}
                  placeholder="Enter brand name"
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {/* Classification */}
          <div className="kickoff__section">
            <h2 className="kickoff__section-title">Classification</h2>
            
            <div className="kickoff__field-group">
              <div className="kickoff__field">
                <label htmlFor="category" className="kickoff__label">
                  Category *
                </label>
                <select
                  id="category"
                  className="kickoff__input"
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

              <div className="kickoff__field">
                <label htmlFor="class" className="kickoff__label">
                  Class *
                </label>
                <select
                  id="class"
                  className="kickoff__input"
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

              <div className="kickoff__field">
                <label htmlFor="gender" className="kickoff__label">
                  Gender *
                </label>
                <select
                  id="gender"
                  className="kickoff__input"
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

              <div className="kickoff__field">
                <label htmlFor="age-group" className="kickoff__label">
                  Age Group *
                </label>
                <select
                  id="age-group"
                  className="kickoff__input"
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
          <div className="kickoff__section">
            <div className="kickoff__checkbox-field">
              <label className="kickoff__checkbox-label">
                <input
                  type="checkbox"
                  className="kickoff__checkbox"
                  checked={isLaunchProduct}
                  onChange={(e) => setIsLaunchProduct(e.target.checked)}
                  disabled={loading}
                />
                <span className="kickoff__checkbox-text">
                  This is a launch product
                </span>
              </label>
              <p className="kickoff__checkbox-help">
                Launch products require a launch date and at least one image
              </p>
            </div>
          </div>

          {error && (
            <div className="kickoff__error" role="alert">
              {error}
            </div>
          )}

          <div className="kickoff__actions">
            <button
              type="button"
              className="kickoff__button kickoff__button--secondary"
              onClick={() => navigate('/products')}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="kickoff__button kickoff__button--primary"
              disabled={!allFieldsFilled || loading}
            >
              {loading ? (
                <>
                  <svg className="kickoff__spinner" width="16" height="16" viewBox="0 0 24 24">
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
    </PageLayout>
  );
}

export default ProductKickOffPage;