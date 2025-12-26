import type { Product } from '../../types/product';
import { useAttributeRegistry } from '../../hooks/useAttributeRegistry';
import './CoreInformationTab.css';

/**
 * Core Information Tab — LP-0.4.4
 * 
 * Tab 1: Core product identification and classification
 * Fields: name, brand, department, class, category, gender, age_group, website (multi-select)
 * 
 * LP-0.4.4: Added gender and age_group (moved from Tab 2)
 * NOTE: sku and styleId have been moved to Tab 4 (Technical)
 * 
 * References:
 * - Product Completion Workflows (W2): https://www.notion.so/2ba45ee1ec5a80698690f9492961ed8b
 * - Section 1 — Navigation & Page Index: https://www.notion.so/eba3cfdc44fd49ef98c38b183642cc7b
 */

interface CoreInformationTabProps {
  product: Product;
  onUpdate: (path: string, value: unknown) => void;
}

/**
 * Website options from registry - drives site-specific logic
 */
const WEBSITE_OPTIONS = [
  'shiekh.com',
  'Karmaloop.com',
  'mltd.com',
  'sangremia.com',
  'plndr.com',
  'fbrkclothing.com',
  'Vnds.com',
  'Kazbah.com',
  'Tiltedsole.com',
  'NOT FOR WEB',
];

function CoreInformationTab({ product, onUpdate }: CoreInformationTabProps) {
  const { getAttributeById } = useAttributeRegistry();
  
  // Get allowed values from registry for select fields
  const departmentAttr = getAttributeById('department');
  const departmentOptions = departmentAttr?.allowed_values ?? [];
  
  const classAttr = getAttributeById('class');
  const classOptions = classAttr?.allowed_values ?? [];
  
  const categoryAttr = getAttributeById('category');
  const categoryOptions = categoryAttr?.allowed_values ?? [];
  
  // LP-0.4.4: Added gender and age_group (moved from Tab 2)
  const genderAttr = getAttributeById('gender');
  const genderOptions = genderAttr?.allowed_values ?? ['Men', 'Women', 'Boys', 'Girls', 'Unisex'];
  
  const ageGroupAttr = getAttributeById('age_group');
  const ageGroupOptions = ageGroupAttr?.allowed_values ?? ['Adult', 'Kids', 'Infant', 'Toddler', 'Youth'];
  
  const websiteAttr = getAttributeById('website');
  const websiteOptions = websiteAttr?.allowed_values ?? WEBSITE_OPTIONS;

  return (
    <div className="editor-tab-content">
      <div className="form-section">
        <h3 className="form-section-title">Product Identification</h3>
        <div className="form-grid">
          <div className="form-field form-field-full">
            <label className="form-label">
              Product Name <span className="required">*</span>
            </label>
            <input
              type="text"
              className="form-input"
              value={product.name || ''}
              onChange={(e) => onUpdate('name', e.target.value)}
              data-field="product.name"
              name="product.name"
              placeholder="Enter product name"
            />
          </div>
          
          <div className="form-field">
            <label className="form-label">
              Brand <span className="required">*</span>
            </label>
            <input
              type="text"
              className="form-input"
              value={product.brand || ''}
              onChange={(e) => onUpdate('brand', e.target.value)}
              data-field="product.brand"
              name="product.brand"
              placeholder="Enter brand name"
            />
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3 className="form-section-title">Classification</h3>
        <div className="form-grid">
          <div className="form-field">
            <label className="form-label">
              Department <span className="required">*</span>
            </label>
            <select
              className="form-input"
              value={product.department || ''}
              onChange={(e) => onUpdate('department', e.target.value)}
              data-field="product.department"
              name="product.department"
            >
              <option value="">Select Department...</option>
              {departmentOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
          
          <div className="form-field">
            <label className="form-label">
              Class <span className="required">*</span>
            </label>
            <select
              className="form-input"
              value={product.class || ''}
              onChange={(e) => onUpdate('class', e.target.value)}
              data-field="product.class"
              name="product.class"
            >
              <option value="">Select Class...</option>
              {classOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
          
          <div className="form-field">
            <label className="form-label">
              Category <span className="required">*</span>
            </label>
            <select
              className="form-input"
              value={product.category || ''}
              onChange={(e) => onUpdate('category', e.target.value)}
              data-field="product.category"
              name="product.category"
            >
              <option value="">Select Category...</option>
              {categoryOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
          
          {/* LP-0.4.4: Added gender and age_group (moved from Tab 2) */}
          <div className="form-field">
            <label className="form-label">
              Gender <span className="required">*</span>
            </label>
            <select
              className="form-input"
              value={(product as unknown as Record<string, unknown>).gender as string || product.attributes?.gender as string || ''}
              onChange={(e) => onUpdate('attributes.gender', e.target.value)}
              data-field="product.gender"
              name="product.gender"
            >
              <option value="">Select Gender...</option>
              {genderOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
          
          <div className="form-field">
            <label className="form-label">
              Age Group <span className="required">*</span>
            </label>
            <select
              className="form-input"
              value={(product as unknown as Record<string, unknown>).age_group as string || product.attributes?.age_group as string || ''}
              onChange={(e) => onUpdate('attributes.age_group', e.target.value)}
              data-field="product.age_group"
              name="product.age_group"
            >
              <option value="">Select Age Group...</option>
              {ageGroupOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3 className="form-section-title">Website Assignment</h3>
        <p className="form-section-description">
          Select websites where this product will be available. This drives site-specific descriptions and AI logic.
        </p>
        <div className="form-field">
          <label className="form-label">
            Active Websites <span className="required">*</span>
          </label>
          <div className="checkbox-group" data-field="product.websites" data-testid="product-websites">
            {websiteOptions.map(website => (
              <label key={website} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={(product.websites ?? []).includes(website)}
                  onChange={(e) => {
                    const currentWebsites = product.websites ?? [];
                    const updated = e.target.checked
                      ? [...currentWebsites, website]
                      : currentWebsites.filter(w => w !== website);
                    onUpdate('websites', updated);
                  }}
                  name={`product.websites.${website}`}
                />
                {website}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="form-note">
        <p>
          <strong>Note:</strong> Fields marked with <span className="required">*</span> are required 
          for export readiness. SKU and Style ID have been moved to the Identifiers tab.
        </p>
      </div>
    </div>
  );
}

export default CoreInformationTab;
